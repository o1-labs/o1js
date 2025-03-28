import {
  AccountUpdateAuthorizationKind,
  ZkappCommandAuthorizationEnvironment,
  FeeTransferAuthorizationEnvironment,
} from './authorization.js';
import { AccountUpdate, AccountUpdateTree, Authorized, GenericData } from './account-update.js';
import { Account, AccountId, AccountIdSet } from './account.js';
import { TokenId } from './core.js';
import { AccountUpdateErrorTrace, getCallerFrame } from './errors.js';
import { Precondition } from './preconditions.js';
import { StateLayout } from './state.js';
import { ApplyState, checkAndApplyAccountUpdate } from './zkapp-logic.js';
import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { Int64, Sign, UInt32, UInt64 } from '../../provable/int.js';
import { mocks } from '../../../bindings/crypto/constants.js';
import * as BindingsLayout from '../../../bindings/mina-transaction/gen/v2/js-layout.js';
import { Memo } from '../../../mina-signer/src/memo.js';
import { hashWithPrefix, prefixes } from '../../../mina-signer/src/poseidon-bigint.js';
import { Signature, signFieldElement } from '../../../mina-signer/src/signature.js';
import { NetworkId } from '../../../mina-signer/src/types.js';
import { LedgerView, ChainView } from './views.js';
import { PublicKey } from 'src/lib/provable/crypto/signature.js';

export { ZkappCommand, FeePayerAccountUpdate, ZkappCommandContext };

interface FeePayerInputs {
  readonly publicKey: PublicKey;
  readonly fee: UInt64; // TODO: abstract currency representation
  readonly validUntil?: UInt32; // TODO: abstract slot representation
  readonly nonce: UInt32;
}

interface ZkappCommandInputs {
  feePayer: FeePayerInputs | FeePayerAccountUpdate;
  // TODO: merge AccountUpdateTree and AccountUpdate
  accountUpdates: (AccountUpdate | AccountUpdateTree<AccountUpdate>)[];
  memo?: string;
}

interface Commitments {
  accountUpdateForestCommitment: BigInt;
  fullTransactionCommitment: BigInt;
}

// TODO: Are there actually any other types of transaction?  Or only ZkAppCommand?
interface Transaction<T extends Transaction<T>> {
  readonly __type: ['SignedCommand', 'ZkAppCommand'][number];

  /**
   * Short string (max length 32) that can be used to describe the transaction.
   * This is not used in the protocol, but it is public on chain and can be used
   * for indexing or in application logic.
   *
   * TODO: we probably want an explicit memo type instead to help enforce these rules early and not surprise the user when their memo changes slightly later
   */
  memo?: string;

  /**
   * The public key of the account, the amount, and the metadata associated with the fee for this transaction.
   */
  feePayerAccountUpdate: FeePayerAccountUpdate;

  isAuthorized: boolean;

  /**
   * Commits to the state of the transaction so that Mina can verify the authorization
   *
   * @param networkId The id of the Mina network (e.g. 'testnet', 'mainnet')
   * @returns The Field commitments to the account update forest and the full transaction as bigints
   */
  commitments(networkId: NetworkId): Commitments;

  /**
   * Authorizes all account updates in the transaction, either by signature or by proof
   *
   * @returns An authorized {@link Transaction}
   */
  authorize(...args: any): T | Promise<T>;

  /**
   * Converts the transaction to a JSON object.
   *
   * @returns A JSON object representing the transaction
   */
  toJSON(): any;
}

class FeePayerAccountUpdate {
  feePayer: BindingsLayout.FeePayerBody;
  authorization: Signature;

  constructor(descr: FeePayerInputs) {
    this.feePayer = {
      publicKey: descr.publicKey,
      fee: descr.fee,
      validUntil: descr.validUntil,
      nonce: descr.nonce,
    };
  }

  authorize({
    networkId,
    privateKey,
    fullTransactionCommitment,
  }: FeeTransferAuthorizationEnvironment): FeePayerAccountUpdate {
    let signature = signFieldElement(fullTransactionCommitment, privateKey.toBigInt(), networkId);
    const authorizedFeePayer = new FeePayerAccountUpdate(this.feePayer);
    authorizedFeePayer.authorization = signature;
    return authorizedFeePayer;
  }

