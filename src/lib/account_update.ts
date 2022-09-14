import {
  circuitArray,
  circuitValue,
  cloneCircuitValue,
  memoizationContext,
  memoizeWitness,
} from './circuit_value.js';
import {
  Field,
  Bool,
  Ledger,
  Circuit,
  Pickles,
  AsFieldElements,
} from '../snarky.js';
import { Types } from '../snarky/types.js';
import { PrivateKey, PublicKey } from './signature.js';
import { UInt64, UInt32, Int64, Sign } from './int.js';
import * as Mina from './mina.js';
import { SmartContract } from './zkapp.js';
import * as Precondition from './precondition.js';
import { inCheckedComputation, Proof, snarkContext } from './proof_system.js';
import {
  emptyHashWithPrefix,
  hashWithPrefix,
  packToFields,
  prefixes,
  TokenSymbol,
} from './hash.js';
import * as Encoding from './encoding.js';
import { Context } from './global-context.js';

// external API
export { Permissions, AccountUpdate, ZkappPublicInput };

// internal API
export {
  smartContractContext,
  SetOrKeep,
  Permission,
  Preconditions,
  Body,
  Authorization,
  FeePayerUnsigned,
  ZkappCommand,
  zkappCommandToJson,
  addMissingSignatures,
  addMissingProofs,
  signJsonTransaction,
  ZkappStateLength,
  Events,
  SequenceEvents,
  accountUpdateToPublicInput,
  TokenId,
  Token,
  CallForest,
  createChildAccountUpdate,
  makeChildAccountUpdate,
  AccountUpdatesLayout,
};

const ZkappStateLength = 8;

let smartContractContext = Context.create<{
  this: SmartContract;
  methodCallDepth: number;
  isCallback: boolean;
  selfUpdate: AccountUpdate;
}>();

type AccountUpdateBody = Types.AccountUpdate['body'];
type Update = AccountUpdateBody['update'];

/**
 * Preconditions for the network and accounts
 */
type Preconditions = AccountUpdateBody['preconditions'];

/**
 * Timing info inside an account.
 */
type Timing = Update['timing']['value'];

/**
 * Either set a value or keep it the same.
 */
type SetOrKeep<T> = { isSome: Bool; value: T };

function keep<T>(dummy: T): SetOrKeep<T> {
  return { isSome: Bool(false), value: dummy };
}

const True = () => Bool(true);
const False = () => Bool(false);

/**
 * One specific permission value.
 *
 * A [[ Permission ]] tells one specific permission for our zkapp how it should behave
 * when presented with requested modifications.
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
 * Permissions specify how specific aspects of the zkapp account are allowed to
 * be modified. All fields are denominated by a [[ Permission ]].
 */
interface Permissions extends Permissions_ {
  /**
   * The [[ Permission ]] corresponding to the 8 state fields associated with an
   * account.
   */
  editState: Permission;

  /**
   * The [[ Permission ]] corresponding to the ability to send transactions from this
   * account.
   */
  send: Permission;

  /**
   * The [[ Permission ]] corresponding to the ability to receive transactions to this
   * account.
   */
  receive: Permission;

  /**
   * The [[ Permission ]] corresponding to the ability to set the delegate field of
   * the account.
   */
  setDelegate: Permission;

  /**
   * The [[ Permission ]] corresponding to the ability to set the permissions field of
   * the account.
   */
  setPermissions: Permission;

  /**
   * The [[ Permission ]] corresponding to the ability to set the verification key
   * associated with the circuit tied to this account. Effectively
   * "upgradability" of the smart contract.
   */
  setVerificationKey: Permission;

  /**
   * The [[ Permission ]] corresponding to the ability to set the zkapp uri typically
   * pointing to the source code of the smart contract. Usually this should be
   * changed whenever the [[ Permissions.setVerificationKey ]] is changed.
   * Effectively "upgradability" of the smart contract.
   */
  setZkappUri: Permission;

  /**
   * The [[ Permission ]] corresponding to the ability to change the sequence state
   * associated with the account.
   *
   * TODO: Define sequence state here as well.
   */
  editSequenceState: Permission;

  /**
   * The [[ Permission ]] corresponding to the ability to set the token symbol for
   * this account.
   */
  setTokenSymbol: Permission;

  // TODO: doccomments
  incrementNonce: Permission;
  setVotingFor: Permission;
}
let Permissions = {
  ...Permission,
  /**
   * Default permissions are:
   *   [[ Permissions.editState ]]=[[ Permission.proof ]]
   *   [[ Permissions.send ]]=[[ Permission.signature ]]
   *   [[ Permissions.receive ]]=[[ Permission.none ]]
   *   [[ Permissions.setDelegate ]]=[[ Permission.signature ]]
   *   [[ Permissions.setPermissions ]]=[[ Permission.signature ]]
   *   [[ Permissions.setVerificationKey ]]=[[ Permission.signature ]]
   *   [[ Permissions.setZkappUri ]]=[[ Permission.signature ]]
   *   [[ Permissions.editSequenceState ]]=[[ Permission.proof ]]
   *   [[ Permissions.setTokenSymbol ]]=[[ Permission.signature ]]
   */
  default: (): Permissions => ({
    editState: Permission.proof(),
    send: Permission.signature(),
    receive: Permission.none(),
    setDelegate: Permission.signature(),
    setPermissions: Permission.signature(),
    setVerificationKey: Permission.signature(),
    setZkappUri: Permission.signature(),
    editSequenceState: Permission.proof(),
    setTokenSymbol: Permission.signature(),
    incrementNonce: Permissions.signature(),
    setVotingFor: Permission.signature(),
  }),

  initial: (): Permissions => ({
    editState: Permission.signature(),
    send: Permission.signature(),
    receive: Permission.none(),
    setDelegate: Permission.signature(),
    setPermissions: Permission.signature(),
    setVerificationKey: Permission.signature(),
    setZkappUri: Permission.signature(),
    editSequenceState: Permission.signature(),
    setTokenSymbol: Permission.signature(),
    incrementNonce: Permissions.signature(),
    setVotingFor: Permission.signature(),
  }),
};

