import {
  cloneCircuitValue,
  FlexibleProvable,
  provable,
  provablePure,
  Struct,
  Unconstrained,
} from './circuit_value.js';
import { memoizationContext, memoizeWitness, Provable } from './provable.js';
import { Field, Bool } from './core.js';
import { Pickles, Test } from '../snarky.js';
import { jsLayout } from '../bindings/mina-transaction/gen/js-layout.js';
import {
  Types,
  TypesBigint,
  toJSONEssential,
} from '../bindings/mina-transaction/types.js';
import { PrivateKey, PublicKey } from './signature.js';
import { UInt64, UInt32, Int64, Sign } from './int.js';
import type { SmartContract } from './zkapp.js';
import {
  Preconditions,
  Account,
  Network,
  CurrentSlot,
  preconditions,
  OrIgnore,
  ClosedInterval,
  getAccountPreconditions,
} from './precondition.js';
import { dummyBase64Proof, Empty, Proof, Prover } from './proof_system.js';
import { Memo } from '../mina-signer/src/memo.js';
import {
  Events,
  Actions,
} from '../bindings/mina-transaction/transaction-leaves.js';
import { TokenId as Base58TokenId } from './base58-encodings.js';
import {
  hashWithPrefix,
  packToFields,
  Poseidon,
  ProvableHashable,
} from './hash.js';
import {
  mocks,
  prefixes,
  protocolVersions,
} from '../bindings/crypto/constants.js';
import { MlArray } from './ml/base.js';
import { Signature, signFieldElement } from '../mina-signer/src/signature.js';
import { MlFieldConstArray } from './ml/fields.js';
import {
  accountUpdatesToCallForest,
  CallForest,
  callForestHashGeneric,
  transactionCommitments,
} from '../mina-signer/src/sign-zkapp-command.js';
import { currentTransaction } from './mina/transaction-context.js';
import { isSmartContract } from './mina/smart-contract-base.js';
import { activeInstance } from './mina/mina-instance.js';
import {
  emptyHash,
  genericHash,
  MerkleList,
  MerkleListBase,
} from './provable-types/merkle-list.js';
import { Hashed } from './provable-types/packed.js';
import {
  accountUpdates,
  smartContractContext,
} from './mina/smart-contract-context.js';
import { assert } from './util/assert.js';

// external API
export {
  AccountUpdate,
  Permissions,
  ZkappPublicInput,
  TransactionVersion,
  AccountUpdateForest,
};
// internal API
export {
  SetOrKeep,
  Permission,
  Preconditions,
  Body,
  Authorization,
  FeePayerUnsigned,
  ZkappCommand,
  addMissingSignatures,
  addMissingProofs,
  Events,
  Actions,
  TokenId,
  Token,
  CallForest,
  createChildAccountUpdate,
  zkAppProver,
  dummySignature,
  LazyProof,
  AccountUpdateTree,
  AccountUpdateLayout,
  hashAccountUpdate,
  HashedAccountUpdate,
};

const TransactionVersion = {
  current: () => UInt32.from(protocolVersions.txnVersion),
};

type ZkappProverData = {
  transaction: ZkappCommand;
  accountUpdate: AccountUpdate;
  index: number;
};
let zkAppProver = Prover<ZkappProverData>();

type AuthRequired = Types.Json.AuthRequired;

type AccountUpdateBody = Types.AccountUpdate['body'];
type Update = AccountUpdateBody['update'];

type MayUseToken = AccountUpdateBody['mayUseToken'];

/**
 * Either set a value or keep it the same.
 */
type SetOrKeep<T> = { isSome: Bool; value: T };

const True = () => Bool(true);
const False = () => Bool(false);

/**
 * One specific permission value.
 *
 * A {@link Permission} tells one specific permission for our zkapp how it
 * should behave when presented with requested modifications.
 *
 * Use static factory methods on this class to use a specific behavior. See
 * documentation on those methods to learn more.
 */
type Permission = Types.AuthRequired;
let Permission = {
  /**
   * Modification is impossible.
   */
  impossible: (): Permission => ({
    constant: True(),
    signatureNecessary: True(),
    signatureSufficient: False(),
  }),

  /**
   * Modification is always permitted
   */
  none: (): Permission => ({
    constant: True(),
    signatureNecessary: False(),
    signatureSufficient: True(),
  }),

  /**
   * Modification is permitted by zkapp proofs only
   */
  proof: (): Permission => ({
    constant: False(),
    signatureNecessary: False(),
    signatureSufficient: False(),
  }),

  /**
   * Modification is permitted by signatures only, using the private key of the zkapp account
   */
  signature: (): Permission => ({
    constant: False(),
    signatureNecessary: True(),
    signatureSufficient: True(),
  }),

  /**
   * Modification is permitted by zkapp proofs or signatures
   */
  proofOrSignature: (): Permission => ({
    constant: False(),
    signatureNecessary: False(),
    signatureSufficient: True(),
  }),
};

// TODO: we could replace the interface below if we could bridge annotations from OCaml
type Permissions_ = Update['permissions']['value'];

/**
 * Permissions specify how specific aspects of the zkapp account are allowed
 * to be modified. All fields are denominated by a {@link Permission}.
 */
interface Permissions extends Permissions_ {
  /**
   * The {@link Permission} corresponding to the 8 state fields associated with
   * an account.
   */
  editState: Permission;

  /**
   * The {@link Permission} corresponding to the ability to send transactions
   * from this account.
   */
  send: Permission;

  /**
   * The {@link Permission} corresponding to the ability to receive transactions
   * to this account.
   */
  receive: Permission;

  /**
   * The {@link Permission} corresponding to the ability to set the delegate
   * field of the account.
   */
  setDelegate: Permission;

  /**
   * The {@link Permission} corresponding to the ability to set the permissions
   * field of the account.
   */
  setPermissions: Permission;

  /**
   * The {@link Permission} corresponding to the ability to set the verification
   * key associated with the circuit tied to this account. Effectively
   * "upgradeability" of the smart contract.
   */
  setVerificationKey: {
    auth: Permission;
    txnVersion: UInt32;
  };

  /**
   * The {@link Permission} corresponding to the ability to set the zkapp uri
   * typically pointing to the source code of the smart contract. Usually this
   * should be changed whenever the {@link Permissions.setVerificationKey} is
   * changed. Effectively "upgradeability" of the smart contract.
   */
  setZkappUri: Permission;

  /**
   * The {@link Permission} corresponding to the ability to emit actions to the account.
   */
  editActionState: Permission;

  /**
   * The {@link Permission} corresponding to the ability to set the token symbol
   * for this account.
   */
  setTokenSymbol: Permission;

  // TODO: doccomments
  incrementNonce: Permission;
  setVotingFor: Permission;
  setTiming: Permission;