  toAccountUpdate(): AccountUpdate {
    return new AccountUpdate('GenericState', GenericData, GenericData, {
      authorizationKind: AccountUpdateAuthorizationKind.Signature(),
      verificationKeyHash: new Field(mocks.dummyVerificationKeyHash),
      callData: new Field(0),
      accountId: new AccountId(this.feePayer.publicKey, TokenId.MINA),
      balanceChange: Int64.create(this.feePayer.fee, Sign.minusOne),
      incrementNonce: new Bool(true),
      useFullCommitment: new Bool(true),
      implicitAccountCreationFee: new Bool(true),
      preconditions: {
        account: {
          nonce: this.feePayer.nonce,
        },
        network: {
          globalSlotSinceGenesis: Precondition.InRange.betweenInclusive(
            UInt32.zero,
            this.feePayer.validUntil ?? UInt32.MAXINT()
          ),
        },
      },
    });
  }

  toDummyAuthorizedAccountUpdate(): Authorized {
    return new Authorized({ signature: '', proof: null }, this.toAccountUpdate());
  }

  toInternalRepr(): BindingsLayout.ZkappFeePayer {
    const repr: BindingsLayout.ZkappFeePayer = {
      body: {
        publicKey: this.feePayer.publicKey,
        fee: this.feePayer.fee,
        validUntil: this.feePayer.validUntil,
        nonce: this.feePayer.nonce,
      },
      authorization: this.authorization ? Signature.toBase58(this.authorization) : '',
    };
    return repr;
  }

  toJSON(): any {
    return FeePayerAccountUpdate.toJSON(this);
  }

  static toJSON(x: FeePayerAccountUpdate): any {
    return BindingsLayout.ZkappFeePayer.toJSON(x.toInternalRepr());
  }
}

/**
 * A command including a fee payer account update and at least one additional account update.
 *
 * TODO: This class can represent either a UserCommand or a ZkAppCommand right?  Should we rename/split out the implementations?
 */
class ZkappCommand implements Transaction<ZkappCommand> {
  readonly __type: 'ZkAppCommand';

  feePayerAccountUpdate: FeePayerAccountUpdate;
  accountUpdateForest: AccountUpdateTree<AccountUpdate>[];
  authorizedAccountUpdateForest: AccountUpdateTree<Authorized>[];
  isAuthorized = false;
  memo: string;

  constructor(descr: ZkappCommandInputs) {
    if ('fee' in descr.feePayer) {
      // Must be a FeePayerInputs
      this.feePayerAccountUpdate = new FeePayerAccountUpdate(descr.feePayer);
    } else {
      // Must be a FeePayerAccountUpdate
      this.feePayerAccountUpdate = descr.feePayer as FeePayerAccountUpdate;
    }
    this.accountUpdateForest = descr.accountUpdates.map((update) =>
      update instanceof AccountUpdateTree ? update : new AccountUpdateTree(update, [])
    );
    this.memo = Memo.fromString(descr.memo ?? '');
  }

  commitments(networkId: NetworkId): {
    accountUpdateForestCommitment: bigint;
    fullTransactionCommitment: bigint;
  } {
    const feePayerCommitment = this.feePayerAccountUpdate
      .toDummyAuthorizedAccountUpdate()
      .hash(networkId);
    const accountUpdateForestCommitment = AccountUpdateTree.hashForest(
      networkId,
      this.accountUpdateForest as AccountUpdateTree<AccountUpdate>[]
    );
    const memoCommitment = Memo.hash(this.memo);
    const fullTransactionCommitment = hashWithPrefix(prefixes.accountUpdateCons, [
      memoCommitment,
      feePayerCommitment.toBigInt(),
      accountUpdateForestCommitment,
    ]);
    return { accountUpdateForestCommitment, fullTransactionCommitment };
  }

  /**
   * Signs the fee payer account update and proves the other account updates in the transaction
   *
   * @param authorizationEnvironment - The fee payer signature authorization environment (this is required on top of the proof authorization in any case)
   * @returns An authorized Promise<{@link ZkappCommand}>
   */
  async authorize(authEnv: ZkappCommandAuthorizationEnvironment): Promise<ZkappCommand> {
    const feePayerPrivateKey = await authEnv.getPrivateKey(
      this.feePayerAccountUpdate.feePayer.publicKey
    );

    const commitments = this.commitments(authEnv.networkId);

    const authorizedFeePayerAU = this.feePayerAccountUpdate.authorize({
      networkId: authEnv.networkId,
      privateKey: feePayerPrivateKey,
      fullTransactionCommitment: commitments.fullTransactionCommitment,
    });

    const accountUpdateAuthEnv = {
      ...authEnv,
      ...commitments,
    };

    const ret = new ZkappCommand({
      feePayer: authorizedFeePayerAU,
      accountUpdates: this.accountUpdateForest,
    });
    ret.memo = this.memo;

    const authorizedAccountUpdateForest = await AccountUpdateTree.mapForest(
      ret.accountUpdateForest,
      (accountUpdate) => accountUpdate.authorize(accountUpdateAuthEnv)
    );

    ret.authorizedAccountUpdateForest = authorizedAccountUpdateForest;
    ret.isAuthorized = true;

    return ret;
  }