type Event = Field[];

type Events = {
  hash: Field;
  data: Event[];
};

const Events = {
  empty(): Events {
    let hash = emptyHashWithPrefix('MinaZkappEventsEmpty');
    return { hash, data: [] };
  },
  pushEvent(events: Events, event: Event): Events {
    let eventHash = hashWithPrefix(prefixes.event, event);
    let hash = hashWithPrefix(prefixes.events, [events.hash, eventHash]);
    return { hash, data: [event, ...events.data] };
  },
  hash(events: Event[]) {
    return [...events].reverse().reduce(Events.pushEvent, Events.empty()).hash;
  },
};

const SequenceEvents = {
  // same as events but w/ different hash prefixes
  empty(): Events {
    let hash = emptyHashWithPrefix('MinaZkappSequenceEmpty');
    return { hash, data: [] };
  },
  pushEvent(sequenceEvents: Events, event: Event): Events {
    let eventHash = hashWithPrefix(prefixes.event, event);
    let hash = hashWithPrefix(prefixes.sequenceEvents, [
      sequenceEvents.hash,
      eventHash,
    ]);
    return { hash, data: [event, ...sequenceEvents.data] };
  },
  hash(events: Event[]) {
    return [...events]
      .reverse()
      .reduce(SequenceEvents.pushEvent, SequenceEvents.empty()).hash;
  },
  // different than events
  emptySequenceState() {
    return emptyHashWithPrefix('MinaZkappSequenceStateEmptyElt');
  },
  updateSequenceState(state: Field, sequenceEventsHash: Field) {
    return hashWithPrefix(prefixes.sequenceEvents, [state, sequenceEventsHash]);
  },
};

// TODO: get docstrings from OCaml and delete this interface
/**
 * The body of describing how some [[ AccountUpdate ]] should change.
 *
 * TODO: We need to rename this still.
 */
interface Body extends AccountUpdateBody {
  /**
   * The address for this body.
   */
  publicKey: PublicKey;

  /**
   * Specify [[ Update ]]s to tweakable pieces of the account record backing
   * this address in the ledger.
   */
  update: Update;

  /**
   * The TokenId for this account.
   */
  tokenId: Field;

  /**
   * By what [[ Int64 ]] should the balance of this account change. All
   * balanceChanges must balance by the end of smart contract execution.
   */
  balanceChange: {
    magnitude: UInt64;
    sgn: Sign;
  };