  /**
   * Permission to control the ability to include _any_ account update for this
   * account in a transaction. Note that this is more restrictive than all other
   * permissions combined. For normal accounts it can safely be set to `none`,
   * but for token contracts this has to be more restrictive, to prevent
   * unauthorized token interactions -- for example, it could be
   * `proofOrSignature`.
   */
  access: Permission;
}
let Permissions = {
  ...Permission,
  /**
   * Default permissions are:
   *
   *   {@link Permissions.editState} = {@link Permission.proof}
   *
   *   {@link Permissions.send} = {@link Permission.signature}
   *
   *   {@link Permissions.receive} = {@link Permission.none}
   *
   *   {@link Permissions.setDelegate} = {@link Permission.signature}
   *
   *   {@link Permissions.setPermissions} = {@link Permission.signature}
   *
   *   {@link Permissions.setVerificationKey} = {@link Permission.signature}
   *
   *   {@link Permissions.setZkappUri} = {@link Permission.signature}
   *
   *   {@link Permissions.editActionState} = {@link Permission.proof}
   *
   *   {@link Permissions.setTokenSymbol} = {@link Permission.signature}
   *
   */
  default: (): Permissions => ({
    editState: Permission.proof(),
    send: Permission.proof(),
    receive: Permission.none(),
    setDelegate: Permission.signature(),
    setPermissions: Permission.signature(),
    setVerificationKey: {
      auth: Permission.signature(),
      txnVersion: TransactionVersion.current(),
    },
    setZkappUri: Permission.signature(),
    editActionState: Permission.proof(),
    setTokenSymbol: Permission.signature(),
    incrementNonce: Permission.signature(),
    setVotingFor: Permission.signature(),
    setTiming: Permission.signature(),
    access: Permission.none(),
  }),

  initial: (): Permissions => ({
    editState: Permission.signature(),
    send: Permission.signature(),
    receive: Permission.none(),
    setDelegate: Permission.signature(),
    setPermissions: Permission.signature(),
    setVerificationKey: {
      auth: Permission.signature(),
      txnVersion: TransactionVersion.current(),
    },
    setZkappUri: Permission.signature(),
    editActionState: Permission.signature(),
    setTokenSymbol: Permission.signature(),
    incrementNonce: Permission.signature(),
    setVotingFor: Permission.signature(),
    setTiming: Permission.signature(),
    access: Permission.none(),
  }),

  dummy: (): Permissions => ({
    editState: Permission.none(),
    send: Permission.none(),
    receive: Permission.none(),
    access: Permission.none(),
    setDelegate: Permission.none(),
    setPermissions: Permission.none(),
    setVerificationKey: {
      auth: Permission.signature(),
      txnVersion: TransactionVersion.current(),
    },
    setZkappUri: Permission.none(),
    editActionState: Permission.none(),
    setTokenSymbol: Permission.none(),
    incrementNonce: Permission.none(),
    setVotingFor: Permission.none(),
    setTiming: Permission.none(),
  }),

  allImpossible: (): Permissions => ({
    editState: Permission.impossible(),
    send: Permission.impossible(),
    receive: Permission.impossible(),
    access: Permission.impossible(),
    setDelegate: Permission.impossible(),
    setPermissions: Permission.impossible(),
    setVerificationKey: {
      auth: Permission.signature(),
      txnVersion: TransactionVersion.current(),
    },
    setZkappUri: Permission.impossible(),
    editActionState: Permission.impossible(),
    setTokenSymbol: Permission.impossible(),
    incrementNonce: Permission.impossible(),
    setVotingFor: Permission.impossible(),
    setTiming: Permission.impossible(),
  }),

  fromString: (permission: AuthRequired): Permission => {
    switch (permission) {
      case 'None':
        return Permission.none();
      case 'Either':
        return Permission.proofOrSignature();
      case 'Proof':
        return Permission.proof();
      case 'Signature':
        return Permission.signature();
      case 'Impossible':
        return Permission.impossible();
      default:
        throw Error(
          `Cannot parse invalid permission. ${permission} does not exist.`
        );
    }
  },

  fromJSON: (
    permissions: NonNullable<
      Types.Json.AccountUpdate['body']['update']['permissions']
    >
  ): Permissions => {
    return Object.fromEntries(
      Object.entries(permissions).map(([k, v]) => [
        k,
        Permissions.fromString(typeof v === 'string' ? v : v.auth),
      ])
    ) as unknown as Permissions;
  },
};

// TODO: get docstrings from OCaml and delete this interface

/**
 * The body of describing how some [[ AccountUpdate ]] should change.
 */
interface Body extends AccountUpdateBody {
  /**
   * The address for this body.
   */
  publicKey: PublicKey;

  /**
   * Specify {@link Update}s to tweakable pieces of the account record backing
   * this address in the ledger.
   */
  update: Update;

  /**
   * The TokenId for this account.
   */
  tokenId: Field;

  /**
   * By what {@link Int64} should the balance of this account change. All
   * balanceChanges must balance by the end of smart contract execution.
   */
  balanceChange: { magnitude: UInt64; sgn: Sign };

  /**
   * Recent events that have been emitted from this account.
   * Events can be collected by archive nodes.
   *
   * [Check out our documentation about
   * Events!](https://docs.minaprotocol.com/zkapps/advanced-o1js/events)
   */
  events: Events;
  /**
   * Recent {@link Action}s emitted from this account.
   * Actions can be collected by archive nodes and used in combination with
   * a {@link Reducer}.
   *
   * [Check out our documentation about
   * Actions!](https://docs.minaprotocol.com/zkapps/advanced-o1js/actions-and-reducer)
   */
  actions: Events;
  /**
   * The type of call.
   */
  mayUseToken: MayUseToken;
  callData: Field;
  callDepth: number;
  /**
   * A list of {@link Preconditions} that need to be fulfilled in order for
   * the {@link AccountUpdate} to be valid.
   */
  preconditions: Preconditions;
  /**
   * Defines if a full commitment is required for this transaction.
   */
  useFullCommitment: Bool;
  /**
   * Defines if the fee for creating this account should be paid out of this
   * account's balance change.
   *
   * This must only be true if the balance change is larger than the account
   * creation fee and the token ID is the default.
   */
  implicitAccountCreationFee: Bool;
  /**
   * Defines if the nonce should be incremented with this {@link AccountUpdate}.
   */
  incrementNonce: Bool;
  /**
   * Defines the type of authorization that is needed for this {@link
   * AccountUpdate}.
   *
   * A authorization can be one of three types: None, Proof or Signature
   */
  authorizationKind: AccountUpdateBody['authorizationKind'];
}
const Body = {
  /**
   * A body that doesn't change the underlying account record
   */
  keepAll(
    publicKey: PublicKey,
    tokenId?: Field,
    mayUseToken?: MayUseToken
  ): Body {
    let { body } = Types.AccountUpdate.empty();
    body.publicKey = publicKey;
    if (tokenId) {
      body.tokenId = tokenId;
      body.mayUseToken = Provable.if(
        tokenId.equals(TokenId.default),
        AccountUpdate.MayUseToken.type,
        AccountUpdate.MayUseToken.No,
        AccountUpdate.MayUseToken.ParentsOwnToken
      );
    }
    if (mayUseToken) {
      body.mayUseToken = mayUseToken;
    }
    return body;
  },

  dummy(): Body {
    return Types.AccountUpdate.empty().body;
  },
};

type FeePayer = Types.ZkappCommand['feePayer'];
type FeePayerBody = FeePayer['body'];
const FeePayerBody = {
  keepAll(publicKey: PublicKey, nonce: UInt32): FeePayerBody {
    return {
      publicKey,
      nonce,
      fee: UInt64.zero,
      validUntil: undefined,
    };
  },
};
type FeePayerUnsigned = FeePayer & {
  lazyAuthorization?: LazySignature | undefined;
};

type Control = Types.AccountUpdate['authorization'];
type LazyNone = {
  kind: 'lazy-none';
};
type LazySignature = {
  kind: 'lazy-signature';
  privateKey?: PrivateKey;
};
type LazyProof = {
  kind: 'lazy-proof';
  methodName: string;
  args: any[];
  previousProofs: Pickles.Proof[];
  ZkappClass: typeof SmartContract;
  memoized: { fields: Field[]; aux: any[] }[];
  blindingValue: Field;
};

const AccountId = provable({ tokenOwner: PublicKey, parentTokenId: Field });

const TokenId = {
  ...Types.TokenId,
  ...Base58TokenId,
  get default() {
    return Field(1);
  },
  derive(tokenOwner: PublicKey, parentTokenId = Field(1)): Field {
    let input = AccountId.toInput({ tokenOwner, parentTokenId });
    return hashWithPrefix(prefixes.deriveTokenId, packToFields(input));
  },
};

/**
 * @deprecated use `TokenId` instead of `Token.Id` and `TokenId.derive()` instead of `Token.getId()`
 */
class Token {
  static Id = TokenId;

  static getId(tokenOwner: PublicKey, parentTokenId = TokenId.default) {
    return TokenId.derive(tokenOwner, parentTokenId);
  }

  readonly id: Field;
  readonly parentTokenId: Field;
  readonly tokenOwner: PublicKey;
  constructor({
    tokenOwner,
    parentTokenId = TokenId.default,
  }: {
    tokenOwner: PublicKey;
    parentTokenId?: Field;
  }) {
    this.parentTokenId = parentTokenId;
    this.tokenOwner = tokenOwner;
    try {
      this.id = TokenId.derive(tokenOwner, parentTokenId);
    } catch (e) {
      throw new Error(
        `Could not create a custom token id:\nError: ${(e as Error).message}`
      );
    }
  }
}

/**
 * An {@link AccountUpdate} is a set of instructions for the Mina network.
 * It includes {@link Preconditions} and a list of state updates, which need to
 * be authorized by either a {@link Signature} or {@link Proof}.
 */
