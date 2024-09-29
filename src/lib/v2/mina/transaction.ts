import {
  AccountUpdateAuthorizationKind,
  ZkappCommandAuthorizationEnvironment,
  ZkappFeePaymentAuthorizationEnvironment
} from './authorization.js';
import { AccountUpdate, GenericData } from './account-update.js';
import { AccountId, Constraint, TokenId } from './core.js';
import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { Int64, Sign, UInt32, UInt64 } from '../../provable/int.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { mocks } from '../../../bindings/crypto/constants.js';
import * as BindingsLayout from '../../../bindings/mina-transaction/gen/js-layout-v2.js';
import { Memo } from '../../../mina-signer/src/memo.js';
import { hashWithPrefix, packToFields, prefixes } from '../../../mina-signer/src/poseidon-bigint.js';
import { Signature, signFieldElement, zkAppBodyPrefix } from '../../../mina-signer/src/signature.js';
import { NetworkId } from '../../../mina-signer/src/types.js';

// TODO: CONSIDER -- merge this logic into AccountUpdate
export class AccountUpdateTree<AccountUpdateType> {
  constructor(
    public accountUpdate: AccountUpdateType,
    public children: AccountUpdateTree<AccountUpdateType>[]
  ) {}

  forEachNode(depth: number, f: (accountUpdate: AccountUpdateType, depth: number) => void): void {
    f(this.accountUpdate, depth);
    this.children.forEach((child) => child.forEachNode(depth+1, f));
  }

  async map<T>(f: (accountUpdate: AccountUpdateType) => Promise<T>): Promise<AccountUpdateTree<T>> {
    const newAccountUpdate = await f(this.accountUpdate);
    const newChildren = await AccountUpdateTree.mapForest(this.children, f);

    return new AccountUpdateTree(newAccountUpdate, newChildren);
  }

  // TODO: Field, not bigint
  static hash(tree: AccountUpdateTree<AccountUpdate>, networkId: NetworkId): bigint {
    // TODO: is it ok to do this and ignore the toValue encodings entirely?
    const accountUpdateFieldInput = tree.accountUpdate.toInput();
    const accountUpdateBigintInput = {
      fields: accountUpdateFieldInput.fields?.map((f: Field) => f.toBigInt()),
      packed: accountUpdateFieldInput.packed?.map(([f, n]: [Field, number]): [bigint, number] => [f.toBigInt(), n]),
    }

    // TODO: negotiate between this implementation and AccountUpdate#hash to figure out what is correct
    const accountUpdateCommitment =
      hashWithPrefix(
        zkAppBodyPrefix(networkId),
        packToFields(accountUpdateBigintInput)
      );
    const childrenCommitment = AccountUpdateTree.hashForest(networkId, tree.children);
    return hashWithPrefix(prefixes.accountUpdateNode, [
      accountUpdateCommitment,
      childrenCommitment
    ]);
  }

  // TODO: Field, not bigint
  static hashForest(networkId: NetworkId, forest: AccountUpdateTree<AccountUpdate>[]): bigint {
    const consHash = (acc: bigint, tree: AccountUpdateTree<AccountUpdate>) =>
      hashWithPrefix(prefixes.accountUpdateCons, [AccountUpdateTree.hash(tree, networkId), acc]);
    return [...forest].reverse().reduce(consHash, 0n);
  }

  static mapForest<A, B>(forest: AccountUpdateTree<A>[], f: (a: A) => Promise<B>): Promise<AccountUpdateTree<B>[]> {
    return Promise.all(forest.map((tree) => tree.map(f)));
  }

  static unrollForest<AccountUpdateType, Return>(forest: AccountUpdateTree<AccountUpdateType>[], f: (accountUpdate: AccountUpdateType, depth: number) => Return): Return[] {
    const seq: Return[] = [];
    forest.forEach((tree) => tree.forEachNode(0, (accountUpdate, depth) => seq.push(f(accountUpdate, depth))));
    return seq;
  }
}

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
          balanceChange: new Int64(this.fee, Sign.minusOne),
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
  accountUpdates: AccountUpdateTree<AccountUpdate>[];
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
    this.accountUpdateForest = descr.accountUpdates;
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
