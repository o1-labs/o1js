import {
  AccountUpdateAuthorizationKind,
  ZkappCommandAuthorizationEnvironment,
  ZkappFeePaymentAuthorizationEnvironment,
} from './authorization.js';
import { AccountUpdate, AccountUpdateTree, Authorized, GenericData } from './account-update.js';
import { Account, AccountId, AccountIdSet } from './account.js';
import { TokenId } from './core.js';
import { AccountUpdateErrorTrace, getCallerFrame } from './errors.js';
import { Precondition } from './preconditions.js';
import { StateLayout } from './state.js';
import { ChainView, LedgerView } from './views.js';
import { ApplyState, checkAndApplyAccountUpdate } from './zkapp-logic.js';
import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { Int64, Sign, UInt32, UInt64 } from '../../provable/int.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { mocks } from '../../../bindings/crypto/constants.js';
import * as BindingsLayout from '../../../bindings/mina-transaction/gen/v2/js-layout.js';
import { Memo } from '../../../mina-signer/src/memo.js';
import { hashWithPrefix, prefixes } from '../../../mina-signer/src/poseidon-bigint.js';
import { Signature, signFieldElement } from '../../../mina-signer/src/signature.js';
import { NetworkId } from '../../../mina-signer/src/types.js';
import { Mina } from './mina.js';

export { ZkappCommand, ZkappFeePayment, ZkappCommandContext };

interface ZkappFeePaymentDescription {
  readonly publicKey: PublicKey;
  readonly fee: UInt64; // TODO: abstract currency representation
  readonly validUntil?: UInt32; // TODO: abstract slot representation
  readonly nonce: UInt32;
}

class ZkappFeePayment implements Mina.Transaction<ZkappFeePayment> {
  readonly __type: 'FeeTransfer';
  feePayer: BindingsLayout.FeePayerBody;
  authorization: Signature;

  constructor(descr: ZkappFeePaymentDescription) {
    this.feePayer = {
      publicKey: descr.publicKey,
      fee: descr.fee,
      validUntil: descr.validUntil,
      nonce: descr.nonce,
    };
  }

  authorizeSignature({
    networkId,
    privateKey,
    fullTransactionCommitment,
  }: ZkappFeePaymentAuthorizationEnvironment): ZkappFeePayment {
    let signature = signFieldElement(fullTransactionCommitment, privateKey.toBigInt(), networkId);
    const ret = new ZkappFeePayment({
      publicKey: this.feePayer.publicKey,
      fee: this.feePayer.fee,
      validUntil: this.feePayer.validUntil,
      nonce: this.feePayer.nonce,
    });
    ret.authorization = signature;
    return ret;
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
    return ZkappFeePayment.toJSON(this);
  }

  static toJSON(x: ZkappFeePayment): any {
    return BindingsLayout.ZkappFeePayer.toJSON(x.toInternalRepr());
  }
}

interface ZkappCommandDescription {
  feePayment: ZkappFeePayment;
  // TODO: merge AccountUpdateTree and AccountUpdate
  accountUpdates: (AccountUpdate | AccountUpdateTree<AccountUpdate>)[];
  memo?: string;
}

class ZkappCommand implements Mina.Transaction<ZkappCommand> {
  // TODO: put this on everything (in this case, we really need it to disambiguate the Description format)
  readonly __type: 'ZkAppCommand';

  feePayer: BindingsLayout.FeePayerBody;
  feePayment: ZkappFeePayment;
  accountUpdateForest: AccountUpdateTree<AccountUpdate>[];
  authorizedAccountUpdateForest: AccountUpdateTree<Authorized>[];
  memo: string;

  constructor(descr: ZkappCommandDescription) {
    this.feePayment = descr.feePayment;
    this.feePayer = this.feePayment.feePayer;
    this.accountUpdateForest = descr.accountUpdates.map((update) =>
      update instanceof AccountUpdateTree ? update : new AccountUpdateTree(update, [])
    );
    // TODO: we probably want an explicit memo type instead to help enforce these rules early and not surprise the user when their memo changes slightly later
    this.memo = Memo.fromString(descr.memo ?? '');
  }

  commitments(networkId: NetworkId): {
    accountUpdateForestCommitment: bigint;
    fullTransactionCommitment: bigint;
  } {
    const feePayerCommitment = this.feePayment.toDummyAuthorizedAccountUpdate().hash(networkId);
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

  async authorizeProof(authEnv: ZkappCommandAuthorizationEnvironment): Promise<ZkappCommand> {
    const feePayerPrivateKey = await authEnv.getPrivateKey(this.feePayment.feePayer.publicKey);

    const commitments = this.commitments(authEnv.networkId);

    const authorizedFeePayment = this.feePayment.authorizeSignature({
      networkId: authEnv.networkId,
      privateKey: feePayerPrivateKey,
      fullTransactionCommitment: commitments.fullTransactionCommitment,
    });

    const accountUpdateAuthEnv = {
      ...authEnv,
      ...commitments,
    };

    const ret = new ZkappCommand({
      feePayment: authorizedFeePayment,
      accountUpdates: this.accountUpdateForest,
    });
    ret.memo = this.memo;

    const authorizedAccountUpdateForest = await AccountUpdateTree.mapForest(
      ret.accountUpdateForest,
      (accountUpdate) => accountUpdate.authorize(accountUpdateAuthEnv)
    );

    ret.authorizedAccountUpdateForest = authorizedAccountUpdateForest;

    return ret;
  }

  toInternalRepr(): BindingsLayout.ZkappCommand {
    return {
      feePayer: this.feePayment.toInternalRepr(),
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