class AccountUpdate implements Types.AccountUpdate {
  id: number;
  /**
   * A human-readable label for the account update, indicating how that update
   * was created. Can be modified by applications to add richer information.
   */
  label: string = '';
  body: Body;
  authorization: Control;
  lazyAuthorization: LazySignature | LazyProof | LazyNone | undefined =
    undefined;
  account: Account;
  network: Network;
  currentSlot: CurrentSlot;

  private isSelf: boolean;

  static Actions = Actions;

  constructor(body: Body, authorization?: Control);
  constructor(body: Body, authorization: Control = {}, isSelf = false) {
    this.id = Math.random();
    this.body = body;
    this.authorization = authorization;
    let { account, network, currentSlot } = preconditions(this, isSelf);
    this.account = account;
    this.network = network;
    this.currentSlot = currentSlot;
    this.isSelf = isSelf;
  }

  /**
   * Clones the {@link AccountUpdate}.
   */
  static clone(accountUpdate: AccountUpdate) {
    let body = cloneCircuitValue(accountUpdate.body);
    let authorization = cloneCircuitValue(accountUpdate.authorization);
    let cloned: AccountUpdate = new (AccountUpdate as any)(
      body,
      authorization,
      accountUpdate.isSelf
    );
    cloned.lazyAuthorization = accountUpdate.lazyAuthorization;
    cloned.id = accountUpdate.id;
    cloned.label = accountUpdate.label;
    return cloned;
  }

  token() {
    let thisAccountUpdate = this;
    let tokenOwner = this.publicKey;
    let parentTokenId = this.tokenId;
    let id = TokenId.derive(tokenOwner, parentTokenId);

    function getApprovedAccountUpdate(
      accountLike: PublicKey | AccountUpdate | SmartContract,
      label: string
    ) {
      if (isSmartContract(accountLike)) {
        accountLike = accountLike.self;
      }
      if (accountLike instanceof AccountUpdate) {
        accountLike.tokenId.assertEquals(id);
        thisAccountUpdate.approve(accountLike);
      }
      if (accountLike instanceof PublicKey) {
        accountLike = AccountUpdate.defaultAccountUpdate(accountLike, id);
        thisAccountUpdate.approve(accountLike);
      }
      if (!accountLike.label)
        accountLike.label = `${
          thisAccountUpdate.label ?? 'Unlabeled'
        }.${label}`;
      return accountLike;
    }

    return {
      id,
      parentTokenId,
      tokenOwner,

      /**
       * Mints token balance to `address`. Returns the mint account update.
       */
      mint({
        address,
        amount,
      }: {
        address: PublicKey | AccountUpdate | SmartContract;
        amount: number | bigint | UInt64;
      }) {
        let receiver = getApprovedAccountUpdate(address, 'token.mint()');
        receiver.balance.addInPlace(amount);
        return receiver;
      },

      /**
       * Burn token balance on `address`. Returns the burn account update.
       */
      burn({
        address,
        amount,
      }: {
        address: PublicKey | AccountUpdate | SmartContract;
        amount: number | bigint | UInt64;
      }) {
        let sender = getApprovedAccountUpdate(address, 'token.burn()');

        // Sub the amount to burn from the sender's account
        sender.balance.subInPlace(amount);

        // Require signature from the sender account being deducted
        sender.body.useFullCommitment = Bool(true);
        Authorization.setLazySignature(sender);
        return sender;
      },

      /**
       * Move token balance from `from` to `to`. Returns the `to` account update.
       */
      send({
        from,
        to,
        amount,
      }: {
        from: PublicKey | AccountUpdate | SmartContract;
        to: PublicKey | AccountUpdate | SmartContract;
        amount: number | bigint | UInt64;
      }) {
        let sender = getApprovedAccountUpdate(from, 'token.send() (sender)');
        sender.balance.subInPlace(amount);
        sender.body.useFullCommitment = Bool(true);
        Authorization.setLazySignature(sender);

        let receiver = getApprovedAccountUpdate(to, 'token.send() (receiver)');
        receiver.balance.addInPlace(amount);

        return receiver;
      },
    };
  }

  get tokenId() {
    return this.body.tokenId;
  }

  /**
   * @deprecated use `this.account.tokenSymbol`
   */
  get tokenSymbol() {
    let accountUpdate = this;

    return {
      set(tokenSymbol: string) {
        accountUpdate.account.tokenSymbol.set(tokenSymbol);
      },
    };
  }

  send({
    to,
    amount,
  }: {
    to: PublicKey | AccountUpdate | SmartContract;
    amount: number | bigint | UInt64;
  }) {
    let receiver: AccountUpdate;
    if (to instanceof AccountUpdate) {
      receiver = to;
      receiver.body.tokenId.assertEquals(this.body.tokenId);
    } else if (isSmartContract(to)) {
      receiver = to.self;
      receiver.body.tokenId.assertEquals(this.body.tokenId);
    } else {
      receiver = AccountUpdate.defaultAccountUpdate(to, this.body.tokenId);
      receiver.label = `${this.label ?? 'Unlabeled'}.send()`;
      this.approve(receiver);
    }

    // Sub the amount from the sender's account
    this.body.balanceChange = Int64.fromObject(this.body.balanceChange).sub(
      amount
    );
    // Add the amount to the receiver's account
    receiver.body.balanceChange = Int64.fromObject(
      receiver.body.balanceChange
    ).add(amount);
    return receiver;
  }

  /**
   * Makes an {@link AccountUpdate} a child of this and approves it.
   */
  approve(childUpdate: AccountUpdate) {
    makeChildAccountUpdate(this, childUpdate);
    accountUpdates()?.pushChild(this, childUpdate);
  }

  get balance() {
    let accountUpdate = this;

    return {
      addInPlace(x: Int64 | UInt32 | UInt64 | string | number | bigint) {
        let { magnitude, sgn } = accountUpdate.body.balanceChange;
        accountUpdate.body.balanceChange = new Int64(magnitude, sgn).add(x);
      },
      subInPlace(x: Int64 | UInt32 | UInt64 | string | number | bigint) {
        let { magnitude, sgn } = accountUpdate.body.balanceChange;
        accountUpdate.body.balanceChange = new Int64(magnitude, sgn).sub(x);
      },
    };
  }

  get balanceChange() {
    return Int64.fromObject(this.body.balanceChange);
  }
  set balanceChange(x: Int64) {
    this.body.balanceChange = x;
  }

  get update(): Update {
    return this.body.update;
  }

  static setValue<T>(maybeValue: SetOrKeep<T>, value: T) {
    maybeValue.isSome = Bool(true);
    maybeValue.value = value;
  }

  /**
   * Constrain a property to lie between lower and upper bounds.
   *
   * @param property The property to constrain
   * @param lower The lower bound
   * @param upper The upper bound
   *
   * Example: To constrain the account balance of a SmartContract to lie between
   * 0 and 20 MINA, you can use
   *
   * ```ts
   * \@method onlyRunsWhenBalanceIsLow() {
   *   let lower = UInt64.zero;
   *   let upper = UInt64.from(20e9);
   *   AccountUpdate.assertBetween(this.self.body.preconditions.account.balance, lower, upper);
   *   // ...
   * }
   * ```
   */
  static assertBetween<T>(
    property: OrIgnore<ClosedInterval<T>>,
    lower: T,
    upper: T
  ) {
    property.isSome = Bool(true);
    property.value.lower = lower;
    property.value.upper = upper;
  }

  // TODO: assertGreaterThan, assertLowerThan?

  /**
   * Fix a property to a certain value.
   *
   * @param property The property to constrain
   * @param value The value it is fixed to
   *
   * Example: To fix the account nonce of a SmartContract to 0, you can use
   *
   * ```ts
   * \@method onlyRunsWhenNonceIsZero() {
   *   AccountUpdate.assertEquals(this.self.body.preconditions.account.nonce, UInt32.zero);
   *   // ...
   * }
   * ```
   */
  static assertEquals<T extends object>(
    property: OrIgnore<ClosedInterval<T> | T>,
    value: T
  ) {
    property.isSome = Bool(true);
    if ('lower' in property.value && 'upper' in property.value) {
      property.value.lower = value;
      property.value.upper = value;
    } else {
      property.value = value;
    }
  }

  get publicKey(): PublicKey {
    return this.body.publicKey;
  }

