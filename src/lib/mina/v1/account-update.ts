import { cloneCircuitValue, FlexibleProvable, StructNoJson } from '../../provable/types/struct.js';
import { provable, provableExtends, provablePure } from '../../provable/types/provable-derivers.js';
import { memoizationContext, memoizeWitness, Provable } from '../../provable/provable.js';
import { Field, Bool } from '../../provable/wrapped.js';
import { Pickles } from '../../../snarky.js';
import { jsLayout } from '../../../bindings/mina-transaction/gen/js-layout.js';
import { Types, toJSONEssential } from '../../../bindings/mina-transaction/types.js';
import { PrivateKey, PublicKey } from '../../provable/crypto/signature.js';
import { UInt64, UInt32, Int64 } from '../../provable/int.js';
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
import { dummyBase64Proof, Empty, Prover } from '../../proof-system/zkprogram.js';
import { Proof } from '../../proof-system/proof.js';
import { Memo } from '../../../mina-signer/src/memo.js';
import {
  Events as BaseEvents,
  Actions as BaseActions,
  MayUseToken as BaseMayUseToken,
} from '../../../bindings/mina-transaction/transaction-leaves.js';
import { TokenId as Base58TokenId } from './base58-encodings.js';
import { hashWithPrefix, packToFields, Poseidon } from '../../provable/crypto/poseidon.js';
import { mocks, prefixes, protocolVersions } from '../../../bindings/crypto/constants.js';
import {
  Signature,
  signFieldElement,
  zkAppBodyPrefix,
} from '../../../mina-signer/src/signature.js';
import { MlFieldConstArray } from '../../ml/fields.js';
import {
  accountUpdatesToCallForest,
  CallForest,
  callForestHashGeneric,
  transactionCommitments,
} from '../../../mina-signer/src/sign-zkapp-command.js';
import { currentTransaction } from './transaction-context.js';
import { isSmartContract } from './smart-contract-base.js';
import { activeInstance } from './mina-instance.js';
import { emptyHash, genericHash, MerkleList, MerkleListBase } from '../../provable/merkle-list.js';
import { Hashed } from '../../provable/packed.js';
import { accountUpdateLayout, smartContractContext } from './smart-contract-context.js';
import { assert } from '../../util/assert.js';
import { RandomId } from '../../provable/types/auxiliary.js';
import { From } from '../../../bindings/lib/provable-generic.js';