  /**
   * Recent events that have been emitted from this account.
   *
   * TODO: Add a reference to general explanation of events.
   */
  events: Events;
  sequenceEvents: Events;
  caller: Field;
  callData: Field;
  callDepth: number;
  preconditions: Preconditions;
  useFullCommitment: Bool;
  incrementNonce: Bool;
}
const Body = {
  noUpdate(): Update {
    return {
      appState: Array(ZkappStateLength)
        .fill(0)
        .map(() => keep(Field.zero)),
      delegate: keep(PublicKey.empty()),
      // TODO
      verificationKey: keep({ data: '', hash: Field.zero }),
      permissions: keep(Permissions.initial()),
      // TODO don't hard code
      zkappUri: keep({
        data: '',
        hash: Field(
          '22930868938364086394602058221028773520482901241511717002947639863679740444066'
        ),
      }),
      // TODO
      tokenSymbol: keep(TokenSymbol.empty),
      timing: keep<Timing>({
        cliffAmount: UInt64.zero,
        cliffTime: UInt32.zero,
        initialMinimumBalance: UInt64.zero,
        vestingIncrement: UInt64.zero,
        vestingPeriod: UInt32.zero,
      }),
      votingFor: keep(Field.zero),
    };
  },

  /**
   * A body that Don't change part of the underlying account record.
   */
  keepAll(publicKey: PublicKey): Body {
    return {
      publicKey,
      update: Body.noUpdate(),
      tokenId: TokenId.default,
      balanceChange: Int64.zero,
      events: Events.empty(),
      sequenceEvents: SequenceEvents.empty(),
      caller: TokenId.default,
      callData: Field.zero,
      callDepth: 0,
      preconditions: Preconditions.ignoreAll(),
      // the default assumption is that snarkyjs transactions don't include the fee payer
      // so useFullCommitment has to be false for signatures to be correct
      useFullCommitment: Bool(false),
      // this should be set to true if accountUpdates are signed
      incrementNonce: Bool(false),
    };
  },

  dummy(): Body {
    return Body.keepAll(PublicKey.empty());
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

/**
 * Either check a value or ignore it.
 *
 * Used within [[ AccountPredicate ]]s and [[ ProtocolStatePredicate ]]s.
 */
type OrIgnore<T> = { isSome: Bool; value: T };

/**
 * An interval representing all the values between `lower` and `upper` inclusive
 * of both the `lower` and `upper` values.
 *
 * @typeParam A something with an ordering where one can quantify a lower and
 *            upper bound.
 */
type ClosedInterval<T> = { lower: T; upper: T };

type NetworkPrecondition = Preconditions['network'];
let NetworkPrecondition = {
  ignoreAll(): NetworkPrecondition {
    let stakingEpochData = {
      ledger: { hash: ignore(Field.zero), totalCurrency: ignore(uint64()) },
      seed: ignore(Field.zero),
      startCheckpoint: ignore(Field.zero),
      lockCheckpoint: ignore(Field.zero),
      epochLength: ignore(uint32()),
    };
    let nextEpochData = cloneCircuitValue(stakingEpochData);
    return {
      snarkedLedgerHash: ignore(Field.zero),
      timestamp: ignore(uint64()),
      blockchainLength: ignore(uint32()),
      minWindowDensity: ignore(uint32()),
      totalCurrency: ignore(uint64()),
      globalSlotSinceHardFork: ignore(uint32()),
      globalSlotSinceGenesis: ignore(uint32()),
      stakingEpochData,
      nextEpochData,
    };
  },
};

/**
 * Ignores a `dummy`
 *
 * @param dummy The value to ignore
 * @returns Always an ignored value regardless of the input.
 */
function ignore<T>(dummy: T): OrIgnore<T> {
  return { isSome: Bool(false), value: dummy };
}

/**
 * Ranges between all uint32 values
 */
const uint32 = () => ({ lower: UInt32.fromNumber(0), upper: UInt32.MAXINT() });

/**
 * Ranges between all uint64 values
 */
const uint64 = () => ({ lower: UInt64.fromNumber(0), upper: UInt64.MAXINT() });

type AccountPrecondition = Preconditions['account'];
const AccountPrecondition = {
  ignoreAll(): AccountPrecondition {
    let appState: Array<OrIgnore<Field>> = [];
    for (let i = 0; i < ZkappStateLength; ++i) {
      appState.push(ignore(Field.zero));
    }
    return {
      balance: ignore(uint64()),
      nonce: ignore(uint32()),
      receiptChainHash: ignore(Field.zero),
      delegate: ignore(PublicKey.empty()),
      state: appState,
      sequenceState: ignore(SequenceEvents.emptySequenceState()),
      provedState: ignore(Bool(false)),
      isNew: ignore(Bool(false)),
    };
  },
  nonce(nonce: UInt32): AccountPrecondition {
    let p = AccountPrecondition.ignoreAll();
    AccountUpdate.assertEquals(p.nonce, nonce);
    return p;
  },
};

const Preconditions = {
  ignoreAll(): Preconditions {
    return {
      account: AccountPrecondition.ignoreAll(),
      network: NetworkPrecondition.ignoreAll(),
    };
  },
};

type Control = Types.AccountUpdate['authorization'];
type LazySignature = { kind: 'lazy-signature'; privateKey?: PrivateKey };
type LazyProof = {
  kind: 'lazy-proof';
  methodName: string;
  args: any[];
  previousProofs: { publicInput: Field[]; proof: Pickles.Proof }[];
  ZkappClass: typeof SmartContract;
  memoized: Field[][];
  blindingValue: Field;
};

const TokenId = {
  ...Types.TokenId,
  ...Encoding.TokenId,
  get default() {
    return Field.one;
  },
};

class Token {
  readonly id: Field;
  readonly parentTokenId: Field;
  readonly tokenOwner: PublicKey;

  static Id = TokenId;

  static getId(tokenOwner: PublicKey, parentTokenId = TokenId.default) {
    if (tokenOwner.isConstant() && parentTokenId.isConstant()) {
      return Ledger.customTokenId(tokenOwner, parentTokenId);
    } else {
      return Ledger.customTokenIdChecked(tokenOwner, parentTokenId);
    }
  }

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
      this.id = Token.getId(tokenOwner, parentTokenId);
    } catch (e) {
      throw new Error(
        `Could not create a custom token id:\nError: ${(e as Error).message}`
      );
    }
  }
}

class AccountUpdate implements Types.AccountUpdate {
  body: Body;
  authorization: Control;
  lazyAuthorization: LazySignature | LazyProof | undefined = undefined;
  account: Precondition.Account;
  network: Precondition.Network;
  children: { calls?: Field; accountUpdates: AccountUpdate[] } = {
    accountUpdates: [],
  };
  parent: AccountUpdate | undefined = undefined;

  private isSelf: boolean;

  constructor(body: Body, authorization?: Control);
  constructor(body: Body, authorization = {} as Control, isSelf = false) {
    this.body = body;
    this.authorization = authorization;
    let { account, network } = Precondition.preconditions(this, isSelf);
    this.account = account;
    this.network = network;
    this.isSelf = isSelf;
  }