  /**
   * Use this command if this account update should be signed by the account
   * owner, instead of not having any authorization.
   *
   * If you use this and are not relying on a wallet to sign your transaction,
   * then you should use the following code before sending your transaction:
   *
   * ```ts
   * let tx = Mina.transaction(...); // create transaction as usual, using `requireSignature()` somewhere
   * tx.sign([privateKey]); // pass the private key of this account to `sign()`!
   * ```
   *
   * Note that an account's {@link Permissions} determine which updates have to
   * be (can be) authorized by a signature.
   */
  requireSignature() {
    this.sign();
  }
  /**
   * @deprecated `.sign()` is deprecated in favor of `.requireSignature()`
   */
  sign(privateKey?: PrivateKey) {
    let { nonce, isSameAsFeePayer } = AccountUpdate.getSigningInfo(this);
    // if this account is the same as the fee payer, we use the "full commitment" for replay protection
    this.body.useFullCommitment = isSameAsFeePayer;
    this.body.implicitAccountCreationFee = Bool(false);
    // otherwise, we increment the nonce
    let doIncrementNonce = isSameAsFeePayer.not();
    this.body.incrementNonce = doIncrementNonce;
    // in this case, we also have to set a nonce precondition
    let lower = Provable.if(doIncrementNonce, UInt32, nonce, UInt32.zero);
    let upper = Provable.if(doIncrementNonce, UInt32, nonce, UInt32.MAXINT());
    this.body.preconditions.account.nonce.isSome = doIncrementNonce;
    this.body.preconditions.account.nonce.value.lower = lower;
    this.body.preconditions.account.nonce.value.upper = upper;
    // set lazy signature
    Authorization.setLazySignature(this, { privateKey });
  }

  static signFeePayerInPlace(
    feePayer: FeePayerUnsigned,
    privateKey?: PrivateKey
  ) {
    feePayer.body.nonce = this.getNonce(feePayer);
    feePayer.authorization = dummySignature();
    feePayer.lazyAuthorization = { kind: 'lazy-signature', privateKey };
  }

  static getNonce(accountUpdate: AccountUpdate | FeePayerUnsigned) {
    return AccountUpdate.getSigningInfo(accountUpdate).nonce;
  }

  private static signingInfo = provable({
    isSameAsFeePayer: Bool,
    nonce: UInt32,
  });

  private static getSigningInfo(
    accountUpdate: AccountUpdate | FeePayerUnsigned
  ) {
    return memoizeWitness(AccountUpdate.signingInfo, () =>
      AccountUpdate.getSigningInfoUnchecked(accountUpdate)
    );
  }

  private static getSigningInfoUnchecked(
    update: AccountUpdate | FeePayerUnsigned
  ) {
    let publicKey = update.body.publicKey;
    let tokenId =
      update instanceof AccountUpdate ? update.body.tokenId : TokenId.default;
    let nonce = Number(getAccountPreconditions(update.body).nonce.toString());
    // if the fee payer is the same account update as this one, we have to start
    // the nonce predicate at one higher, bc the fee payer already increases its
    // nonce
    let isFeePayer = currentTransaction()?.sender?.equals(publicKey);
    let isSameAsFeePayer = !!isFeePayer
      ?.and(tokenId.equals(TokenId.default))
      .toBoolean();
    if (isSameAsFeePayer) nonce++;
    // now, we check how often this account update already updated its nonce in
    // this tx, and increase nonce from `getAccount` by that amount
    let layout = currentTransaction.get().layout;
    layout.forEachPredecessor(update as AccountUpdate, (otherUpdate) => {
      let shouldIncreaseNonce = otherUpdate.publicKey
        .equals(publicKey)
        .and(otherUpdate.tokenId.equals(tokenId))
        .and(otherUpdate.body.incrementNonce);
      if (shouldIncreaseNonce.toBoolean()) nonce++;
    });
    return {
      nonce: UInt32.from(nonce),
      isSameAsFeePayer: Bool(isSameAsFeePayer),
    };
  }

  toJSON() {
    return Types.AccountUpdate.toJSON(this);
  }
  static toJSON(a: AccountUpdate) {
    return Types.AccountUpdate.toJSON(a);
  }
  static fromJSON(json: Types.Json.AccountUpdate) {
    let accountUpdate = Types.AccountUpdate.fromJSON(json);
    return new AccountUpdate(accountUpdate.body, accountUpdate.authorization);
  }

  hash(): Field {
    // these two ways of hashing are (and have to be) consistent / produce the same hash
    // TODO: there's no reason anymore to use two different hashing methods here!
    // -- the "inCheckedComputation" branch works in all circumstances now
    // we just leave this here for a couple more weeks, because it checks
    // consistency between JS & OCaml hashing on *every single account update
    // proof* we create. It will give us 100% confidence that the two
    // implementations are equivalent, and catch regressions quickly
    if (Provable.inCheckedComputation()) {
      let input = Types.AccountUpdate.toInput(this);
      return hashWithPrefix(prefixes.body, packToFields(input));
    } else {
      let json = Types.AccountUpdate.toJSON(this);
      return Field(Test.hashFromJson.accountUpdate(JSON.stringify(json)));
    }
  }

  toPublicInput({
    accountUpdates,
  }: {
    accountUpdates: AccountUpdate[];
  }): ZkappPublicInput {
    let accountUpdate = this.hash();

    // collect this update's descendants
    let descendants: AccountUpdate[] = [];
    let callDepth = this.body.callDepth;
    let i = accountUpdates.findIndex((a) => a.id === this.id);
    assert(i !== -1, 'Account update not found in transaction');
    for (i++; i < accountUpdates.length; i++) {
      let update = accountUpdates[i];
      if (update.body.callDepth <= callDepth) break;
      descendants.push(update);
    }

    // call forest hash
    let forest = accountUpdatesToCallForest(descendants, callDepth + 1);
    let calls = callForestHashGeneric(
      forest,
      (a) => a.hash(),
      Poseidon.hashWithPrefix,
      emptyHash
    );
    return { accountUpdate, calls };
  }

  toPrettyLayout() {
    let node = accountUpdates()?.get(this);
    assert(node !== undefined, 'AccountUpdate not found in layout');
    node.calls.print();
  }

  static defaultAccountUpdate(address: PublicKey, tokenId?: Field) {
    return new AccountUpdate(Body.keepAll(address, tokenId));
  }
  static dummy() {
    let dummy = new AccountUpdate(Body.dummy());
    dummy.label = 'Dummy';
    return dummy;
  }
  isDummy() {
    return this.body.publicKey.isEmpty();
  }

  static defaultFeePayer(address: PublicKey, nonce: UInt32): FeePayerUnsigned {
    let body = FeePayerBody.keepAll(address, nonce);
    return {
      body,
      authorization: dummySignature(),
      lazyAuthorization: { kind: 'lazy-signature' },
    };
  }

  static dummyFeePayer(): FeePayerUnsigned {
    let body = FeePayerBody.keepAll(PublicKey.empty(), UInt32.zero);
    return { body, authorization: dummySignature() };
  }

  /**
   * Creates an account update. If this is inside a transaction, the account
   * update becomes part of the transaction. If this is inside a smart contract
   * method, the account update will not only become part of the transaction,
   * but also becomes available for the smart contract to modify, in a way that
   * becomes part of the proof.
   */
  static create(publicKey: PublicKey, tokenId?: Field) {
    let accountUpdate = AccountUpdate.defaultAccountUpdate(publicKey, tokenId);
    let insideContract = smartContractContext.get();
    if (insideContract) {
      let self = insideContract.this.self;
      self.approve(accountUpdate);
      accountUpdate.label = `${
        self.label || 'Unlabeled'
      } > AccountUpdate.create()`;
    } else {
      currentTransaction()?.layout.pushTopLevel(accountUpdate);
      accountUpdate.label = `Mina.transaction() > AccountUpdate.create()`;
    }
    return accountUpdate;
  }
  /**
   * Attach account update to the current transaction
   * -- if in a smart contract, to its children
   */
  static attachToTransaction(accountUpdate: AccountUpdate) {
    let insideContract = smartContractContext.get();
    if (insideContract) {
      let selfUpdate = insideContract.this.self;
      // avoid redundant attaching & cycle in account update structure, happens
      // when calling attachToTransaction(this.self) inside a @method
      // TODO avoid account update cycles more generally
      if (selfUpdate === accountUpdate) return;
      insideContract.this.self.approve(accountUpdate);
    } else {
      if (!currentTransaction.has()) return;
      currentTransaction.get().layout.pushTopLevel(accountUpdate);
    }
  }
  /**
   * Disattach an account update from where it's currently located in the transaction
   */
  static unlink(accountUpdate: AccountUpdate) {
    accountUpdates()?.disattach(accountUpdate);
  }

