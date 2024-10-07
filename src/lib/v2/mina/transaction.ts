import {
  AccountUpdateAuthorizationKind,
  ZkappCommandAuthorizationEnvironment,
  ZkappFeePaymentAuthorizationEnvironment
} from './authorization.js';
import { AccountUpdate, AccountUpdateTree, GenericData } from './account-update.js';
import { AccountId, Constraint, TokenId } from './core.js';
import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { Int64, Sign, UInt32, UInt64 } from '../../provable/int.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { mocks } from '../../../bindings/crypto/constants.js';
import * as BindingsLayout from '../../../bindings/mina-transaction/gen/js-layout-v2.js';
import { Memo } from '../../../mina-signer/src/memo.js';
import { hashWithPrefix, prefixes } from '../../../mina-signer/src/poseidon-bigint.js';
import { Signature, signFieldElement } from '../../../mina-signer/src/signature.js';
import { NetworkId } from '../../../mina-signer/src/types.js';

export interface ZkappFeePaymentDescription {
  publicKey: PublicKey;
  fee: UInt64; // TODO: abstract currency representation
  validUntil?: UInt32; // TODO: abstract slot representation
  nonce: UInt32;
}

export class ZkappFeePayment {
  readonly __type: 'ZkappCommand' = 'ZkappCommand';

  publicKey: PublicKey;
  fee: UInt64;
  validUntil: UInt32 | undefined;
  nonce: UInt32;

  constructor(descr: ZkappFeePaymentDescription) {
    this.publicKey = descr.publicKey;
    this.fee = descr.fee;
    this.validUntil = descr.validUntil;
    this.nonce = descr.nonce;
  }

  authorize({networkId, privateKey, fullTransactionCommitment}: ZkappFeePaymentAuthorizationEnvironment): AuthorizedZkappFeePayment {
    let signature = signFieldElement(
      fullTransactionCommitment,
      privateKey.toBigInt(),
      networkId
    );
    return new AuthorizedZkappFeePayment(
      this,
      Signature.toBase58(signature)
    );
  }

  toAccountUpdate(): AccountUpdate.Authorized {
    return new AccountUpdate.Authorized(
      { signature: '', proof: null },
      new AccountUpdate(
        'GenericState',
        GenericData,
        GenericData,
        {
          authorizationKind: AccountUpdateAuthorizationKind.Signature(),
          verificationKeyHash: new Field(mocks.dummyVerificationKeyHash),
          callData: new Field(0),
          accountId: new AccountId(this.publicKey, TokenId.MINA),
          balanceChange: Int64.create(this.fee, Sign.minusOne),
          incrementNonce: new Bool(true),
          useFullCommitment: new Bool(true),
          implicitAccountCreationFee: new Bool(true),
          preconditions: {
            account: {
              nonce: this.nonce
            },
            network: {
              globalSlotSinceGenesis: Constraint.InRange.betweenInclusive(UInt32.zero, this.validUntil ?? UInt32.MAXINT())
            }
          }
        }
      )
    );
  }

  toInternalRepr(): BindingsLayout.FeePayerBody {
    return {
      publicKey: this.publicKey,
      fee: this.fee,
      validUntil: this.validUntil,
      nonce: this.nonce
    }
  }

  toJSON(): any {
    return ZkappFeePayment.toJSON(this);
  }

  static toJSON(x: ZkappFeePayment): any {
    return BindingsLayout.FeePayerBody.toJSON(x.toInternalRepr());
  }
}

export class AuthorizedZkappFeePayment {

  constructor(
    public readonly body: ZkappFeePayment,
    public readonly signature: string
  ) {}

  toInternalRepr(): BindingsLayout.ZkappFeePayer {
    return {
      body: this.body.toInternalRepr(),
      authorization: this.signature
    }
  }
}

export interface ZkappCommandDescription {
  feePayment: ZkappFeePayment;
  // TODO: merge AccountUpdateTree and AccountUpdate
  accountUpdates: (AccountUpdate | AccountUpdateTree<AccountUpdate>)[];
  memo?: string;
}