  static clone(accountUpdate: AccountUpdate) {
    let body = cloneCircuitValue(accountUpdate.body);
    let authorization = cloneCircuitValue(accountUpdate.authorization);
    let clonedAccountUpdate = new (AccountUpdate as any)(
      body,
      authorization,
      accountUpdate.isSelf
    );
    clonedAccountUpdate.lazyAuthorization = cloneCircuitValue(
      accountUpdate.lazyAuthorization
    );
    clonedAccountUpdate.children = accountUpdate.children;
    clonedAccountUpdate.parent = accountUpdate.parent;
    return clonedAccountUpdate;
  }

  token() {
    let thisAccountUpdate = this;
    let customToken = new Token({
      tokenOwner: thisAccountUpdate.body.publicKey,
      parentTokenId: thisAccountUpdate.body.tokenId,
    });

    return {
      id: customToken.id,
      parentTokenId: customToken.parentTokenId,
      tokenOwner: customToken.tokenOwner,

      mint({
        address,
        amount,
      }: {
        address: PublicKey;
        amount: number | bigint | UInt64;
      }) {
        let receiverAccountUpdate = createChildAccountUpdate(
          thisAccountUpdate,
          address,
          this.id
        );

        // Add the amount to mint to the receiver's account
        receiverAccountUpdate.body.balanceChange = Int64.fromObject(
          receiverAccountUpdate.body.balanceChange
        ).add(amount);
        return receiverAccountUpdate;
      },

      burn({
        address,
        amount,
      }: {
        address: PublicKey;
        amount: number | bigint | UInt64;
      }) {
        let senderAccountUpdate = createChildAccountUpdate(
          thisAccountUpdate,
          address,
          this.id
        );
        senderAccountUpdate.body.useFullCommitment = Bool(true);

        // Sub the amount to burn from the sender's account
        senderAccountUpdate.body.balanceChange = Int64.fromObject(
          senderAccountUpdate.body.balanceChange
        ).sub(amount);

        // Require signature from the sender account being deducted
        Authorization.setLazySignature(senderAccountUpdate);
      },

      send({
        from,
        to,
        amount,
      }: {
        from: PublicKey;
        to: PublicKey;
        amount: number | bigint | UInt64;
      }) {
        // Create a new accountUpdate for the sender to send the amount to the receiver
        let senderAccountUpdate = createChildAccountUpdate(
          thisAccountUpdate,
          from,
          this.id
        );
        senderAccountUpdate.body.useFullCommitment = Bool(true);

        let i0 = senderAccountUpdate.body.balanceChange;
        senderAccountUpdate.body.balanceChange = new Int64(
          i0.magnitude,
          i0.sgn
        ).sub(amount);

        // Require signature from the sender accountUpdate
        Authorization.setLazySignature(senderAccountUpdate);

        let receiverAccountUpdate = createChildAccountUpdate(
          thisAccountUpdate,
          to,
          this.id
        );

        // Add the amount to send to the receiver's account
        let i1 = receiverAccountUpdate.body.balanceChange;
        receiverAccountUpdate.body.balanceChange = new Int64(
          i1.magnitude,
          i1.sgn
        ).add(amount);
        return receiverAccountUpdate;
      },
    };
  }

  get tokenId() {
    return this.body.tokenId;
  }

  get tokenSymbol() {
    let accountUpdate = this;

    return {
      set(tokenSymbol: string) {
        AccountUpdate.setValue(
          accountUpdate.update.tokenSymbol,
          TokenSymbol.from(tokenSymbol)
        );
      },
    };
  }