  /**
   * Creates an account update, like {@link AccountUpdate.create}, but also
   * makes sure this account update will be authorized with a signature.
   *
   * If you use this and are not relying on a wallet to sign your transaction,
   * then you should use the following code before sending your transaction:
   *
   * ```ts
   * let tx = Mina.transaction(...); // create transaction as usual, using `createSigned()` somewhere
   * tx.sign([privateKey]); // pass the private key of this account to `sign()`!
   * ```
   *
   * Note that an account's {@link Permissions} determine which updates have to
   * be (can be) authorized by a signature.
   */
  static createSigned(signer: PublicKey, tokenId?: Field): AccountUpdate;
  /**
   * @deprecated in favor of calling this function with a `PublicKey` as `signer`
   */
  static createSigned(signer: PrivateKey, tokenId?: Field): AccountUpdate;
  static createSigned(signer: PrivateKey | PublicKey, tokenId?: Field) {
    let publicKey =
      signer instanceof PrivateKey ? signer.toPublicKey() : signer;
    let accountUpdate = AccountUpdate.create(publicKey, tokenId);
    accountUpdate.label = accountUpdate.label.replace(
      '.create()',
      '.createSigned()'
    );
    if (signer instanceof PrivateKey) {
      accountUpdate.sign(signer);
    } else {
      accountUpdate.requireSignature();
    }
    return accountUpdate;
  }

  /**
   * Use this method to pay the account creation fee for another account (or, multiple accounts using the optional second argument).
   *
   * Beware that you _don't_ need to specify the account that is created!
   * Instead, the protocol will automatically identify that accounts need to be created,
   * and require that the net balance change of the transaction covers the account creation fee.
   *
   * @param feePayer the address of the account that pays the fee
   * @param numberOfAccounts the number of new accounts to fund (default: 1)
   * @returns they {@link AccountUpdate} for the account which pays the fee
   */
  static fundNewAccount(
    feePayer: PublicKey,
    numberOfAccounts?: number
  ): AccountUpdate;
  /**
   * @deprecated Call this function with a `PublicKey` as `feePayer`, and remove the `initialBalance` option.
   * To send an initial balance to the new account, you can use the returned account update:
   * ```
   * let feePayerUpdate = AccountUpdate.fundNewAccount(feePayer);
   * feePayerUpdate.send({ to: receiverAddress, amount: initialBalance });
   * ```
   */
  static fundNewAccount(
    feePayer: PrivateKey | PublicKey,
    options?: { initialBalance: number | string | UInt64 } | number
  ): AccountUpdate;
  static fundNewAccount(
    feePayer: PrivateKey | PublicKey,
    numberOfAccounts?: number | { initialBalance: number | string | UInt64 }
  ) {
    let accountUpdate = AccountUpdate.createSigned(feePayer as PrivateKey);
    accountUpdate.label = 'AccountUpdate.fundNewAccount()';
    let fee = activeInstance.getNetworkConstants().accountCreationFee;
    numberOfAccounts ??= 1;
    if (typeof numberOfAccounts === 'number') fee = fee.mul(numberOfAccounts);
    else fee = fee.add(UInt64.from(numberOfAccounts.initialBalance ?? 0));
    accountUpdate.balance.subInPlace(fee);
    return accountUpdate;
  }

  // static methods that implement Provable<AccountUpdate>
  static sizeInFields = Types.AccountUpdate.sizeInFields;
  static toFields = Types.AccountUpdate.toFields;
  static toAuxiliary(a?: AccountUpdate) {
    let aux = Types.AccountUpdate.toAuxiliary(a);
    let lazyAuthorization = a && a.lazyAuthorization;
    let id = a?.id ?? Math.random();
    let label = a?.label ?? '';
    return [{ lazyAuthorization, id, label }, aux];
  }
  static toInput = Types.AccountUpdate.toInput;
  static empty() {
    return AccountUpdate.dummy();
  }
  static check = Types.AccountUpdate.check;
  static fromFields(fields: Field[], [other, aux]: any[]): AccountUpdate {
    let accountUpdate = Types.AccountUpdate.fromFields(fields, aux);
    return Object.assign(
      new AccountUpdate(accountUpdate.body, accountUpdate.authorization),
      other
    );
  }

  static witness<T>(
    type: FlexibleProvable<T>,
    compute: () => { accountUpdate: AccountUpdate; result: T },
    { skipCheck = false } = {}
  ) {
    // construct the circuit type for a accountUpdate + other result
    let accountUpdateType = skipCheck
      ? { ...provable(AccountUpdate), check() {} }
      : AccountUpdate;
    let combinedType = provable({
      accountUpdate: accountUpdateType,
      result: type as any,
    });
    return Provable.witness(combinedType, compute);
  }

  static get MayUseToken() {
    return {
      type: provablePure({ parentsOwnToken: Bool, inheritFromParent: Bool }),
      No: { parentsOwnToken: Bool(false), inheritFromParent: Bool(false) },
      ParentsOwnToken: {
        parentsOwnToken: Bool(true),
        inheritFromParent: Bool(false),
      },
      InheritFromParent: {
        parentsOwnToken: Bool(false),
        inheritFromParent: Bool(true),
      },
      isNo({
        body: {
          mayUseToken: { parentsOwnToken, inheritFromParent },
        },
      }: AccountUpdate) {
        return parentsOwnToken.or(inheritFromParent).not();
      },
      isParentsOwnToken(a: AccountUpdate) {
        return a.body.mayUseToken.parentsOwnToken;
      },
      isInheritFromParent(a: AccountUpdate) {
        return a.body.mayUseToken.inheritFromParent;
      },
    };
  }

  /**
   * Returns a JSON representation of only the fields that differ from the
   * default {@link AccountUpdate}.
   */
  toPretty() {
    function short(s: string) {
      return '..' + s.slice(-4);
    }
    let jsonUpdate: Partial<Types.Json.AccountUpdate> = toJSONEssential(
      jsLayout.AccountUpdate as any,
      this
    );
    let body: Partial<Types.Json.AccountUpdate['body']> =
      jsonUpdate.body as any;
    delete body.callData;
    body.publicKey = short(body.publicKey!);
    if (body.balanceChange?.magnitude === '0') delete body.balanceChange;
    if (body.tokenId === TokenId.toBase58(TokenId.default)) {
      delete body.tokenId;
    } else {
      body.tokenId = short(body.tokenId!);
    }
    if (body.callDepth === 0) delete body.callDepth;
    if (body.incrementNonce === false) delete body.incrementNonce;
    if (body.useFullCommitment === false) delete body.useFullCommitment;
    if (body.implicitAccountCreationFee === false)
      delete body.implicitAccountCreationFee;
    if (body.events?.length === 0) delete body.events;
    if (body.actions?.length === 0) delete body.actions;
    if (body.preconditions?.account) {
      body.preconditions.account = JSON.stringify(
        body.preconditions.account
      ) as any;
    }
    if (body.preconditions?.network) {
      body.preconditions.network = JSON.stringify(
        body.preconditions.network
      ) as any;
    }
    if (body.preconditions?.validWhile) {
      body.preconditions.validWhile = JSON.stringify(
        body.preconditions.validWhile
      ) as any;
    }
    if (jsonUpdate.authorization?.proof) {
      jsonUpdate.authorization.proof = short(jsonUpdate.authorization.proof);
    }
    if (jsonUpdate.authorization?.signature) {
      jsonUpdate.authorization.signature = short(
        jsonUpdate.authorization.signature
      );
    }
    if (body.update?.verificationKey) {
      body.update.verificationKey = JSON.stringify({
        data: short(body.update.verificationKey.data),
        hash: short(body.update.verificationKey.hash),
      }) as any;
    }
    for (let key of ['permissions', 'appState', 'timing'] as const) {
      if (body.update?.[key]) {
        body.update[key] = JSON.stringify(body.update[key]) as any;
      }
    }
    for (let key of ['events', 'actions'] as const) {
      if (body[key]) {
        body[key] = JSON.stringify(body[key]) as any;
      }
    }
    if (body.authorizationKind?.isProved === false) {
      delete (body as any).authorizationKind?.verificationKeyHash;
    }
    if (
      body.authorizationKind?.isProved === false &&
      body.authorizationKind?.isSigned === false
    ) {
      delete (body as any).authorizationKind;
    }
    if (
      jsonUpdate.authorization !== undefined ||
      body.authorizationKind?.isProved === true ||
      body.authorizationKind?.isSigned === true
    ) {
      (body as any).authorization = jsonUpdate.authorization;
    }

    body.mayUseToken = {
      parentsOwnToken: this.body.mayUseToken.parentsOwnToken.toBoolean(),
      inheritFromParent: this.body.mayUseToken.inheritFromParent.toBoolean(),
    };
    let pretty: any = { ...body };
    let withId = false;
    if (withId) pretty = { id: Math.floor(this.id * 1000), ...pretty };
    if (this.label) pretty = { label: this.label, ...pretty };
    return pretty;
  }
}