  toInternalRepr(): BindingsLayout.ZkappCommand {
    return {
      feePayer: this.feePayerAccountUpdate.toInternalRepr(),
      accountUpdates: AccountUpdateTree.unrollForest(
        this.authorizedAccountUpdateForest,
        (update, depth) => update.toInternalRepr(depth)
      ),
      memo: Memo.toBase58(this.memo),
    };
  }

  toJSON(): any {
    return ZkappCommand.toJSON(this);
  }

  static toJSON(x: ZkappCommand): any {
    // TODO: Is the ZkAppCommand bindings layout appropriate for signed commands as well?
    return BindingsLayout.ZkappCommand.toJSON(x.toInternalRepr());
  }
}

// NB: this is really more of an environment than a context, but this naming convention helps to
//     disambiguate the transaction environment from the mina program environment

class ZkappCommandContext {
  ledger: LedgerView;
  chain: ChainView;
  failedAccounts: AccountIdSet;
  globalSlot: UInt32;
  feeExcessState: ApplyState<Int64>;
  private accountUpdateForest: AccountUpdateTree<AccountUpdate>[];
  private accountUpdateForestTrace: AccountUpdateErrorTrace[];

  constructor(
    ledger: LedgerView,
    chain: ChainView,
    failedAccounts: AccountIdSet,
    globalSlot: UInt32
  ) {
    this.ledger = ledger;
    this.chain = chain;

    this.failedAccounts = failedAccounts;
    this.globalSlot = globalSlot;
    this.feeExcessState = { status: 'Alive', value: Int64.zero };
    this.accountUpdateForest = [];
    this.accountUpdateForestTrace = [];
  }

  add<State extends StateLayout>(
    x:
      | AccountUpdate<State, any, any>
      | AccountUpdateTree<AccountUpdate<State, any, any>, AccountUpdate>
  ) {
    const callSite = getCallerFrame();

    const accountUpdateTree = x instanceof AccountUpdateTree ? x : new AccountUpdateTree(x, []);
    const genericAccountUpdateTree = AccountUpdateTree.mapRoot(accountUpdateTree, (accountUpdate) =>
      accountUpdate.toGeneric()
    );

    const trace = AccountUpdateTree.reduce(
      genericAccountUpdateTree,
      (
        accountUpdate: AccountUpdate,
        childTraces: AccountUpdateErrorTrace[]
      ): AccountUpdateErrorTrace => {
        let errors: Error[];
        if (!this.failedAccounts.has(accountUpdate.accountId)) {
          const account =
            this.ledger.getAccount(accountUpdate.accountId) ??
            Account.empty(accountUpdate.accountId);
          const applied = checkAndApplyAccountUpdate(
            this.chain,
            account,
            accountUpdate,
            this.feeExcessState
          );

          switch (applied.status) {
            case 'Applied':
              errors = [];
              this.ledger.setAccount(applied.updatedAccount);
              this.feeExcessState = applied.updatedFeeExcessState;
              break;
            case 'Failed':
              errors = applied.errors;
              break;
          }
        } else {
          errors = [
            // TODO: this should be a warning
            new Error(
              'skipping account update because a previous account update failed when accessing the same account'
            ),
          ];
        }

        return {
          accountId: accountUpdate.accountId,
          callSite,
          errors,
          childTraces,
        };
      }
    );

    this.accountUpdateForest.push(genericAccountUpdateTree);
    this.accountUpdateForestTrace.push(trace);
  }