export class ZkappCommand {
  // TODO: put this on everything (in this case, we really need it to disambiguate the Description format)
  readonly __type: 'ZkappCommand' = 'ZkappCommand';

  feePayment: ZkappFeePayment;
  accountUpdateForest: AccountUpdateTree<AccountUpdate>[];
  memo: string;

  constructor(descr: ZkappCommandDescription) {
    this.feePayment = descr.feePayment;
    this.accountUpdateForest = descr.accountUpdates.map(
      (update) => update instanceof AccountUpdateTree ? update : new AccountUpdateTree(update, [])
    );
    // TODO: we probably want an explicit memo type instead to help enforce these rules early and not surprise the user when their memo changes slightly later
    this.memo = Memo.fromString(descr.memo ?? '');
  }

  commitments(networkId: NetworkId): {accountUpdateForestCommitment: bigint, fullTransactionCommitment: bigint} {
    const feePayerCommitment = this.feePayment.toAccountUpdate().hash(networkId);
    const accountUpdateForestCommitment = AccountUpdateTree.hashForest(networkId, this.accountUpdateForest);
    const memoCommitment = Memo.hash(this.memo);
    const fullTransactionCommitment = hashWithPrefix(prefixes.accountUpdateCons, [
      memoCommitment,
      feePayerCommitment.toBigInt(),
      accountUpdateForestCommitment
    ]);
    return {accountUpdateForestCommitment, fullTransactionCommitment};
  }

  async authorize(authEnv: ZkappCommandAuthorizationEnvironment): Promise<AuthorizedZkappCommand> {
    const feePayerPrivateKey = await authEnv.getPrivateKey(this.feePayment.publicKey);

    const commitments = this.commitments(authEnv.networkId);

    const authorizedFeePayment = this.feePayment.authorize({
      networkId: authEnv.networkId,
      privateKey: feePayerPrivateKey,
      fullTransactionCommitment: commitments.fullTransactionCommitment
    });

    const accountUpdateAuthEnv = {
      ...authEnv,
      ...commitments
    };
    const authorizedAccountUpdateForest = await AccountUpdateTree.mapForest(this.accountUpdateForest, (accountUpdate) => accountUpdate.authorize(accountUpdateAuthEnv));

    return new AuthorizedZkappCommand({
      feePayment: authorizedFeePayment,
      accountUpdateForest: authorizedAccountUpdateForest,
      memo: this.memo
    });
  }
}

export class AuthorizedZkappCommand {
  readonly __type: 'AuthorizedZkappCommand' = 'AuthorizedZkappCommand';

  readonly feePayment: AuthorizedZkappFeePayment;
  readonly accountUpdateForest: AccountUpdateTree<AccountUpdate.Authorized>[];
  readonly memo: string;

  constructor({feePayment, accountUpdateForest, memo}: {
    feePayment: AuthorizedZkappFeePayment;
    accountUpdateForest: AccountUpdateTree<AccountUpdate.Authorized>[];
    memo: string;
  }) {
    this.feePayment = feePayment;
    this.accountUpdateForest = accountUpdateForest;
    // TODO: here we have to assume the Memo is already encoded correctly, but what we really want is a Memo type...
    this.memo = memo;
  }

  toInternalRepr(): BindingsLayout.ZkappCommand {
    return {
      feePayer: this.feePayment.toInternalRepr(),
      accountUpdates: AccountUpdateTree.unrollForest(
        this.accountUpdateForest,
        (update, depth) => update.toInternalRepr(depth)
      ),
      memo: Memo.toBase58(this.memo)
    }
  }

  toJSON(): any {
    return AuthorizedZkappCommand.toJSON(this);
  }

  static toJSON(x: AuthorizedZkappCommand): any {
    return BindingsLayout.ZkappCommand.toJSON(x.toInternalRepr());
  }
}