// call forest stuff

function hashAccountUpdate(update: AccountUpdate) {
  return genericHash(AccountUpdate, prefixes.body, update);
}

class HashedAccountUpdate extends Hashed.create(
  AccountUpdate,
  hashAccountUpdate
) {}

type AccountUpdateTree = {
  accountUpdate: Hashed<AccountUpdate>;
  calls: MerkleListBase<AccountUpdateTree>;
};
const AccountUpdateTree: ProvableHashable<AccountUpdateTree> = Struct({
  accountUpdate: HashedAccountUpdate.provable,
  calls: MerkleListBase<AccountUpdateTree>(),
});

/**
 * Class which represents a forest (list of trees) of account updates,
 * in a compressed way which allows iterating and selectively witnessing the account updates.
 *
 * The (recursive) type signature is:
 * ```
 * type AccountUpdateForest = MerkleList<AccountUpdateTree>;
 * type AccountUpdateTree = {
 *   accountUpdate: Hashed<AccountUpdate>;
 *   calls: AccountUpdateForest;
 * };
 * ```
 */
class AccountUpdateForest extends MerkleList.create(
  AccountUpdateTree,
  merkleListHash
) {
  static fromFlatArray(updates: AccountUpdate[]): AccountUpdateForest {
    let simpleForest = accountUpdatesToCallForest(updates);
    return this.fromSimpleForest(simpleForest);
  }

  private static fromSimpleForest(
    simpleForest: CallForest<AccountUpdate>
  ): AccountUpdateForest {
    let nodes = simpleForest.map((node) => {
      let accountUpdate = HashedAccountUpdate.hash(node.accountUpdate);
      let calls = AccountUpdateForest.fromSimpleForest(node.children);
      return { accountUpdate, calls };
    });
    return AccountUpdateForest.from(nodes);
  }

  // TODO this comes from paranoia and might be removed later
  static assertConstant(forest: MerkleListBase<AccountUpdateTree>) {
    Provable.asProver(() => {
      forest.data.get().forEach(({ element: tree }) => {
        assert(
          Provable.isConstant(AccountUpdate, tree.accountUpdate.value.get()),
          'account update not constant'
        );
        AccountUpdateForest.assertConstant(tree.calls);
      });
    });
  }
}

// how to hash a forest

function merkleListHash(forestHash: Field, tree: AccountUpdateTree) {
  return hashCons(forestHash, hashNode(tree));
}

function hashNode(tree: AccountUpdateTree) {
  return Poseidon.hashWithPrefix(prefixes.accountUpdateNode, [
    tree.accountUpdate.hash,
    tree.calls.hash,
  ]);
}
function hashCons(forestHash: Field, nodeHash: Field) {
  return Poseidon.hashWithPrefix(prefixes.accountUpdateCons, [
    nodeHash,
    forestHash,
  ]);
}

/**
 * Structure for constructing the forest of child account updates, from a circuit.
 *
 * The circuit can mutate account updates and change their array of children, so here we can't hash
 * everything immediately. Instead, we maintain a structure consisting of either hashes or full account
 * updates that can be hashed into a final call forest at the end.
 */
type UnfinishedForestBase = HashOrValue<UnfinishedTree[]>;
type UnfinishedForestPlain = UnfinishedForestCommon &
  PlainValue<UnfinishedTree[]>;
type UnfinishedForestHashed = UnfinishedForestCommon &
  UseHash<UnfinishedTree[]>;

type UnfinishedTree = {
  accountUpdate: HashOrValue<AccountUpdate>;
  isDummy: Bool;
  // `children` must be readonly since it's referenced in each child's siblings
  readonly calls: UnfinishedForestCommon;
  siblings?: UnfinishedForestCommon;
};
type UseHash<T> = { hash: Field; value: T };
type PlainValue<T> = { hash?: undefined; value: T };
type HashOrValue<T> = { hash?: Field; value: T };

class UnfinishedForestCommon {
  hash?: Field;
  private value: UnfinishedTree[]; // TODO: make private

  usesHash(): this is { hash: Field } & UnfinishedForestCommon {
    return this.hash !== undefined;
  }
  mutable(): this is UnfinishedForest {
    return this instanceof UnfinishedForest && this.hash === undefined;
  }

  constructor(value: UnfinishedTree[], hash?: Field) {
    this.value = value;
    this.hash = hash;
  }

  setHash(hash: Field): UnfinishedForestHashed {
    this.hash = hash;
    return this as any; // TODO?
  }

  witnessHash(): UnfinishedForestHashed {
    let hash = Provable.witness(Field, () => this.finalize().hash);
    return this.setHash(hash);
  }

  static fromForest(
    forest: MerkleListBase<AccountUpdateTree>,
    recursiveCall = false
  ): UnfinishedForestCommon {
    let unfinished = UnfinishedForest.empty();
    Provable.asProver(() => {
      unfinished.value = forest.data.get().map(({ element: tree }) => ({
        accountUpdate: {
          hash: tree.accountUpdate.hash.toConstant(),
          value: tree.accountUpdate.value.get(),
        },
        isDummy: Bool(false),
        calls: UnfinishedForest.fromForest(tree.calls, true),
        siblings: unfinished,
      }));
    });
    if (!recursiveCall) {
      unfinished.setHash(forest.hash);
    }
    return unfinished;
  }

  finalize(): AccountUpdateForest {
    if (this.usesHash()) {
      let data = Unconstrained.witness(() =>
        new UnfinishedForest(this.value).finalize().data.get()
      );
      return new AccountUpdateForest({ hash: this.hash, data });
    }

    // not using the hash means we calculate it in-circuit
    let nodes = this.value.map(toTree);
    let finalForest = AccountUpdateForest.empty();

    for (let { isDummy, ...tree } of [...nodes].reverse()) {
      finalForest.pushIf(isDummy.not(), tree);
    }
    return finalForest;
  }

  print() {
    let indent = 0;
    let layout = '';

    let toPretty = (a: UnfinishedForestCommon) => {
      indent += 2;
      for (let tree of a.value) {
        layout +=
          ' '.repeat(indent) +
          `( ${tree.accountUpdate.value.label || '<no label>'} )` +
          '\n';
        toPretty(tree.calls);
      }
      indent -= 2;
    };

    toPretty(this);
    console.log(layout);
  }

  toFlatList(mutate = true, depth = 0): AccountUpdate[] {
    let flatUpdates: AccountUpdate[] = [];
    for (let node of this.value) {
      if (node.isDummy.toBoolean()) continue;
      let update = node.accountUpdate.value;
      if (mutate) update.body.callDepth = depth;
      let children = node.calls.toFlatList(mutate, depth + 1);
      flatUpdates.push(update, ...children);
    }
    return flatUpdates;
  }

  toConstantInPlace() {
    for (let node of this.value) {
      // `as any` to override readonly - this method is explicit about its mutability
      (node.accountUpdate as any).value = Provable.toConstant(
        AccountUpdate,
        node.accountUpdate.value
      );
      node.isDummy = Provable.toConstant(Bool, node.isDummy);
      if (node.accountUpdate.hash !== undefined) {
        node.accountUpdate.hash = node.accountUpdate.hash.toConstant();
      }
      node.calls.toConstantInPlace();
    }
    if (this.usesHash()) {
      this.hash = this.hash.toConstant();
    }
  }
}

class UnfinishedForest extends UnfinishedForestCommon {
  hash?: undefined;

  static empty() {
    return new UnfinishedForest([]);
  }

  private getValue(): UnfinishedTree[] {
    // don't know how to do this differently, but this perfectly protects our invariant:
    // only mutable forests can be modified
    return (this as any).value;
  }