  // only to be used when an account update tree has already been applied to the ledger view
  unsafeAddWithoutApplying<State extends StateLayout>(
    x:
      | AccountUpdate<State, any, any>
      | AccountUpdateTree<AccountUpdate<State, any, any>, AccountUpdate>,
    trace: AccountUpdateErrorTrace
  ) {
    const accountUpdateTree = x instanceof AccountUpdateTree ? x : new AccountUpdateTree(x, []);
    const genericAccountUpdateTree = AccountUpdateTree.mapRoot(accountUpdateTree, (accountUpdate) =>
      accountUpdate.toGeneric()
    );
    this.accountUpdateForest.push(genericAccountUpdateTree);
    // TODO: check that the trace shape matches the account update shape
    this.accountUpdateForestTrace.push(trace);
  }

  finalize(): {
    accountUpdateForest: AccountUpdateTree<AccountUpdate>[];
    accountUpdateForestTrace: AccountUpdateErrorTrace[];
    generalErrors: Error[];
  } {
    const errors: Error[] = [];

    if (this.feeExcessState.status === 'Dead') {
      errors.push(new Error('fee excess could not be computed due to other errors'));
    } else if (!this.feeExcessState.value.equals(Int64.zero).toBoolean()) {
      errors.push(
        new Error(
          'fee excess does not equal 0 (this transaction is attempting to either burn or mint new Mina tokens, which is disallowed)'
        )
      );
    }

    return {
      accountUpdateForest: [...this.accountUpdateForest],
      accountUpdateForestTrace: [...this.accountUpdateForestTrace],
      generalErrors: errors,
    };
  }
}

// IMPORTANT TODO: Currently, if a zkapp command fails in the virtual application, any successful
//                 account updates are still applied to the provided ledger view. We should
//                 probably make the ledger view interface immutable, or clone it every time we
//                 create a new zkapp command, to help avoid unexpected behavior externally.
/*
async function createUnsignedZkappCommand(
  ledger: LedgerView,
  chain: ChainView,
  {
    feePayer,
    fee,
    validUntil,
  }: {
    feePayer: PublicKey;
    fee: UInt64;
    validUntil?: UInt32;
  },
  f: (ctx: ZkappCommandContext) => Promise<void>
): Promise<ZkappCommand> {
  // TODO
  const globalSlot = UInt32.zero;

  const failedAccounts = new AccountIdSet();
  let feePaymentErrors: Error[] = [];
  let feePayment: ZkappFeePayment | null = null;

  const feePayerId = new AccountId(feePayer, TokenId.MINA);
  const feePayerAccount = ledger.getAccount(feePayerId);

  if (feePayerAccount !== null) {
    feePayment = new ZkappFeePayment({
      publicKey: feePayer,
      nonce: feePayerAccount.nonce,
      fee,
      validUntil,
    });

    const applied = checkAndApplyFeePayment(chain, feePayerAccount, feePayment);
    switch (applied.status) {
      case 'Applied':
        ledger.setAccount(applied.updatedAccount);
        break;
      case 'Failed':
        feePaymentErrors = applied.errors;
        failedAccounts.add(feePayerAccount.accountId);
        break;
    }
  } else {
    feePaymentErrors = [new Error('zkapp fee payer account not found')];
    failedAccounts.add(feePayerId);
  }

  const ctx = new ZkappCommandContext(ledger, chain, failedAccounts, globalSlot);
  await f(ctx);
  const { accountUpdateForest, accountUpdateForestTrace, generalErrors } = ctx.finalize();

  const errorTrace = new ZkappCommandErrorTrace(
    generalErrors,
    feePaymentErrors,
    accountUpdateForestTrace
  );

  if (!errorTrace.hasErrors()) {
    // should never be true if we hit this branch
    if (feePayment === null) throw new Error('internal error');

    return new ZkappCommand({
      feePayment,
      accountUpdates: accountUpdateForest,
    });
  } else {
    console.log(errorTrace.generateReport());
    throw new Error(
      'errors were encountered while creating a ZkappCommand (an error report is available in the logs)'
    );
  }
}
*/
/*
async function createZkappCommand(
  ledger: LedgerView,
  chain: ChainView,
  authEnv: ZkappCommandAuthorizationEnvironment,
  feePayment: {
    feePayer: PublicKey;
    fee: UInt64;
    validUntil?: UInt32;
  },
  f: (ctx: ZkappCommandContext) => Promise<void>
): Promise<AuthorizedZkappCommand> {
  const unsignedCmd = await createUnsignedZkappCommand(ledger, chain, feePayment, f);
  return unsignedCmd.authorize(authEnv);
}

*/
