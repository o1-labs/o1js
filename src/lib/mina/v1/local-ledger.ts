/**
 * TypeScript implementation of the local ledger for testing zkApps.
 *
 * This replaces the OCaml implementation in src/bindings/ocaml/lib/local_ledger.ml
 * and provides a TypeScript implementation for local blockchain.
 */

import type { MlPublicKey } from '../../../bindings.js';
import type { FieldConst } from '../../provable/core/fieldvar.js';
import type { Account as JsonAccount } from '../../../bindings/mina-transaction/gen/v1/transaction-json.js';
import { Account, newAccount } from './account.js';
import { Ml } from '../../ml/conversion.js';
import { Field, Bool } from '../../provable/wrapped.js';
import { UInt64, UInt32, Int64, Sign } from '../../provable/int.js';
import { AccountUpdate } from './account-update.js';
import { Types } from '../../../bindings/mina-transaction/v1/types.js';
import { applyAccountUpdate, type AccountUpdateContext } from './transaction-logic/apply.js';
import { transactionCommitments as computeTransactionCommitments } from '../../../mina-signer/src/sign-zkapp-command.js';
import type { NetworkId } from '../../../mina-signer/src/types.js';

export { Ledger };

/**
 * Converts a FeePayer to an AccountUpdate.
 */
function feePayerToAccountUpdate(feePayer: Types.ZkappCommand['feePayer']): AccountUpdate {
  // start with empty account update (mina-signer line 234)
  const { body } = Types.AccountUpdate.empty();

  // set fee payer-specific fields (mina-signer lines 235-252)
  body.publicKey = feePayer.body.publicKey;

  body.balanceChange = Int64.create(feePayer.body.fee, Sign.minusOne);

  body.incrementNonce = Bool(true);

  // network precondition: globalSlotSinceGenesis
  body.preconditions.network.globalSlotSinceGenesis = {
    isSome: Bool(true),
    value: {
      lower: UInt32.zero,
      upper: feePayer.body.validUntil ?? UInt32.from(UInt32.MAXINT()),
    },
  };

  // account precondition: nonce
  body.preconditions.account.nonce = {
    isSome: Bool(true),
    value: { lower: feePayer.body.nonce, upper: feePayer.body.nonce },
  };

  // fee payer always uses full commitment
  body.useFullCommitment = Bool(true);
  body.implicitAccountCreationFee = Bool(true);

  // authorization (mina-signer lines 248-252)
  // uses dummyVerificationKeyHash (src/bindings/crypto/constants.ts)
  body.authorizationKind = {
    isProved: Bool(false),
    isSigned: Bool(true),
    verificationKeyHash: Field('3392518251768960475377392625298437850623664973002200885669375116181514017494'),
  };

  return new AccountUpdate(body, { proof: undefined, signature: feePayer.authorization });
}

/**
 * Local ledger implementation for testing.
 *
 * Internally stores V1 Account objects but maintains API compatibility by converting to/from JSON when needed.
 */
class Ledger {
  private nextLocation: number = 0;
  private accounts: Map<number, Account> = new Map(); // V1 account type
  private locations: Map<string, number> = new Map();

  private constructor() { }

  /**
   * Creates a new ledger.
   */
  static create(): Ledger {
    return new Ledger();
  }

  /**
   * Adds an account with the given public key and balance to the ledger.
   *
   * @param publicKey - The account's public key in ML representation
   * @param balance - The initial balance as a string
   * @throws Error if the account already exists
   */
  addAccount(publicKey: MlPublicKey, balance: string): void {
    const defaultTokenId: FieldConst = [0, 1n]; // TokenId.default
    const accountIdKey = accountIdToString(publicKey, defaultTokenId);

    // check if account already exists
    if (this.locations.has(accountIdKey)) {
      throw new Error(
        `Account ${publicKeyToString(publicKey)} already exists in the ledger`
      );
    }

    const account = createAccount(publicKey, defaultTokenId, balance);

    const location = this.nextLocation++;

    this.accounts.set(location, account);
    this.locations.set(accountIdKey, location);
  }

  /**
   * Returns an account for the given public key and token ID.
   *
   * Returns JsonAccount for API compatibility with LocalBlockchain.
   *
   * @param publicKey - The account's public key in ML representation
   * @param tokenId - The token ID as a FieldConst
   * @returns The account as JSON if it exists, or undefined
   */
  getAccount(
    publicKey: MlPublicKey,
    tokenId: FieldConst
  ): JsonAccount | undefined {
    const accountIdKey = accountIdToString(publicKey, tokenId);
    const location = this.locations.get(accountIdKey);

    if (location === undefined) {
      return undefined;
    }

    const account = this.accounts.get(location);
    if (account === undefined) {
      return undefined;
    }

    // convert V1 account to JSON
    return Account.toJSON(account);
  }