  push(node: UnfinishedTree) {
    if (node.siblings === this) return;
    assert(
      node.siblings === undefined,
      'Cannot push node that already has a parent.'
    );
    node.siblings = this;
    this.getValue().push(node);
  }

  pushTree(tree: AccountUpdateTree) {
    let value = AccountUpdate.dummy();
    Provable.asProver(() => {
      value = tree.accountUpdate.value.get();
    });
    this.getValue().push({
      accountUpdate: { hash: tree.accountUpdate.hash, value },
      isDummy: Bool(false),
      calls: UnfinishedForest.fromForest(tree.calls),
      siblings: this,
    });
  }

  remove(accountUpdate: AccountUpdate) {
    // find account update by .id
    let index = this.getValue().findIndex(
      (node) => node.accountUpdate.value.id === accountUpdate.id
    );

    // nothing to do if it's not there
    if (index === -1) return;

    // remove it
    this.getValue().splice(index, 1);
  }
}

function toTree(node: UnfinishedTree): AccountUpdateTree & { isDummy: Bool } {
  let accountUpdate =
    node.accountUpdate.hash !== undefined
      ? new HashedAccountUpdate(
          node.accountUpdate.hash,
          Unconstrained.witness(() =>
            Provable.toConstant(AccountUpdate, node.accountUpdate.value)
          )
        )
      : HashedAccountUpdate.hash(node.accountUpdate.value);
  let calls = node.calls.finalize();
  return { accountUpdate, isDummy: node.isDummy, calls };
}

class AccountUpdateLayout {
  readonly map: Map<number, UnfinishedTree>;
  readonly root: UnfinishedTree;
  final?: AccountUpdateForest;

  constructor(root?: AccountUpdate) {
    this.map = new Map();
    root ??= AccountUpdate.dummy();
    let rootTree: UnfinishedTree = {
      accountUpdate: { value: root },
      isDummy: Bool(false),
      calls: UnfinishedForest.empty(),
    };
    this.map.set(root.id, rootTree);
    this.root = rootTree;
  }

  get(update: AccountUpdate) {
    return this.map.get(update.id);
  }

  getOrCreate(update: AccountUpdate | UnfinishedTree): UnfinishedTree {
    if (!(update instanceof AccountUpdate)) {
      if (!this.map.has(update.accountUpdate.value.id)) {
        this.map.set(update.accountUpdate.value.id, update);
      }
      return update;
    }
    let node = this.map.get(update.id);
    if (node !== undefined) return node;
    node = {
      accountUpdate: { value: update },
      isDummy: update.isDummy(),
      calls: UnfinishedForest.empty(),
    };
    this.map.set(update.id, node);
    return node;
  }

  pushChild(parent: AccountUpdate | UnfinishedTree, child: AccountUpdate) {
    let parentNode = this.getOrCreate(parent);
    let childNode = this.getOrCreate(child);
    assert(parentNode.calls.mutable(), 'Cannot push to an immutable layout');
    parentNode.calls.push(childNode);
  }

  pushTopLevel(child: AccountUpdate) {
    this.pushChild(this.root, child);
  }

  setChildren(
    parent: AccountUpdate | UnfinishedTree,
    children: AccountUpdateForest | UnfinishedForestCommon
  ) {
    let parentNode = this.getOrCreate(parent);

    if (children instanceof AccountUpdateForest) {
      children = UnfinishedForest.fromForest(children);
    }
    // we're not allowed to switch parentNode.children, it must stay the same reference
    // so we mutate it in place
    Object.assign(parentNode.calls, children);
  }

  setTopLevel(children: AccountUpdateForest) {
    this.setChildren(this.root, children);
  }

  disattach(update: AccountUpdate) {
    let node = this.get(update);
    if (node?.siblings === undefined) return;
    assert(
      node.siblings.mutable(),
      'Cannot disattach from an immutable layout'
    );
    node.siblings.remove(update);
    node.siblings = undefined;
  }

  finalizeAndRemove(update: AccountUpdate) {
    let node = this.get(update);
    if (node === undefined) return;
    this.disattach(update);
    return node.calls.finalize();
  }

  finalizeChildren() {
    let final = this.root.calls.finalize();
    this.final = final;
    AccountUpdateForest.assertConstant(final);
    return final;
  }

  toFlatList({ mutate }: { mutate: boolean }) {
    return this.root.calls.toFlatList(mutate);
  }

  forEachPredecessor(
    update: AccountUpdate,
    callback: (update: AccountUpdate) => void
  ) {
    let updates = this.toFlatList({ mutate: false });
    for (let otherUpdate of updates) {
      if (otherUpdate.id === update.id) return;
      callback(otherUpdate);
    }
  }

  toConstantInPlace() {
    this.root.calls.toConstantInPlace();
  }
}

function createChildAccountUpdate(
  parent: AccountUpdate,
  childAddress: PublicKey,
  tokenId?: Field
) {
  let child = AccountUpdate.defaultAccountUpdate(childAddress, tokenId);
  makeChildAccountUpdate(parent, child);
  return child;
}
function makeChildAccountUpdate(parent: AccountUpdate, child: AccountUpdate) {
  child.body.callDepth = parent.body.callDepth + 1;
  AccountUpdate.unlink(child);
}

// authorization

type ZkappCommand = {
  feePayer: FeePayerUnsigned;
  accountUpdates: AccountUpdate[];
  memo: string;
};
type ZkappCommandSigned = {
  feePayer: FeePayer;
  accountUpdates: (AccountUpdate & { lazyAuthorization?: LazyProof })[];
  memo: string;
};
type ZkappCommandProved = {
  feePayer: FeePayerUnsigned;
  accountUpdates: (AccountUpdate & { lazyAuthorization?: LazySignature })[];
  memo: string;
};

const ZkappCommand = {
  toPretty(transaction: ZkappCommand) {
    let feePayer = ZkappCommand.toJSON(transaction).feePayer as any;
    feePayer.body.publicKey = '..' + feePayer.body.publicKey.slice(-4);
    feePayer.body.authorization = '..' + feePayer.authorization.slice(-4);
    if (feePayer.body.validUntil === null) delete feePayer.body.validUntil;
    return [
      { label: 'feePayer', ...feePayer.body },
      ...transaction.accountUpdates.map((a) => a.toPretty()),
    ];
  },
  fromJSON(json: Types.Json.ZkappCommand): ZkappCommand {
    let { feePayer } = Types.ZkappCommand.fromJSON({
      feePayer: json.feePayer,
      accountUpdates: [],
      memo: json.memo,
    });
    let memo = Memo.toString(Memo.fromBase58(json.memo));
    let accountUpdates = json.accountUpdates.map(AccountUpdate.fromJSON);
    return { feePayer, accountUpdates, memo };
  },
  toJSON({ feePayer, accountUpdates, memo }: ZkappCommand) {
    memo = Memo.toBase58(Memo.fromString(memo));
    return Types.ZkappCommand.toJSON({ feePayer, accountUpdates, memo });
  },
};

type AccountUpdateProved = AccountUpdate & {
  lazyAuthorization?: LazySignature;
};

const Authorization = {
  hasLazyProof(accountUpdate: AccountUpdate) {
    return accountUpdate.lazyAuthorization?.kind === 'lazy-proof';
  },
  hasAny(accountUpdate: AccountUpdate) {
    let { authorization: auth, lazyAuthorization: lazyAuth } = accountUpdate;
    return !!(lazyAuth || 'proof' in auth || 'signature' in auth);
  },
  setSignature(accountUpdate: AccountUpdate, signature: string) {
    accountUpdate.authorization = { signature };
    accountUpdate.lazyAuthorization = undefined;
  },
  setProof(accountUpdate: AccountUpdate, proof: string): AccountUpdateProved {
    accountUpdate.authorization = { proof };
    accountUpdate.lazyAuthorization = undefined;
    return accountUpdate as AccountUpdateProved;
  },
  setLazySignature(
    accountUpdate: AccountUpdate,
    signature?: Omit<LazySignature, 'kind'>
  ) {
    signature ??= {};
    accountUpdate.body.authorizationKind.isSigned = Bool(true);
    accountUpdate.body.authorizationKind.isProved = Bool(false);
    accountUpdate.body.authorizationKind.verificationKeyHash = Field(
      mocks.dummyVerificationKeyHash
    );
    accountUpdate.authorization = {};
    accountUpdate.lazyAuthorization = { ...signature, kind: 'lazy-signature' };
  },
  setLazyNone(accountUpdate: AccountUpdate) {
    accountUpdate.body.authorizationKind.isSigned = Bool(false);
    accountUpdate.body.authorizationKind.isProved = Bool(false);
    accountUpdate.body.authorizationKind.verificationKeyHash = Field(
      mocks.dummyVerificationKeyHash
    );
    accountUpdate.authorization = {};
    accountUpdate.lazyAuthorization = { kind: 'lazy-none' };
  },
};