// external API
export {
  AccountUpdate,
  Permissions,
  ZkappPublicInput,
  TransactionVersion,
  AccountUpdateForest,
  AccountUpdateTree,
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
  CallForest,
  zkAppProver,
  dummySignature,
  LazyProof,
  AccountUpdateTreeBase,
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

type MayUseToken = BaseMayUseToken;
const MayUseToken = {
  type: BaseMayUseToken,
  No: {
    parentsOwnToken: Bool(false),
    inheritFromParent: Bool(false),
  },
  ParentsOwnToken: {
    parentsOwnToken: Bool(true),
    inheritFromParent: Bool(false),
  },
  InheritFromParent: {
    parentsOwnToken: Bool(false),
    inheritFromParent: Bool(true),
  },
  isNo: ({
    body: {
      mayUseToken: { parentsOwnToken, inheritFromParent },
    },
  }: AccountUpdate) => parentsOwnToken.or(inheritFromParent).not(),
  isParentsOwnToken: (a: AccountUpdate) => a.body.mayUseToken.parentsOwnToken,
  isInheritFromParent: (a: AccountUpdate) => a.body.mayUseToken.inheritFromParent,
};

type Events = BaseEvents;
const Events = {
  ...BaseEvents,
  pushEvent(events: Events, event: Field[]): Events {
    events = BaseEvents.pushEvent(events, event);
    Provable.asProver(() => {
      // make sure unconstrained data is stored as constants
      events.data[0] = events.data[0].map((e) => Field(Field.toBigint(e)));
    });
    return events;
  },
};
type Actions = BaseActions;
const Actions = {
  ...BaseActions,
  pushEvent(actions: Actions, action: Field[]): Actions {
    actions = BaseActions.pushEvent(actions, action);
    Provable.asProver(() => {
      // make sure unconstrained data is stored as constants
      actions.data[0] = actions.data[0].map((e) => Field(Field.toBigint(e)));
    });
    return actions;
  },
};

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

class VerificationKeyPermission {
  constructor(public auth: Permission, public txnVersion: UInt32) {}

  // TODO this class could be made incompatible with a plain object (breaking change)
  // private _ = undefined;

  static withCurrentVersion(perm: Permission) {
    return new VerificationKeyPermission(perm, TransactionVersion.current());
  }
}

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

  /**
   * Special Verification key permissions.
   *
   * The difference to normal permissions is that `Permission.proof` and `Permission.impossible` are replaced by less restrictive permissions:
   * - `impossible` is replaced by `impossibleDuringCurrentVersion`
   * - `proof` is replaced by `proofDuringCurrentVersion`
   *
   * The issue is that a future hardfork which changes the proof system could mean that old verification keys can no longer
   * be used to verify proofs in the new proof system, and the zkApp would have to be redeployed to adapt the verification key.
   *
   * Having either `impossible` or `proof` would mean that these zkApps can't be upgraded after this hypothetical hardfork, and would become unusable.
   *
   * Such a future hardfork would manifest as an increment in the "transaction version" of zkApps, which you can check with {@link TransactionVersion.current()}.
   *
   * The `impossibleDuringCurrentVersion` and `proofDuringCurrentVersion` have an additional `txnVersion` field.
   * These permissions follow the same semantics of not upgradable, or only upgradable with proofs,
   * _as long as_ the current transaction version is the same as the one on the permission.
   *
   * Once the current transaction version is higher than the one on the permission, the permission is treated as `signature`,
   * and the zkApp can be redeployed with a signature of the original account owner.
   */
  VerificationKey: {
    /**
     * Modification is impossible, as long as the network accepts the current {@link TransactionVersion}.
     *
     * After a hardfork that increments the transaction version, the permission is treated as `signature`.
     */
    impossibleDuringCurrentVersion: () =>
      VerificationKeyPermission.withCurrentVersion(Permission.impossible()),

    /**
     * Modification is always permitted
     */
    none: () => VerificationKeyPermission.withCurrentVersion(Permission.none()),

    /**
     * Modification is permitted by zkapp proofs only; as long as the network accepts the current {@link TransactionVersion}.
     *
     * After a hardfork that increments the transaction version, the permission is treated as `signature`.
     */
    proofDuringCurrentVersion: () =>
      VerificationKeyPermission.withCurrentVersion(Permission.proof()),

    /**
     * Modification is permitted by signatures only, using the private key of the zkapp account
     */
    signature: () => VerificationKeyPermission.withCurrentVersion(Permission.signature()),

    /**
     * Modification is permitted by zkapp proofs or signatures
     */
    proofOrSignature: () =>
      VerificationKeyPermission.withCurrentVersion(Permission.proofOrSignature()),
  },
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
  setVerificationKey: VerificationKeyPermission;

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
    setVerificationKey: Permission.VerificationKey.signature(),
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
    setVerificationKey: Permission.VerificationKey.signature(),
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
    setVerificationKey: Permission.VerificationKey.none(),
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
    setVerificationKey: Permission.VerificationKey.impossibleDuringCurrentVersion(),
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
        throw Error(`Cannot parse invalid permission. ${permission} does not exist.`);
    }
  },

  fromJSON: (
    permissions: NonNullable<Types.Json.AccountUpdate['body']['update']['permissions']>
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
  balanceChange: Int64;

  /**
   * Recent events that have been emitted from this account.
   * Events can be collected by archive nodes.
   *
   * [Check out our documentation about
   * Events!](https://docs.minaprotocol.com/zkapps/writing-a-zkapp/feature-overview/events)
   */
  events: Events;
  /**
   * Recent {@link Action}s emitted from this account.
   * Actions can be collected by archive nodes and used in combination with
   * a {@link Reducer}.
   *
   * [Check out our documentation about
   * Actions!](https://docs.minaprotocol.com/zkapps/writing-a-zkapp/feature-overview/actions-and-reducer)
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
  keepAll(publicKey: PublicKey, tokenId?: Field, mayUseToken?: MayUseToken): Body {
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
type LazySignature = { kind: 'lazy-signature' };
type LazyProof = {
  kind: 'lazy-proof';
  methodName: string;
  args: any[];
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
  lazyAuthorization: LazySignature | LazyProof | LazyNone | undefined = undefined;
  account: Account;
  network: Network;
  currentSlot: CurrentSlot;

  private isSelf: boolean;

  static Actions = Actions;
  static Events = Events;

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

  get tokenId() {
    return this.body.tokenId;
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
      receiver = AccountUpdate.default(to, this.body.tokenId);
      receiver.label = `${this.label ?? 'Unlabeled'}.send()`;
      this.approve(receiver);
    }

    // Sub the amount from the sender's account
    this.body.balanceChange = this.body.balanceChange.sub(amount);
    // Add the amount to the receiver's account
    receiver.body.balanceChange = receiver.body.balanceChange.add(amount);
    return receiver;
  }

  /**
   * Makes another {@link AccountUpdate} a child of this one.
   *
   * The parent-child relationship means that the child becomes part of the "statement"
   * of the parent, and goes into the commitment that is authorized by either a signature
   * or a proof.
   *
   * For a proof in particular, child account updates are contained in the public input
   * of the proof that authorizes the parent account update.
   */
  approve(child: AccountUpdate | AccountUpdateTree | AccountUpdateForest) {
    if (child instanceof AccountUpdateForest) {
      accountUpdateLayout()?.setChildren(this, child);
      return;
    }
    if (child instanceof AccountUpdate) {
      child.body.callDepth = this.body.callDepth + 1;
    }
    accountUpdateLayout()?.disattach(child);
    accountUpdateLayout()?.pushChild(this, child);
  }

  get balance() {
    let accountUpdate = this;

    return {
      addInPlace(x: Int64 | UInt32 | UInt64 | string | number | bigint) {
        accountUpdate.body.balanceChange = accountUpdate.body.balanceChange.add(x);
      },
      subInPlace(x: Int64 | UInt32 | UInt64 | string | number | bigint) {
        accountUpdate.body.balanceChange = accountUpdate.body.balanceChange.sub(x);
      },
    };
  }

  get balanceChange() {
    return this.body.balanceChange;
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
  static assertBetween<T>(property: OrIgnore<ClosedInterval<T>>, lower: T, upper: T) {
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
  static assertEquals<T extends object>(property: OrIgnore<ClosedInterval<T> | T>, value: T) {
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
   * let tx = await Mina.transaction(...); // create transaction as usual, using `requireSignature()` somewhere
   * tx.sign([privateKey]); // pass the private key of this account to `sign()`!
   * ```
   *
   * Note that an account's {@link Permissions} determine which updates have to
   * be (can be) authorized by a signature.
   */
  requireSignature() {
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
    Authorization.setLazySignature(this);
  }

  static signFeePayerInPlace(feePayer: FeePayerUnsigned) {
    feePayer.body.nonce = this.getNonce(feePayer);
    feePayer.authorization = dummySignature();
    feePayer.lazyAuthorization = { kind: 'lazy-signature' };
  }

  static getNonce(accountUpdate: AccountUpdate | FeePayerUnsigned) {
    return AccountUpdate.getSigningInfo(accountUpdate).nonce;
  }

  private static signingInfo = provable({
    isSameAsFeePayer: Bool,
    nonce: UInt32,
  });

  private static getSigningInfo(accountUpdate: AccountUpdate | FeePayerUnsigned) {
    return memoizeWitness(AccountUpdate.signingInfo, () =>
      AccountUpdate.getSigningInfoUnchecked(accountUpdate)
    );
  }

  private static getSigningInfoUnchecked(update: AccountUpdate | FeePayerUnsigned) {
    let publicKey = update.body.publicKey;
    let tokenId = update instanceof AccountUpdate ? update.body.tokenId : TokenId.default;
    let nonce = Number(getAccountPreconditions(update.body).nonce.toString());
    // if the fee payer is the same account update as this one, we have to start
    // the nonce predicate at one higher, bc the fee payer already increases its
    // nonce
    let isFeePayer = currentTransaction()?.sender?.equals(publicKey);
    let isSameAsFeePayer = !!isFeePayer?.and(tokenId.equals(TokenId.default)).toBoolean();
    if (isSameAsFeePayer) nonce++;
    // now, we check how often this account update already updated its nonce in
    // this tx, and increase nonce from `getAccount` by that amount
    let layout = currentTransaction()?.layout;
    layout?.forEachPredecessor(update as AccountUpdate, (otherUpdate) => {
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
    let input = Types.AccountUpdate.toInput(this);
    return hashWithPrefix(zkAppBodyPrefix(activeInstance.getNetworkId()), packToFields(input));
  }

  toPublicInput({ accountUpdates }: { accountUpdates: AccountUpdate[] }): ZkappPublicInput {
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
      emptyHash,
      activeInstance.getNetworkId()
    );
    return { accountUpdate, calls };
  }

  toPrettyLayout() {
    let node = accountUpdateLayout()?.get(this);
    assert(node !== undefined, 'AccountUpdate not found in layout');
    node.children.print();
  }

  extractTree(): AccountUpdateTree {
    let layout = accountUpdateLayout();
    let hash = layout?.get(this)?.final?.hash;
    let id = this.id;
    let children = layout?.finalizeAndRemove(this) ?? AccountUpdateForest.empty();
    let accountUpdate = HashedAccountUpdate.hash(this, hash);
    return new AccountUpdateTree({ accountUpdate, id, children });
  }

  /**
   * Create an account update from a public key and an optional token id.
   *
   * **Important**: This method is different from `AccountUpdate.create()`, in that it really just creates the account update object.
   * It does not attach the update to the current transaction or smart contract.
   * Use this method for lower-level operations with account updates.
   */
  static default(address: PublicKey, tokenId?: Field) {
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
    let accountUpdate = AccountUpdate.default(publicKey, tokenId);
    let insideContract = smartContractContext.get();
    if (insideContract) {
      let self = insideContract.this.self;
      self.approve(accountUpdate);
      accountUpdate.label = `${self.label || 'Unlabeled'} > AccountUpdate.create()`;
    } else {
      currentTransaction()?.layout.pushTopLevel(accountUpdate);
      accountUpdate.label = `Mina.transaction() > AccountUpdate.create()`;
    }
    return accountUpdate;
  }

  /**
   * Create an account update that is added to the transaction only if a condition is met.
   *
   * See {@link AccountUpdate.create} for more information. In this method, you can pass in
   * a condition that determines whether the account update should be added to the transaction.
   */
  static createIf(condition: Bool, publicKey: PublicKey, tokenId?: Field) {
    return AccountUpdate.create(
      // if the condition is false, we use an empty public key, which causes the account update to be ignored
      // as a dummy when building the transaction
      Provable.if(condition, publicKey, PublicKey.empty()),
      tokenId
    );
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
    accountUpdateLayout()?.disattach(accountUpdate);
  }

  /**
   * Creates an account update, like {@link AccountUpdate.create}, but also
   * makes sure this account update will be authorized with a signature.
   *
   * If you use this and are not relying on a wallet to sign your transaction,
   * then you should use the following code before sending your transaction:
   *
   * ```ts
   * let tx = await Mina.transaction(...); // create transaction as usual, using `createSigned()` somewhere
   * tx.sign([privateKey]); // pass the private key of this account to `sign()`!
   * ```
   *
   * Note that an account's {@link Permissions} determine which updates have to
   * be (can be) authorized by a signature.
   */
  static createSigned(publicKey: PublicKey, tokenId?: Field) {
    let accountUpdate = AccountUpdate.create(publicKey, tokenId);
    accountUpdate.label = accountUpdate.label.replace('.create()', '.createSigned()');
    accountUpdate.requireSignature();
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
  static fundNewAccount(feePayer: PublicKey, numberOfAccounts = 1) {
    let accountUpdate = AccountUpdate.createSigned(feePayer);
    accountUpdate.label = 'AccountUpdate.fundNewAccount()';
    let fee = activeInstance.getNetworkConstants().accountCreationFee;
    fee = fee.mul(numberOfAccounts);
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
    return Object.assign(new AccountUpdate(accountUpdate.body, accountUpdate.authorization), other);
  }
  static toValue = Types.AccountUpdate.toValue;
  static fromValue(value: From<typeof Types.AccountUpdate> | AccountUpdate): AccountUpdate {
    if (value instanceof AccountUpdate) return value;
    let accountUpdate = Types.AccountUpdate.fromValue(value);
    return new AccountUpdate(accountUpdate.body, accountUpdate.authorization);
  }

  /**
   * This function acts as the `check()` method on an `AccountUpdate` that is sent to the Mina node as part of a transaction.
   *
   * Background: the Mina node performs most necessary validity checks on account updates, both in- and outside of circuits.
   * To save constraints, we don't repeat these checks in zkApps in places where we can be sure the checked account udpates
   * will be part of a transaction.
   *
   * However, there are a few checks skipped by the Mina node, that could cause vulnerabilities in zkApps if
   * not checked in the zkApp proof itself. Adding these extra checks is the purpose of this function.
   */
  private static clientSideOnlyChecks(au: AccountUpdate) {
    // canonical int64 representation of the balance change
    Int64.check(au.body.balanceChange);
  }

  static witness<T>(
    resultType: FlexibleProvable<T>,
    compute: () => Promise<{ accountUpdate: AccountUpdate; result: T }>,
    { skipCheck = false } = {}
  ) {
    // construct the circuit type for a accountUpdate + other result
    let accountUpdate = skipCheck
      ? {
          ...provable(AccountUpdate),
          check: AccountUpdate.clientSideOnlyChecks,
        }
      : AccountUpdate;
    let combinedType = provable({ accountUpdate, result: resultType });
    return Provable.witnessAsync(combinedType, compute);
  }

  static MayUseToken = MayUseToken;

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
    let body: Partial<Types.Json.AccountUpdate['body']> = jsonUpdate.body as any;
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
    if (body.implicitAccountCreationFee === false) delete body.implicitAccountCreationFee;
    if (body.events?.length === 0) delete body.events;
    if (body.actions?.length === 0) delete body.actions;
    if (body.preconditions?.account) {
      body.preconditions.account = JSON.stringify(body.preconditions.account) as any;
    }
    if (body.preconditions?.network) {
      body.preconditions.network = JSON.stringify(body.preconditions.network) as any;
    }
    if (body.preconditions?.validWhile) {
      body.preconditions.validWhile = JSON.stringify(body.preconditions.validWhile) as any;
    }
    if (jsonUpdate.authorization?.proof) {
      jsonUpdate.authorization.proof = short(jsonUpdate.authorization.proof);
    }
    if (jsonUpdate.authorization?.signature) {
      jsonUpdate.authorization.signature = short(jsonUpdate.authorization.signature);
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
    if (body.authorizationKind?.isProved === false && body.authorizationKind?.isSigned === false) {
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
  return genericHash(AccountUpdate, zkAppBodyPrefix(activeInstance.getNetworkId()), update);
}

class HashedAccountUpdate extends Hashed.create(AccountUpdate, hashAccountUpdate) {}

type AccountUpdateTreeBase = {
  id: number;
  accountUpdate: Hashed<AccountUpdate>;
  children: AccountUpdateForestBase;
};
type AccountUpdateForestBase = MerkleListBase<AccountUpdateTreeBase>;

const AccountUpdateTreeBase = StructNoJson({
  id: RandomId,
  accountUpdate: HashedAccountUpdate,
  children: MerkleListBase<AccountUpdateTreeBase>(),
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
 *   children: AccountUpdateForest;
 * };
 * ```
 */
class AccountUpdateForest extends MerkleList.create(AccountUpdateTreeBase, merkleListHash) {
  static provable = provableExtends(AccountUpdateForest, super.provable);

  push(update: AccountUpdate | AccountUpdateTreeBase) {
    return super.push(update instanceof AccountUpdate ? AccountUpdateTree.from(update) : update);
  }
  pushIf(condition: Bool, update: AccountUpdate | AccountUpdateTreeBase) {
    return super.pushIf(
      condition,
      update instanceof AccountUpdate ? AccountUpdateTree.from(update) : update
    );
  }

  static fromFlatArray(updates: AccountUpdate[]): AccountUpdateForest {
    let simpleForest = accountUpdatesToCallForest(updates);
    return this.fromSimpleForest(simpleForest);
  }

  toFlatArray(mutate = true, depth = 0) {
    return AccountUpdateForest.toFlatArray(this, mutate, depth);
  }

  static toFlatArray(forest: AccountUpdateForestBase, mutate = true, depth = 0) {
    let flat: AccountUpdate[] = [];
    for (let { element: tree } of forest.data.get()) {
      let update = tree.accountUpdate.value.get();
      if (mutate) update.body.callDepth = depth;
      flat.push(update);
      flat.push(...this.toFlatArray(tree.children, mutate, depth + 1));
    }
    return flat;
  }

  private static fromSimpleForest(simpleForest: CallForest<AccountUpdate>): AccountUpdateForest {
    let nodes = simpleForest.map((node) => {
      let accountUpdate = HashedAccountUpdate.hash(node.accountUpdate);
      let children = AccountUpdateForest.fromSimpleForest(node.children);
      return { accountUpdate, children, id: node.accountUpdate.id };
    });
    return AccountUpdateForest.fromReverse(nodes);
  }

  // TODO this comes from paranoia and might be removed later
  static assertConstant(forest: AccountUpdateForestBase) {
    Provable.asProver(() => {
      forest.data.get().forEach(({ element: tree }) => {
        assert(
          Provable.isConstant(AccountUpdate, tree.accountUpdate.value.get()),
          'account update not constant'
        );
        AccountUpdateForest.assertConstant(tree.children);
      });
    });
  }

  // fix static methods
  static empty() {
    return AccountUpdateForest.provable.empty();
  }
  static from(array: AccountUpdateTreeBase[]) {
    return new AccountUpdateForest(super.from(array));
  }
  static fromReverse(array: AccountUpdateTreeBase[]) {
    return new AccountUpdateForest(super.fromReverse(array));
  }
}

/**
 * Class which represents a tree of account updates,
 * in a compressed way which allows iterating and selectively witnessing the account updates.
 *
 * The (recursive) type signature is:
 * ```
 * type AccountUpdateTree = {
 *   accountUpdate: Hashed<AccountUpdate>;
 *   children: AccountUpdateForest;
 * };
 * type AccountUpdateForest = MerkleList<AccountUpdateTree>;
 * ```
 */
class AccountUpdateTree extends StructNoJson({
  id: RandomId,
  accountUpdate: HashedAccountUpdate,
  children: AccountUpdateForest,
}) {
  /**
   * Create a tree of account updates which only consists of a root.
   */
  static from(update: AccountUpdate | AccountUpdateTree, hash?: Field) {
    if (update instanceof AccountUpdateTree) return update;
    return new AccountUpdateTree({
      accountUpdate: HashedAccountUpdate.hash(update, hash),
      id: update.id,
      children: AccountUpdateForest.empty(),
    });
  }

  /**
   * Add an {@link AccountUpdate} or {@link AccountUpdateTree} to the children of this tree's root.
   *
   * See {@link AccountUpdate.approve}.
   */
  approve(update: AccountUpdate | AccountUpdateTree, hash?: Field) {
    accountUpdateLayout()?.disattach(update);
    if (update instanceof AccountUpdate) {
      this.children.pushIf(update.isDummy().not(), AccountUpdateTree.from(update, hash));
    } else {
      this.children.push(update);
    }
  }

  // fix Struct type
  static fromFields(fields: Field[], aux: any) {
    return new AccountUpdateTree(super.fromFields(fields, aux));
  }
  static empty() {
    return new AccountUpdateTree(super.empty());
  }
}

// how to hash a forest

function merkleListHash(forestHash: Field, tree: AccountUpdateTreeBase) {
  return hashCons(forestHash, hashNode(tree));
}

function hashNode(tree: AccountUpdateTreeBase) {
  return Poseidon.hashWithPrefix(prefixes.accountUpdateNode, [
    tree.accountUpdate.hash,
    tree.children.hash,
  ]);
}
function hashCons(forestHash: Field, nodeHash: Field) {
  return Poseidon.hashWithPrefix(prefixes.accountUpdateCons, [nodeHash, forestHash]);
}

/**
 * `UnfinishedForest` / `UnfinishedTree` are structures for constructing the forest of child account updates from a circuit.
 *
 * The circuit can mutate account updates and change their array of children, so here we can't hash
 * everything immediately. Instead, we maintain a structure consisting of either hashes or full account
 * updates that can be hashed into a final call forest at the end.
 *
 * `UnfinishedForest` and `UnfinishedTree` behave like a tagged enum type:
 * ```
 * type UnfinishedForest =
 *  | Mutable of UnfinishedTree[]
 *  | Final of AccountUpdateForest;
 *
 * type UnfinishedTree = (
 *  | Mutable of AccountUpdate
 *  | Final of HashedAccountUpdate
 * ) & { children: UnfinishedForest, ... }
 * ```
 */
type UnfinishedTree = {
  id: number;
  isDummy: Bool;
  // `children` must be readonly since it's referenced in each child's siblings
  readonly children: UnfinishedForest;
  siblings?: UnfinishedForest;
} & (
  | { final: HashedAccountUpdate; mutable?: undefined }
  | { final?: undefined; mutable: AccountUpdate }
);

type UnfinishedForestFinal = UnfinishedForest & {
  final: AccountUpdateForest;
  mutable?: undefined;
};

type UnfinishedForestMutable = UnfinishedForest & {
  final?: undefined;
  mutable: UnfinishedTree[];
};

class UnfinishedForest {
  final?: AccountUpdateForest;
  mutable?: UnfinishedTree[];

  isFinal(): this is UnfinishedForestFinal {
    return this.final !== undefined;
  }
  isMutable(): this is UnfinishedForestMutable {
    return this.mutable !== undefined;
  }

  constructor(mutable?: UnfinishedTree[], final?: AccountUpdateForest) {
    assert((final === undefined) !== (mutable === undefined), 'final or mutable');
    this.final = final;
    this.mutable = mutable;
  }

  static empty(): UnfinishedForestMutable {
    return new UnfinishedForest([]) as any;
  }

  private setFinal(final: AccountUpdateForest): UnfinishedForestFinal {
    return Object.assign(this, { final, mutable: undefined });
  }

  finalize(): AccountUpdateForest {
    if (this.isFinal()) return this.final;
    assert(this.isMutable(), 'final or mutable');

    let nodes = this.mutable.map(UnfinishedTree.finalize);
    let finalForest = AccountUpdateForest.empty();

    for (let { isDummy, ...tree } of [...nodes].reverse()) {
      finalForest.pushIf(isDummy.not(), tree);
    }
    this.setFinal(finalForest);
    return finalForest;
  }

  witnessHash(): UnfinishedForestFinal {
    let final = Provable.witness(AccountUpdateForest, () => this.finalize());
    return this.setFinal(final);
  }

  push(node: UnfinishedTree) {
    if (node.siblings === this) return;
    assert(node.siblings === undefined, 'Cannot push node that already has a parent.');
    node.siblings = this;
    assert(this.isMutable(), 'Cannot push to an immutable forest');
    this.mutable.push(node);
  }

  remove(node: UnfinishedTree) {
    assert(this.isMutable(), 'Cannot remove from an immutable forest');
    // find by .id
    let index = this.mutable.findIndex((n) => n.id === node.id);

    // nothing to do if it's not there
    if (index === -1) return;

    // remove it
    node.siblings = undefined;
    this.mutable.splice(index, 1);
  }

  setToForest(forest: AccountUpdateForestBase) {
    if (this.isMutable()) {
      assert(
        this.mutable.length === 0,
        'Replacing a mutable forest that has existing children might be a mistake.'
      );
    }
    return this.setFinal(new AccountUpdateForest(forest));
  }

  static fromForest(forest: AccountUpdateForestBase) {
    return UnfinishedForest.empty().setToForest(forest);
  }

  toFlatArray(mutate = true, depth = 0): AccountUpdate[] {
    if (this.isFinal()) return this.final.toFlatArray(mutate, depth);
    assert(this.isMutable(), 'final or mutable');
    let flatUpdates: AccountUpdate[] = [];
    for (let node of this.mutable) {
      if (node.isDummy.toBoolean()) continue;
      let update = node.mutable ?? node.final.value.get();
      if (mutate) update.body.callDepth = depth;
      let children = node.children.toFlatArray(mutate, depth + 1);
      flatUpdates.push(update, ...children);
    }
    return flatUpdates;
  }

  toConstantInPlace() {
    if (this.isFinal()) {
      this.final.hash = this.final.hash.toConstant();
      return;
    }
    assert(this.isMutable(), 'final or mutable');
    for (let node of this.mutable) {
      if (node.mutable !== undefined) {
        node.mutable = Provable.toConstant(AccountUpdate, node.mutable);
      } else {
        node.final.hash = node.final.hash.toConstant();
      }
      node.isDummy = Provable.toConstant(Bool, node.isDummy);
      node.children.toConstantInPlace();
    }
  }

  print() {
    let indent = 0;
    let layout = '';

    let toPretty = (a: UnfinishedForest) => {
      if (a.isFinal()) {
        layout += ' '.repeat(indent) + ' ( finalized forest )\n';
        return;
      }
      assert(a.isMutable(), 'final or mutable');
      indent += 2;
      for (let tree of a.mutable) {
        let label = tree.mutable?.label || '<no label>';
        if (tree.final !== undefined) {
          Provable.asProver(() => (label = tree.final!.value.get().label));
        }
        layout += ' '.repeat(indent) + `( ${label} )` + '\n';
        toPretty(tree.children);
      }
      indent -= 2;
    };

    toPretty(this);
    console.log(layout);
  }
}

const UnfinishedTree = {
  create(update: AccountUpdate | AccountUpdateTree): UnfinishedTree {
    if (update instanceof AccountUpdate) {
      return {
        mutable: update,
        id: update.id,
        isDummy: update.isDummy(),
        children: UnfinishedForest.empty(),
      };
    }
    return {
      final: update.accountUpdate,
      id: update.id,
      isDummy: Bool(false),
      children: UnfinishedForest.fromForest(update.children),
    };
  },

  setTo(node: UnfinishedTree, update: AccountUpdate | AccountUpdateTree) {
    if (update instanceof AccountUpdate) {
      if (node.final !== undefined) {
        Object.assign(node, {
          mutable: update,
          final: undefined,
          children: UnfinishedForest.empty(),
        });
      }
    } else if (node.mutable !== undefined) {
      Object.assign(node, {
        mutable: undefined,
        final: update.accountUpdate,
        children: UnfinishedForest.fromForest(update.children),
      });
    }
  },

  finalize(node: UnfinishedTree): AccountUpdateTreeBase & { isDummy: Bool } {
    let accountUpdate = node.final ?? HashedAccountUpdate.hash(node.mutable);
    let children = node.children.finalize();
    return { accountUpdate, id: node.id, isDummy: node.isDummy, children };
  },

  isUnfinished(input: AccountUpdate | AccountUpdateTree | UnfinishedTree): input is UnfinishedTree {
    return 'final' in input || 'mutable' in input;
  },
};

class AccountUpdateLayout {
  readonly map: Map<number, UnfinishedTree>;
  readonly root: UnfinishedTree;
  final?: AccountUpdateForest;

  constructor(root?: AccountUpdate) {
    this.map = new Map();
    root ??= AccountUpdate.dummy();
    let rootTree: UnfinishedTree = {
      mutable: root,
      id: root.id,
      isDummy: Bool(false),
      children: UnfinishedForest.empty(),
    };
    this.map.set(root.id, rootTree);
    this.root = rootTree;
  }

  get(update: AccountUpdate | AccountUpdateTree) {
    return this.map.get(update.id);
  }

  private getOrCreate(update: AccountUpdate | AccountUpdateTree | UnfinishedTree): UnfinishedTree {
    if (UnfinishedTree.isUnfinished(update)) {
      if (!this.map.has(update.id)) {
        this.map.set(update.id, update);
      }
      return update;
    }
    let node = this.map.get(update.id);

    if (node !== undefined) {
      // might have to change node
      UnfinishedTree.setTo(node, update);
      return node;
    }

    node = UnfinishedTree.create(update);
    this.map.set(update.id, node);
    return node;
  }

  pushChild(parent: AccountUpdate | UnfinishedTree, child: AccountUpdate | AccountUpdateTree) {
    let parentNode = this.getOrCreate(parent);
    let childNode = this.getOrCreate(child);
    parentNode.children.push(childNode);
  }

  pushTopLevel(child: AccountUpdate) {
    this.pushChild(this.root, child);
  }

  setChildren(parent: AccountUpdate | UnfinishedTree, children: AccountUpdateForest) {
    let parentNode = this.getOrCreate(parent);
    parentNode.children.setToForest(children);
  }

  setTopLevel(children: AccountUpdateForest) {
    this.setChildren(this.root, children);
  }

  disattach(update: AccountUpdate | AccountUpdateTree) {
    let node = this.get(update);
    node?.siblings?.remove(node);
    return node;
  }

  finalizeAndRemove(update: AccountUpdate | AccountUpdateTree) {
    let node = this.get(update);
    if (node === undefined) return;
    this.disattach(update);
    return node.children.finalize();
  }

  finalizeChildren() {
    let final = this.root.children.finalize();
    this.final = final;
    AccountUpdateForest.assertConstant(final);
    return final;
  }

  toFlatList({ mutate }: { mutate: boolean }) {
    return this.root.children.toFlatArray(mutate);
  }

  forEachPredecessor(update: AccountUpdate, callback: (update: AccountUpdate) => void) {
    let updates = this.toFlatList({ mutate: false });
    for (let otherUpdate of updates) {
      if (otherUpdate.id === update.id) return;
      callback(otherUpdate);
    }
  }

  toConstantInPlace() {
    this.root.children.toConstantInPlace();
  }
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
  setLazySignature(accountUpdate: AccountUpdate) {
    accountUpdate.body.authorizationKind.isSigned = Bool(true);
    accountUpdate.body.authorizationKind.isProved = Bool(false);
    accountUpdate.body.authorizationKind.verificationKeyHash = Field(
      mocks.dummyVerificationKeyHash
    );
    accountUpdate.authorization = {};
    accountUpdate.lazyAuthorization = { kind: 'lazy-signature' };
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
  privateKeys: PrivateKey[]
): ZkappCommandSigned {
  let additionalPublicKeys = privateKeys.map((sk) => sk.toPublicKey());
  let { commitment, fullCommitment } = transactionCommitments(
    {
      ...Types.ZkappCommand.toValue(zkappCommand),
      // TODO: represent memo in encoded form already?
      memo: Memo.toBase58(Memo.fromString(zkappCommand.memo)),
    },
    activeInstance.getNetworkId()
  );

  function addFeePayerSignature(accountUpdate: FeePayerUnsigned): FeePayer {
    let { body, authorization, lazyAuthorization } = cloneCircuitValue(accountUpdate);
    if (lazyAuthorization === undefined) return { body, authorization };

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
    let privateKey = privateKeys[i];

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
    let privateKey = privateKeys[i];

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
    let { accountUpdateProved, proof } = await addProof(zkappCommand, i, proofsEnabled);
    accountUpdatesProved.push(accountUpdateProved);
    proofs.push(proof);
  }
  return {
    zkappCommand: { feePayer, accountUpdates: accountUpdatesProved, memo },
    proofs,
  };
}

async function addProof(transaction: ZkappCommand, index: number, proofsEnabled: boolean) {
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
  { methodName, args, ZkappClass, memoized, blindingValue }: LazyProof,
  { transaction, accountUpdate, index }: ZkappProverData
): Promise<Proof<ZkappPublicInput, Empty>> {
  let publicInput = accountUpdate.toPublicInput(transaction);
  let publicInputFields = MlFieldConstArray.to(ZkappPublicInput.toFields(publicInput));

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
        return await prover(publicInputFields);
      } catch (err) {
        console.error(`Error when proving ${ZkappClass.name}.${methodName}()`);
        throw err;
      } finally {
        memoizationContext.leave(id);
      }
    }
  );

  let maxProofsVerified = await ZkappClass.getMaxProofsVerified();
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
