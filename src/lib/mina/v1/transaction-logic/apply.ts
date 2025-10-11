/**
 * Apply transactions to a ledger of accounts.
 */
import { type AccountUpdate, Actions } from '../account-update.js';
import { Account } from '../account.js';
import { Int64, Sign, UInt32, UInt64 } from '../../../provable/int.js';
import { Field, Bool } from '../../../provable/wrapped.js';
import { checkPreconditions } from './preconditions.js';
import { hashWithPrefix, packToFields, emptyReceiptChainHash } from '../../../provable/crypto/poseidon.js';

export { applyAccountUpdate, AccountUpdateContext };

type AccountUpdateContext = {
  /**
   * The full transaction commitment including memo and fee payer hash.
   * Used to compute the receipt chain hash.
   */
  transactionCommitment: Field;

  /**
   * The index of this account update in the transaction's account update list.
   * Used to compute the receipt chain hash.
   */
  accountUpdateIndex: number;
};

/**
 * Ensures that an account has a zkApp field initialized.
 * If zkApp doesn't exist, creates it with default values.
 */
function ensureZkapp(account: Account): void {
  if (!account.zkapp) {
    account.zkapp = {
      appState: Array(8).fill(Field(0)),
      verificationKey: undefined,
      zkappVersion: UInt32.zero,
      actionState: Array(5).fill(Field(0)),
      lastActionSlot: UInt32.zero,
      provedState: Bool(false),
      zkappUri: '',
    };
  }
}

/**
 * Apply a single account update to update an account.
 *
 * @param account - The account to update
 * @param update - The account update to apply
 * @param context - Optional context containing transaction commitment and index for receipt chain hash
 * @returns The updated account
 */
function applyAccountUpdate(account: Account, update: AccountUpdate, context?: AccountUpdateContext): Account {
  account.publicKey.assertEquals(update.publicKey);
  account.tokenId.assertEquals(update.tokenId, 'token id mismatch');
  checkPreconditions(account, update);

  // clone account (TODO: do this efficiently)
  let json = Account.toJSON(account);
  account = Account.fromJSON(json);

  // apply balance change
  const balanceChange = update.body.balanceChange;
  if (balanceChange.magnitude.greaterThan(UInt64.zero).toBoolean()) {
    const balanceSigned = Int64.create(account.balance, Sign.one);

    // add the balance change
    const newBalanceSigned = balanceSigned.add(balanceChange);

    // check if result is negative
    if (newBalanceSigned.isNegative().toBoolean()) {
      throw new Error(`Insufficient balance: cannot apply balance change of ${balanceChange.toString()} to balance of ${account.balance.toString()}`);
    }

    // update account balance
    account.balance = newBalanceSigned.magnitude;
  }

  // apply nonce increment
  if (update.body.incrementNonce.toBoolean()) {
    account.nonce = account.nonce.add(UInt32.one);
  }

  // update permissions
  if (update.update.permissions.isSome.toBoolean()) {
    account.permissions = update.update.permissions.value;
  }

  // update delegate
  if (update.update.delegate.isSome.toBoolean()) {
    account.delegate = update.update.delegate.value;
  }

  // update votingFor
  if (update.update.votingFor.isSome.toBoolean()) {
    account.votingFor = update.update.votingFor.value;
  }

  // update timing
  if (update.update.timing.isSome.toBoolean()) {
    const timingValue = update.update.timing.value;
    account.timing = {
      isTimed: Bool(true),
      initialMinimumBalance: timingValue.initialMinimumBalance,
      cliffTime: timingValue.cliffTime,
      cliffAmount: timingValue.cliffAmount,
      vestingPeriod: timingValue.vestingPeriod,
      vestingIncrement: timingValue.vestingIncrement,
    };
  }

  // update tokenSymbol
  if (update.update.tokenSymbol.isSome.toBoolean()) {
    account.tokenSymbol = update.update.tokenSymbol.value.symbol;
  }

  // update appState (zkapp state)
  const hasAppStateUpdate = update.update.appState.some((field) => field.isSome.toBoolean());

  if (hasAppStateUpdate) {
    ensureZkapp(account);

    // update each appState field individually
    const newAppState = update.update.appState.map((fieldUpdate, i) => {
      if (fieldUpdate.isSome.toBoolean()) {
        return fieldUpdate.value;
      } else {
        return account.zkapp!.appState[i] ?? Field(0);
      }
    });

    account.zkapp!.appState = newAppState;
  }

  // update verificationKey (if zkapp exists or being created)
  if (update.update.verificationKey.isSome.toBoolean()) {
    ensureZkapp(account);
    account.zkapp!.verificationKey = update.update.verificationKey.value;
  }

  // update zkappUri (if zkapp exists or being created)
  if (update.update.zkappUri.isSome.toBoolean()) {
    ensureZkapp(account);
    // Extract the URI string from the update object
    account.zkapp!.zkappUri = update.update.zkappUri.value.data;
  }

  // update action state (if actions are being dispatched)
  if (update.body.actions.data.length > 0) {
    ensureZkapp(account);

    // get current action state (or empty if new zkapp)
    const currentActionState =
      account.zkapp!.actionState && account.zkapp!.actionState.length > 0
        ? account.zkapp!.actionState[account.zkapp!.actionState.length - 1]
        : Actions.emptyActionState();

    // update action state with new actions
    const newActionState = Actions.updateSequenceState(
      currentActionState,
      update.body.actions.hash
    );

    // append to action state history (keep last 5)
    const actionStateHistory = account.zkapp!.actionState || [];
    actionStateHistory.push(newActionState);
    if (actionStateHistory.length > 5) {
      actionStateHistory.shift(); // Remove oldest
    }
    account.zkapp!.actionState = actionStateHistory;
  }

  // update receipt chain hash (if context provided and update is authorized)
  if (context !== undefined) {
    // check if the account update has valid authorization (signature or proof)
    const hasSignature = update.authorization !== undefined &&
                        typeof update.authorization === 'object' &&
                        'signature' in update.authorization;
    const hasProof = update.authorization !== undefined &&
                    typeof update.authorization === 'object' &&
                    'proof' in update.authorization;

    if (hasSignature || hasProof) {
      // receipt.ml (lines 64-74):
      // Input.Chunked.(append index_input (append x (field t)))
      // |> pack_input
      // |> hash ~init:Hash_prefix.receipt_chain_zkapp_command
      const oldReceiptChainHash = account.receiptChainHash ?? emptyReceiptChainHash();

      // convert index to UInt32 and get its HashInput representation
      const indexUInt32 = UInt32.from(context.accountUpdateIndex);
      const indexInput = UInt32.toInput(indexUInt32);


      // something is wrong here below here, receiptHash computation doesn't match the OCaml implementation
      const combinedInput: { packed: [Field, number][] } = {
        packed: [
          ...indexInput.packed!,
          [context.transactionCommitment, 255] as [Field, number],
          [oldReceiptChainHash, 255] as [Field, number],
        ],
      };

      const packedFields = packToFields(combinedInput);
      const newReceiptChainHash = hashWithPrefix('CodaReceiptUC*******', packedFields);

      account.receiptChainHash = newReceiptChainHash;
    }
  }

  return account;
}