function addMissingSignatures(
  zkappCommand: ZkappCommand,
  additionalKeys = [] as PrivateKey[]
): ZkappCommandSigned {
  let additionalPublicKeys = additionalKeys.map((sk) => sk.toPublicKey());
  let { commitment, fullCommitment } = transactionCommitments(
    TypesBigint.ZkappCommand.fromJSON(ZkappCommand.toJSON(zkappCommand))
  );

  function addFeePayerSignature(accountUpdate: FeePayerUnsigned): FeePayer {
    let { body, authorization, lazyAuthorization } =
      cloneCircuitValue(accountUpdate);
    if (lazyAuthorization === undefined) return { body, authorization };
    let { privateKey } = lazyAuthorization;
    if (privateKey === undefined) {
      let i = additionalPublicKeys.findIndex((pk) =>
        pk.equals(accountUpdate.body.publicKey).toBoolean()
      );
      if (i === -1) {
        // private key is missing, but we are not throwing an error here
        // there is a change signature will be added by the wallet
        // if not, error will be thrown by verifyAccountUpdate
        // while .send() execution
        return { body, authorization: dummySignature() };
      }
      privateKey = additionalKeys[i];
    }
    let signature = signFieldElement(
      fullCommitment,
      privateKey.toBigInt(),
      activeInstance.getNetworkId()
    );
    return { body, authorization: Signature.toBase58(signature) };
  }

  function addSignature(accountUpdate: AccountUpdate) {
    accountUpdate = AccountUpdate.clone(accountUpdate);
    if (accountUpdate.lazyAuthorization?.kind !== 'lazy-signature') {
      return accountUpdate as AccountUpdate & { lazyAuthorization?: LazyProof };
    }
    let { privateKey } = accountUpdate.lazyAuthorization;
    if (privateKey === undefined) {
      let i = additionalPublicKeys.findIndex((pk) =>
        pk.equals(accountUpdate.body.publicKey).toBoolean()
      );
      if (i === -1) {
        // private key is missing, but we are not throwing an error here
        // there is a change signature will be added by the wallet
        // if not, error will be thrown by verifyAccountUpdate
        // while .send() execution
        Authorization.setSignature(accountUpdate, dummySignature());
        return accountUpdate as AccountUpdate & {
          lazyAuthorization: undefined;
        };
      }
      privateKey = additionalKeys[i];
    }
    let transactionCommitment = accountUpdate.body.useFullCommitment.toBoolean()
      ? fullCommitment
      : commitment;
    let signature = signFieldElement(
      transactionCommitment,
      privateKey.toBigInt(),
      activeInstance.getNetworkId()
    );
    Authorization.setSignature(accountUpdate, Signature.toBase58(signature));
    return accountUpdate as AccountUpdate & { lazyAuthorization: undefined };
  }
  let { feePayer, accountUpdates, memo } = zkappCommand;
  return {
    feePayer: addFeePayerSignature(feePayer),
    accountUpdates: accountUpdates.map(addSignature),
    memo,
  };
}

function dummySignature() {
  return Signature.toBase58(Signature.dummy());
}

/**
 * The public input for zkApps consists of certain hashes of the proving
 * account update (and its child updates) which is constructed during method execution.
 *
 * For SmartContract proving, a method is run twice: First outside the proof, to
 * obtain the public input, and once in the prover, which takes the public input
 * as input. The current transaction is hashed again inside the prover, which
 * asserts that the result equals the input public input, as part of the snark
 * circuit. The block producer will also hash the transaction they receive and
 * pass it as a public input to the verifier. Thus, the transaction is fully
 * constrained by the proof - the proof couldn't be used to attest to a different
 * transaction.
 */
type ZkappPublicInput = {
  accountUpdate: Field;
  calls: Field;
};
let ZkappPublicInput = provablePure({ accountUpdate: Field, calls: Field });

async function addMissingProofs(
  zkappCommand: ZkappCommand,
  { proofsEnabled = true }
): Promise<{
  zkappCommand: ZkappCommandProved;
  proofs: (Proof<ZkappPublicInput, Empty> | undefined)[];
}> {
  let { feePayer, accountUpdates, memo } = zkappCommand;
  // compute proofs serially. in parallel would clash with our global variable
  // hacks
  let accountUpdatesProved: AccountUpdateProved[] = [];
  let proofs: (Proof<ZkappPublicInput, Empty> | undefined)[] = [];
  for (let i = 0; i < accountUpdates.length; i++) {
    let { accountUpdateProved, proof } = await addProof(
      zkappCommand,
      i,
      proofsEnabled
    );
    accountUpdatesProved.push(accountUpdateProved);
    proofs.push(proof);
  }
  return {
    zkappCommand: { feePayer, accountUpdates: accountUpdatesProved, memo },
    proofs,
  };
}

async function addProof(
  transaction: ZkappCommand,
  index: number,
  proofsEnabled: boolean
) {
  let accountUpdate = transaction.accountUpdates[index];
  accountUpdate = AccountUpdate.clone(accountUpdate);

  if (accountUpdate.lazyAuthorization?.kind !== 'lazy-proof') {
    return {
      accountUpdateProved: accountUpdate as AccountUpdateProved,
      proof: undefined,
    };
  }
  if (!proofsEnabled) {
    Authorization.setProof(accountUpdate, await dummyBase64Proof());
    return {
      accountUpdateProved: accountUpdate as AccountUpdateProved,
      proof: undefined,
    };
  }

  let lazyProof: LazyProof = accountUpdate.lazyAuthorization;
  let prover = getZkappProver(lazyProof);
  let proverData = { transaction, accountUpdate, index };
  let proof = await createZkappProof(prover, lazyProof, proverData);

  let accountUpdateProved = Authorization.setProof(
    accountUpdate,
    Pickles.proofToBase64Transaction(proof.proof)
  );
  return { accountUpdateProved, proof };
}

async function createZkappProof(
  prover: Pickles.Prover,
  {
    methodName,
    args,
    previousProofs,
    ZkappClass,
    memoized,
    blindingValue,
  }: LazyProof,
  { transaction, accountUpdate, index }: ZkappProverData
): Promise<Proof<ZkappPublicInput, Empty>> {
  let publicInput = accountUpdate.toPublicInput(transaction);
  let publicInputFields = MlFieldConstArray.to(
    ZkappPublicInput.toFields(publicInput)
  );

  let [, , proof] = await zkAppProver.run(
    [accountUpdate.publicKey, accountUpdate.tokenId, ...args],
    { transaction, accountUpdate, index },
    async () => {
      let id = memoizationContext.enter({
        memoized,
        currentIndex: 0,
        blindingValue,
      });
      try {
        return await prover(publicInputFields, MlArray.to(previousProofs));
      } catch (err) {
        console.error(`Error when proving ${ZkappClass.name}.${methodName}()`);
        throw err;
      } finally {
        memoizationContext.leave(id);
      }
    }
  );

  let maxProofsVerified = ZkappClass._maxProofsVerified!;
  const Proof = ZkappClass.Proof();
  return new Proof({
    publicInput,
    publicOutput: undefined,
    proof,
    maxProofsVerified,
  });
}

function getZkappProver({ methodName, ZkappClass }: LazyProof) {
  if (ZkappClass._provers === undefined)
    throw Error(
      `Cannot prove execution of ${methodName}(), no prover found. ` +
        `Try calling \`await ${ZkappClass.name}.compile()\` first, this will cache provers in the background.`
    );
  let provers = ZkappClass._provers;
  let methodError =
    `Error when computing proofs: Method ${methodName} not found. ` +
    `Make sure your environment supports decorators, and annotate with \`@method ${methodName}\`.`;
  if (ZkappClass._methods === undefined) throw Error(methodError);
  let i = ZkappClass._methods.findIndex((m) => m.methodName === methodName);
  if (i === -1) throw Error(methodError);
  return provers[i];
}