  send({
    to,
    amount,
  }: {
    to: PublicKey | AccountUpdate;
    amount: number | bigint | UInt64;
  }) {
    let accountUpdate = this;
    let receiverAccountUpdate;
    if (to instanceof AccountUpdate) {
      receiverAccountUpdate = to;
      receiverAccountUpdate.body.tokenId.assertEquals(
        accountUpdate.body.tokenId
      );
    } else {
      receiverAccountUpdate = AccountUpdate.defaultAccountUpdate(
        to,
        accountUpdate.body.tokenId
      );
    }
    makeChildAccountUpdate(accountUpdate, receiverAccountUpdate);

    // Sub the amount from the sender's account
    accountUpdate.body.balanceChange = Int64.fromObject(
      accountUpdate.body.balanceChange
    ).sub(amount);

    // Add the amount to send to the receiver's account
    receiverAccountUpdate.body.balanceChange = Int64.fromObject(
      receiverAccountUpdate.body.balanceChange
    ).add(amount);
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

  get update(): Update {
    return this.body.update;
  }

  static setValue<T>(maybeValue: SetOrKeep<T>, value: T) {
    maybeValue.isSome = Bool(true);
    maybeValue.value = value;
  }

  /** Constrain a property to lie between lower and upper bounds.
   *
   * @param property The property to constrain
   * @param lower The lower bound
   * @param upper The upper bound
   *
   * Example: To constrain the account balance of a SmartContract to lie between 0 and 20 MINA, you can use
   *
   * ```ts
   * @method onlyRunsWhenBalanceIsLow() {
   *   let lower = UInt64.zero;
   *   let upper = UInt64.fromNumber(20e9);
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

  /** Fix a property to a certain value.
   *
   * @param property The property to constrain
   * @param value The value it is fixed to
   *
   * Example: To fix the account nonce of a SmartContract to 0, you can use
   *
   * ```ts
   * @method onlyRunsWhenNonceIsZero() {
   *   AccountUpdate.assertEquals(this.self.body.preconditions.account.nonce, UInt32.zero);
   *   // ...
   * }
   * ```
   */
  static assertEquals<T>(property: OrIgnore<ClosedInterval<T> | T>, value: T) {
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

  sign(privateKey?: PrivateKey) {
    let nonce = AccountUpdate.getNonce(this);
    this.account.nonce.assertEquals(nonce);
    this.body.incrementNonce = Bool(true);
    Authorization.setLazySignature(this, { privateKey });
  }

  static signFeePayerInPlace(
    feePayer: FeePayerUnsigned,
    privateKey?: PrivateKey
  ) {
    feePayer.body.nonce = this.getNonce(feePayer);
    feePayer.authorization = Ledger.dummySignature();
    feePayer.lazyAuthorization = { kind: 'lazy-signature', privateKey };
  }

  static getNonce(accountUpdate: AccountUpdate | FeePayerUnsigned) {
    return memoizeWitness(UInt32, () =>
      AccountUpdate.getNonceUnchecked(accountUpdate)
    );
  }

  private static getNonceUnchecked(update: AccountUpdate | FeePayerUnsigned) {
    let publicKey = update.body.publicKey;
    let tokenId =
      update instanceof AccountUpdate ? update.body.tokenId : TokenId.default;
    let nonce = Number(
      Precondition.getAccountPreconditions(update.body).nonce.toString()
    );
    // if the fee payer is the same account update as this one, we have to start the nonce predicate at one higher,
    // bc the fee payer already increases its nonce
    let isFeePayer = Mina.currentTransaction()?.sender?.equals(publicKey);
    if (isFeePayer?.toBoolean()) nonce++;
    // now, we check how often this accountUpdate already updated its nonce in this tx, and increase nonce from `getAccount` by that amount
    CallForest.forEachPredecessor(
      Mina.currentTransaction.get().accountUpdates,
      update as AccountUpdate,
      (otherUpdate) => {
        let shouldIncreaseNonce = otherUpdate.publicKey
          .equals(publicKey)
          .and(otherUpdate.tokenId.equals(tokenId))
          .and(otherUpdate.body.incrementNonce);
        if (shouldIncreaseNonce.toBoolean()) nonce++;
      }
    );
    return UInt32.from(nonce);
  }

  toFields() {
    return Types.AccountUpdate.toFields(this);
  }

  toJSON() {
    return Types.AccountUpdate.toJSON(this);
  }

  hash() {
    // these two ways of hashing are (and have to be) consistent / produce the same hash
    // TODO: there's no reason anymore to use two different hashing methods here!
    // -- the "inCheckedComputation" branch works in all circumstances now
    // we just leave this here for a couple more weeks, because it checks consistency between
    // JS & OCaml hashing on *every single accountUpdate proof* we create. It will give us 100%
    // confidence that the two implementations are equivalent, and catch regressions quickly
    if (inCheckedComputation()) {
      let input = Types.AccountUpdate.toInput(this);
      return hashWithPrefix(prefixes.body, packToFields(input));
    } else {
      let json = Types.AccountUpdate.toJSON(this);
      return Ledger.hashAccountUpdateFromJson(JSON.stringify(json));
    }
  }

  // TODO: this was only exposed to be used in a unit test
  // consider removing when we have inline unit tests
  toPublicInput(): ZkappPublicInput {
    let accountUpdate = this.hash();
    let calls = CallForest.hashChildren(this);
    return { accountUpdate, calls };
  }

  static defaultAccountUpdate(address: PublicKey, tokenId?: Field) {
    const body = Body.keepAll(address);
    if (tokenId) {
      body.tokenId = tokenId;
      body.caller = tokenId;
    }
    return new AccountUpdate(body);
  }
  static dummy() {
    return this.defaultAccountUpdate(PublicKey.empty());
  }
  isDummy() {
    return this.body.publicKey.isEmpty();
  }

  static defaultFeePayer(
    address: PublicKey,
    key: PrivateKey,
    nonce: UInt32
  ): FeePayerUnsigned {
    let body = FeePayerBody.keepAll(address, nonce);
    return {
      body,
      authorization: Ledger.dummySignature(),
      lazyAuthorization: { kind: 'lazy-signature', privateKey: key },
    };
  }

  static dummyFeePayer(): FeePayerUnsigned {
    let body = FeePayerBody.keepAll(PublicKey.empty(), UInt32.zero);
    return { body, authorization: Ledger.dummySignature() };
  }

  static create(publicKey: PublicKey, tokenId?: Field) {
    let accountUpdate = AccountUpdate.defaultAccountUpdate(publicKey, tokenId);
    if (smartContractContext.has()) {
      makeChildAccountUpdate(
        smartContractContext.get().this.self,
        accountUpdate
      );
    } else {
      Mina.currentTransaction()?.accountUpdates.push(accountUpdate);
    }
    return accountUpdate;
  }

  static createSigned(signer: PrivateKey) {
    let publicKey = signer.toPublicKey();
    if (!Mina.currentTransaction.has()) {
      throw new Error(
        'AccountUpdate.createSigned: Cannot run outside of a transaction'
      );
    }
    let accountUpdate = AccountUpdate.defaultAccountUpdate(publicKey);
    // it's fine to compute the nonce outside the circuit, because we're constraining it with a precondition
    let nonce = Circuit.witness(UInt32, () =>
      AccountUpdate.getNonceUnchecked(accountUpdate)
    );
    accountUpdate.account.nonce.assertEquals(nonce);
    accountUpdate.body.incrementNonce = Bool(true);

    Authorization.setLazySignature(accountUpdate, { privateKey: signer });
    Mina.currentTransaction.get().accountUpdates.push(accountUpdate);
    return accountUpdate;
  }

  /**
   * Use this method to pay the account creation fee for another account.
   * Beware that you _don't_ need to pass in the new account!
   * Instead, the protocol will automatically identify accounts in your transaction that need funding.
   *
   * If you provide an optional `initialBalance`, this will be subtracted from the fee-paying account as well,
   * but you have to separately ensure that it's added to the new account's balance.
   *
   * @param feePayerKey the private key of the account that pays the fee
   * @param initialBalance the initial balance of the new account (default: 0)
   */
  static fundNewAccount(
    feePayerKey: PrivateKey,
    { initialBalance = UInt64.zero as number | string | UInt64 } = {}
  ) {
    let accountUpdate = AccountUpdate.createSigned(feePayerKey);
    let amount =
      initialBalance instanceof UInt64
        ? initialBalance
        : UInt64.fromString(`${initialBalance}`);
    accountUpdate.balance.subInPlace(amount.add(Mina.accountCreationFee()));
  }

  static witness<T>(
    type: AsFieldElements<T>,
    compute: () => { accountUpdate: AccountUpdate; result: T },
    { skipCheck = false } = {}
  ) {
    // construct the circuit type for a accountUpdate + other result
    let accountUpdateType = circuitArray(
      Field,
      Types.AccountUpdate.sizeInFields()
    );
    type combinedType = { accountUpdate: Field[]; result: T };
    let combinedType = circuitValue<combinedType>({
      accountUpdate: accountUpdateType,
      result: type,
    });

    // compute the witness, with the accountUpdate represented as plain field elements
    // (in the prover, also store the actual accountUpdate)
    let proverAccountUpdate: AccountUpdate | undefined;
    let fieldsAndResult = Circuit.witness<combinedType>(combinedType, () => {
      let { accountUpdate, result } = compute();
      proverAccountUpdate = accountUpdate;
      let fields = Types.AccountUpdate.toFields(accountUpdate).map((x) =>
        x.toConstant()
      );
      return { accountUpdate: fields, result };
    });

    // get back a Types.AccountUpdate from the fields + aux (where aux is just the default in compile)
    let aux = Types.AccountUpdate.toAuxiliary(proverAccountUpdate);
    let rawAccountUpdate = Types.AccountUpdate.fromFields(
      fieldsAndResult.accountUpdate,
      aux
    );
    // usually when we introduce witnesses, we add checks for their type-specific properties (e.g., booleanness).
    // a accountUpdate, however, might already be forced to be valid by the on-chain transaction logic,
    // allowing us to skip expensive checks in user proofs.
    if (!skipCheck) Types.AccountUpdate.check(rawAccountUpdate);

    // construct the full AccountUpdate instance from the raw accountUpdate + (maybe) the prover accountUpdate
    let accountUpdate = new AccountUpdate(
      rawAccountUpdate.body,
      rawAccountUpdate.authorization
    );
    accountUpdate.lazyAuthorization =
      proverAccountUpdate &&
      cloneCircuitValue(proverAccountUpdate.lazyAuthorization);
    accountUpdate.children = proverAccountUpdate?.children ?? {
      accountUpdates: [],
    };
    accountUpdate.parent = proverAccountUpdate?.parent;
    return { accountUpdate, result: fieldsAndResult.result };
  }

  /**
   * Like AccountUpdate.witness, but lets you specify a layout for the accountUpdate's children,
   * which also get witnessed
   */
  static witnessTree<T>(
    resultType: AsFieldElements<T>,
    childLayout: AccountUpdatesLayout,
    compute: () => { accountUpdate: AccountUpdate; result: T },
    options?: { skipCheck: boolean }
  ) {
    // witness the root accountUpdate
    let { accountUpdate, result } = AccountUpdate.witness(
      resultType,
      compute,
      options
    );
    // stop early if children === undefined
    if (childLayout === undefined) {
      let calls = Circuit.witness(Field, () =>
        CallForest.hashChildren(accountUpdate)
      );
      accountUpdate.children.calls = calls;
      return { accountUpdate, result };
    }
    let childArray: AccountUpdatesLayout[] =
      typeof childLayout === 'number'
        ? Array(childLayout).fill(0)
        : childLayout;
    let n = childArray.length;
    for (let i = 0; i < n; i++) {
      accountUpdate.children.accountUpdates[i] = AccountUpdate.witnessTree(
        circuitValue<null>(null),
        childArray[i],
        () => ({
          accountUpdate:
            accountUpdate.children.accountUpdates[i] ?? AccountUpdate.dummy(),
          result: null,
        }),
        options
      ).accountUpdate;
    }
    accountUpdate.children.calls = CallForest.hashChildren(accountUpdate);
    if (n === 0) {
      accountUpdate.children.calls.assertEquals(CallForest.emptyHash());
    }
    return { accountUpdate, result };
  }
}

/**
 * Describes list of accountUpdates (call forest) to be witnessed.
 *
 * An accountUpdates list is represented by either
 * - an array, whose entries are accountUpdates, each represented by their list of children
 * - a positive integer, which gives the number of top-level accountUpdates, which aren't allowed to have further children
 * - `undefined`, which means just the `calls` (call forest hash) is witnessed, allowing arbitrary accountUpdates but no access to them in the circuit
 *
 * Examples:
 * ```ts
 * []              // an empty accountUpdates list
 * 0               // same as []
 * [0]             // a list of one accountUpdate, which doesn't have children
 * 1               // same as [0]
 * 2               // same as [0, 0]
 * undefined       // an arbitrary list of accountUpdates
 * [undefined, 1]  // a list of 2 accountUpdates, of which one has arbitrary children and the other has exactly 1 child
 * ```
 */
type AccountUpdatesLayout = number | undefined | AccountUpdatesLayout[];

const CallForest = {
  // similar to Mina_base.ZkappCommand.Call_forest.to_account_updates_list
  // takes a list of accountUpdates, which each can have children, so they form a "forest" (list of trees)
  // returns a flattened list, with `accountUpdate.body.callDepth` specifying positions in the forest
  // also removes any "dummy" accountUpdates
  toFlatList(forest: AccountUpdate[], depth = 0): AccountUpdate[] {
    let accountUpdates = [];
    for (let accountUpdate of forest) {
      if (accountUpdate.isDummy().toBoolean()) continue;
      accountUpdate.body.callDepth = depth;
      let children = accountUpdate.children.accountUpdates;
      accountUpdates.push(
        accountUpdate,
        ...CallForest.toFlatList(children, depth + 1)
      );
    }
    return accountUpdates;
  },

  // Mina_base.Zkapp_command.Digest.Forest.empty
  emptyHash() {
    return Field.zero;
  },

  // similar to Mina_base.Zkapp_command.Call_forest.accumulate_hashes
  // hashes a accountUpdate's children (and their children, and ...) to compute the `calls` field of ZkappPublicInput
  hashChildren({ children }: AccountUpdate): Field {
    // only compute calls if it's not there yet --
    // this gives us the flexibility to witness a specific layout of accountUpdates
    if (children.calls !== undefined) return children.calls;
    let stackHash = CallForest.emptyHash();
    for (let accountUpdate of [...children.accountUpdates].reverse()) {
      let calls = CallForest.hashChildren(accountUpdate);
      let nodeHash = hashWithPrefix(prefixes.accountUpdateNode, [
        accountUpdate.hash(),
        calls,
      ]);
      let newHash = hashWithPrefix(prefixes.accountUpdateCons, [
        nodeHash,
        stackHash,
      ]);
      // skip accountUpdate if it's a dummy
      stackHash = Circuit.if(accountUpdate.isDummy(), stackHash, newHash);
    }
    return stackHash;
  },

  forEach(updates: AccountUpdate[], callback: (update: AccountUpdate) => void) {
    for (let update of updates) {
      callback(update);
      CallForest.forEach(update.children.accountUpdates, callback);
    }
  },

  forEachPredecessor(
    updates: AccountUpdate[],
    update: AccountUpdate,
    callback: (update: AccountUpdate) => void
  ) {
    let isPredecessor = true;
    CallForest.forEach(updates, (otherUpdate) => {
      if (otherUpdate === update) isPredecessor = false;
      if (isPredecessor) callback(otherUpdate);
    });
  },
};

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
  child.parent = parent;
  if (
    !parent.children.accountUpdates.find(
      (accountUpdate) => accountUpdate === child
    )
  ) {
    parent.children.accountUpdates.push(child);
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

function zkappCommandToJson({ feePayer, accountUpdates, memo }: ZkappCommand) {
  memo = Ledger.memoToBase58(memo);
  return Types.ZkappCommand.toJSON({ feePayer, accountUpdates, memo });
}

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
  setProof(accountUpdate: AccountUpdate, proof: string) {
    accountUpdate.authorization = { proof };
    accountUpdate.lazyAuthorization = undefined;
  },
  setLazySignature(
    accountUpdate: AccountUpdate,
    signature?: Omit<LazySignature, 'kind'>
  ) {
    signature ??= {};
    accountUpdate.authorization = {};
    accountUpdate.lazyAuthorization = { ...signature, kind: 'lazy-signature' };
  },
  setLazyProof(accountUpdate: AccountUpdate, proof: Omit<LazyProof, 'kind'>) {
    accountUpdate.authorization = {};
    accountUpdate.lazyAuthorization = { ...proof, kind: 'lazy-proof' };
  },
};

function addMissingSignatures(
  zkappCommand: ZkappCommand,
  additionalKeys = [] as PrivateKey[]
): ZkappCommandSigned {
  let additionalPublicKeys = additionalKeys.map((sk) => sk.toPublicKey());
  let { commitment, fullCommitment } = Ledger.transactionCommitments(
    JSON.stringify(zkappCommandToJson(zkappCommand))
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
        let pk = PublicKey.toBase58(accountUpdate.body.publicKey);
        throw Error(
          `addMissingSignatures: Cannot add signature for fee payer (${pk}), private key is missing.`
        );
      }
      privateKey = additionalKeys[i];
    }
    let signature = Ledger.signFieldElement(fullCommitment, privateKey);
    return { body, authorization: signature };
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
      if (i === -1)
        throw Error(
          `addMissingSignatures: Cannot add signature for ${accountUpdate.publicKey.toBase58()}, private key is missing.`
        );
      privateKey = additionalKeys[i];
    }
    let transactionCommitment = accountUpdate.body.useFullCommitment.toBoolean()
      ? fullCommitment
      : commitment;
    let signature = Ledger.signFieldElement(transactionCommitment, privateKey);
    Authorization.setSignature(accountUpdate, signature);
    return accountUpdate as AccountUpdate & { lazyAuthorization: undefined };
  }
  let { feePayer, accountUpdates, memo } = zkappCommand;
  return {
    feePayer: addFeePayerSignature(feePayer),
    accountUpdates: accountUpdates.map(addSignature),
    memo,
  };
}