  /**
   * Applies a JSON transaction to the ledger.
   *
   * Parses the transaction, applies each account update, and handles errors.
   *
   * @param txJson - The transaction as a JSON string
   * @param _accountCreationFee - The account creation fee as a string (unused in current implementation)
   * @param _networkState - The network state as a JSON string (unused in current implementation)
   * @throws Error if the transaction is invalid or fails to apply
   */
  async applyJsonTransaction(
    txJson: string,
    _accountCreationFee: string,
    _networkState: string
  ): Promise<void> {
    // parse the transaction JSON
    const txJsonParsed = JSON.parse(txJson);
    const zkappCommand = Types.ZkappCommand.fromJSON(txJsonParsed);

    const errors: string[] = [];

    try {
      // compute transaction commitments for receipt chain hash
      // use dynamic import for ESM compatibility?
      const TypesBigint = await import('../../../bindings/mina-transaction/gen/v1/transaction-bigint.js');
      const zkappCommandBigint = TypesBigint.ZkappCommand.fromJSON(txJsonParsed);

      const networkId: NetworkId = 'testnet';
      const { fullCommitment: minaSignerFullCommitment } = computeTransactionCommitments(
        zkappCommandBigint,
        networkId
      );

      // zkapp_command.ml:217-230
      const feePayerAccountUpdate = feePayerToAccountUpdate(zkappCommand.feePayer);

      // zkapp_command_logic.ml:1776
      const transactionCommitment = Field(minaSignerFullCommitment);

      const allAccountUpdates = [feePayerAccountUpdate, ...zkappCommand.accountUpdates.map(
        (au) => new AccountUpdate(au.body, au.authorization)
      )];

      // apply all account updates
      for (let i = 0; i < allAccountUpdates.length; i++) {
        const accountUpdate = allAccountUpdates[i];

        const publicKey = Ml.fromPublicKey(accountUpdate.body.publicKey);
        const tokenId = Ml.constFromField(accountUpdate.body.tokenId);

        const { account, location } = this.getOrCreateAccount(publicKey, tokenId);

        const context: AccountUpdateContext = {
          transactionCommitment,
          accountUpdateIndex: i,
        };

        try {
          const updatedAccount = applyAccountUpdate(account, accountUpdate, context);
          this.setAccount(location, updatedAccount);
        } catch (err: any) {
          errors.push(err.message || String(err));
        }
      }
      if (errors.length > 0) {
        throw new Error(JSON.stringify(errors));
      }
    } catch (err: any) {
      if (err.message && err.message.startsWith('[')) {
        throw err;
      }
      throw new Error(JSON.stringify([err.message || String(err)]));
    }
  }

  /**
   * Gets or creates an account for the given account ID.
   * Returns the account state (added/existed), the account, and its location.
   */
  private getOrCreateAccount(
    publicKey: MlPublicKey,
    tokenId: FieldConst
  ): { state: 'Added' | 'Existed'; account: Account; location: number } {
    const accountIdKey = accountIdToString(publicKey, tokenId);
    const existingLocation = this.locations.get(accountIdKey);

    if (existingLocation !== undefined) {
      const account = this.accounts.get(existingLocation)!;
      return { state: 'Existed', account, location: existingLocation };
    }

    // create new account with zero balance
    const account = createAccount(publicKey, tokenId, '0');
    const location = this.nextLocation++;

    this.accounts.set(location, account);
    this.locations.set(accountIdKey, location);

    return { state: 'Added', account, location };
  }

  /**
   * Updates an account at the given location.
   */
  private setAccount(location: number, account: Account): void {
    this.accounts.set(location, account);
  }
}

/**
 * Encodes an account ID (public key + token ID) to a unique string.
 *
 * Format: "<x>:<isOdd>:<tokenId>"
 */
function accountIdToString(publicKey: MlPublicKey, tokenId: FieldConst): string {
  const [, x, isOdd] = publicKey;
  const [, xValue] = x;
  const [, tokenValue] = tokenId;

  return `${xValue}:${isOdd}:${tokenValue}`;
}

/**
 * Converts a public key to a readable string for error messages.
 */
function publicKeyToString(publicKey: MlPublicKey): string {
  const [, x, isOdd] = publicKey;
  const [, xValue] = x;
  return `PublicKey(x=${xValue}, isOdd=${isOdd})`;
}

/**
 * Creates a new V1 account with the given parameters.
 *
 * @param publicKey - The account's public key in ML representation
 * @param tokenId - The token ID as FieldConst
 * @param balance - The initial balance as a string
 * @returns A new V1 Account with typed fields
 */
function createAccount(
  publicKey: MlPublicKey,
  tokenId: FieldConst,
  balance: string
): Account {
  // convert ML types to V1 types
  const pk = Ml.toPublicKey(publicKey);

  const token = Field(tokenId);
  const account = newAccount({ publicKey: pk, tokenId: token });
  account.balance = UInt64.from(balance);

  return account;
}