/**
 * The public input for zkApps consists of certain hashes of the proving AccountUpdate (and its child accountUpdates) which is constructed during method execution.

  For SmartContract proving, a method is run twice: First outside the proof, to obtain the public input, and once in the prover,
  which takes the public input as input. The current transaction is hashed again inside the prover, which asserts that the result equals the input public input,
  as part of the snark circuit. The block producer will also hash the transaction they receive and pass it as a public input to the verifier.
  Thus, the transaction is fully constrained by the proof - the proof couldn't be used to attest to a different transaction.
 */
type ZkappPublicInput = { accountUpdate: Field; calls: Field };
let ZkappPublicInput = circuitValue<ZkappPublicInput>(
  { accountUpdate: Field, calls: Field },
  { customObjectKeys: ['accountUpdate', 'calls'] }
);

function accountUpdateToPublicInput(self: AccountUpdate): ZkappPublicInput {
  let accountUpdate = self.hash();
  let calls = CallForest.hashChildren(self);
  return { accountUpdate, calls };
}

async function addMissingProofs(zkappCommand: ZkappCommand): Promise<{
  zkappCommand: ZkappCommandProved;
  proofs: (Proof<ZkappPublicInput> | undefined)[];
}> {
  type AccountUpdateProved = AccountUpdate & {
    lazyAuthorization?: LazySignature;
  };

  async function addProof(accountUpdate: AccountUpdate) {
    accountUpdate = AccountUpdate.clone(accountUpdate);
    if (accountUpdate.lazyAuthorization?.kind !== 'lazy-proof') {
      return {
        accountUpdateProved: accountUpdate as AccountUpdateProved,
        proof: undefined,
      };
    }
    let {
      methodName,
      args,
      previousProofs,
      ZkappClass,
      memoized,
      blindingValue,
    } = accountUpdate.lazyAuthorization;
    let publicInput = accountUpdateToPublicInput(accountUpdate);
    let publicInputFields = ZkappPublicInput.toFields(publicInput);
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
    let [, [, proof]] = await snarkContext.runWithAsync(
      {
        inProver: true,
        witnesses: [accountUpdate.publicKey, accountUpdate.tokenId, ...args],
        proverData: accountUpdate,
      },
      () =>
        memoizationContext.runWithAsync(
          { memoized, currentIndex: 0, blindingValue },
          () => provers[i](publicInputFields, previousProofs)
        )
    );
    Authorization.setProof(
      accountUpdate,
      Pickles.proofToBase64Transaction(proof)
    );
    let maxProofsVerified = ZkappClass._maxProofsVerified!;
    const Proof = ZkappClass.Proof();
    return {
      accountUpdateProved: accountUpdate as AccountUpdateProved,
      proof: new Proof({ publicInput, proof, maxProofsVerified }),
    };
  }

  let { feePayer, accountUpdates, memo } = zkappCommand;
  // compute proofs serially. in parallel would clash with our global variable hacks
  let accountUpdatesProved: AccountUpdateProved[] = [];
  let proofs: (Proof<ZkappPublicInput> | undefined)[] = [];
  for (let accountUpdate of accountUpdates) {
    let { accountUpdateProved, proof } = await addProof(accountUpdate);
    accountUpdatesProved.push(accountUpdateProved);
    proofs.push(proof);
  }
  return {
    zkappCommand: { feePayer, accountUpdates: accountUpdatesProved, memo },
    proofs,
  };
}

/**
 * Sign all accountUpdates of a transaction which belong to the account determined by [[ `privateKey` ]].
 * @returns the modified transaction JSON
 */
function signJsonTransaction(
  transactionJson: string,
  privateKey: PrivateKey | string
) {
  if (typeof privateKey === 'string')
    privateKey = PrivateKey.fromBase58(privateKey);
  let publicKey = privateKey.toPublicKey().toBase58();
  let zkappCommand: Types.Json.ZkappCommand = JSON.parse(transactionJson);
  let feePayer = zkappCommand.feePayer;
  if (feePayer.body.publicKey === publicKey) {
    zkappCommand = JSON.parse(
      Ledger.signFeePayer(JSON.stringify(zkappCommand), privateKey)
    );
  }
  for (let i = 0; i < zkappCommand.accountUpdates.length; i++) {
    let accountUpdate = zkappCommand.accountUpdates[i];
    if (
      accountUpdate.body.publicKey === publicKey &&
      accountUpdate.authorization.proof === null
    ) {
      zkappCommand = JSON.parse(
        Ledger.signAccountUpdate(JSON.stringify(zkappCommand), privateKey, i)
      );
    }
  }
  return JSON.stringify(zkappCommand);
}
