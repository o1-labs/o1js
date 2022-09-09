import {
  circuitArray,
  circuitValue,
  cloneCircuitValue,
  memoizationContext,
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
import {
  emptyWitness,
  inCheckedComputation,
  inCompileMode,
  inProver,
  Proof,
  snarkContext,
} from './proof_system.js';
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
export { Permissions, Party, ZkappPublicInput };

// internal API
export {
  smartContractContext,
  SetOrKeep,
  Permission,
  Preconditions,
  Body,
  Authorization,
  FeePayerUnsigned,
  Parties,
  partiesToJson,
  addMissingSignatures,
  addMissingProofs,
  signJsonTransaction,
  ZkappStateLength,
  Events,
  SequenceEvents,
  partyToPublicInput,
  TokenId,
  Token,
  CallForest,
  createChildParty,
  makeChildParty,
  PartiesLayout,
};

const ZkappStateLength = 8;

let smartContractContext = Context.create<{
  this: SmartContract;
  methodCallDepth: number;
  isCallback: boolean;
  selfUpdate: Party;
}>();

type PartyBody = Types.Party['body'];
type Update = PartyBody['update'];

/**
 * Preconditions for the network and accounts
 */
type Preconditions = PartyBody['preconditions'];

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
 * The body of describing how some [[ Party ]] should change.
 *
 * TODO: We need to rename this still.
 */
interface Body extends PartyBody {
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
      // this should be set to true if parties are signed
      incrementNonce: Bool(false),
    };
  },

  dummy(): Body {
    return Body.keepAll(PublicKey.empty());
  },
};

type FeePayer = Types.Parties['feePayer'];
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
    Party.assertEquals(p.nonce, nonce);
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

type Control = Types.Party['authorization'];
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

class Party implements Types.Party {
  body: Body;
  authorization: Control;
  lazyAuthorization: LazySignature | LazyProof | undefined = undefined;
  account: Precondition.Account;
  network: Precondition.Network;
  children: { calls?: Field; parties: Party[] } = { parties: [] };
  parent: Party | undefined = undefined;

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

  static clone(party: Party) {
    let body = cloneCircuitValue(party.body);
    let authorization = cloneCircuitValue(party.authorization);
    let clonedParty = new (Party as any)(body, authorization, party.isSelf);
    clonedParty.lazyAuthorization = cloneCircuitValue(party.lazyAuthorization);
    clonedParty.children = party.children;
    clonedParty.parent = party.parent;
    return clonedParty;
  }

  token() {
    let thisParty = this;
    let customToken = new Token({
      tokenOwner: thisParty.body.publicKey,
      parentTokenId: thisParty.body.tokenId,
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
        let receiverParty = createChildParty(thisParty, address, this.id);

        // Add the amount to mint to the receiver's account
        receiverParty.body.balanceChange = Int64.fromObject(
          receiverParty.body.balanceChange
        ).add(amount);
        return receiverParty;
      },

      burn({
        address,
        amount,
      }: {
        address: PublicKey;
        amount: number | bigint | UInt64;
      }) {
        let senderParty = createChildParty(thisParty, address, this.id);
        senderParty.body.useFullCommitment = Bool(true);

        // Sub the amount to burn from the sender's account
        senderParty.body.balanceChange = Int64.fromObject(
          senderParty.body.balanceChange
        ).sub(amount);

        // Require signature from the sender account being deducted
        Authorization.setLazySignature(senderParty);
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
        // Create a new party for the sender to send the amount to the receiver
        let senderParty = createChildParty(thisParty, from, this.id);
        senderParty.body.useFullCommitment = Bool(true);

        let i0 = senderParty.body.balanceChange;
        senderParty.body.balanceChange = new Int64(i0.magnitude, i0.sgn).sub(
          amount
        );

        // Require signature from the sender party
        Authorization.setLazySignature(senderParty);

        let receiverParty = createChildParty(thisParty, to, this.id);

        // Add the amount to send to the receiver's account
        let i1 = receiverParty.body.balanceChange;
        receiverParty.body.balanceChange = new Int64(i1.magnitude, i1.sgn).add(
          amount
        );
        return receiverParty;
      },
    };
  }

  get tokenId() {
    return this.body.tokenId;
  }

  get tokenSymbol() {
    let party = this;

    return {
      set(tokenSymbol: string) {
        Party.setValue(party.update.tokenSymbol, TokenSymbol.from(tokenSymbol));
      },
    };
  }

  send({
    to,
    amount,
  }: {
    to: PublicKey | Party;
    amount: number | bigint | UInt64;
  }) {
    let party = this;
    let receiverParty;
    if (to instanceof Party) {
      receiverParty = to;
      receiverParty.body.tokenId.assertEquals(party.body.tokenId);
    } else {
      receiverParty = Party.defaultParty(to, party.body.tokenId);
    }
    makeChildParty(party, receiverParty);

    // Sub the amount from the sender's account
    party.body.balanceChange = Int64.fromObject(party.body.balanceChange).sub(
      amount
    );

    // Add the amount to send to the receiver's account
    receiverParty.body.balanceChange = Int64.fromObject(
      receiverParty.body.balanceChange
    ).add(amount);
  }

  get balance() {
    let party = this;

    return {
      addInPlace(x: Int64 | UInt32 | UInt64 | string | number | bigint) {
        let { magnitude, sgn } = party.body.balanceChange;
        party.body.balanceChange = new Int64(magnitude, sgn).add(x);
      },
      subInPlace(x: Int64 | UInt32 | UInt64 | string | number | bigint) {
        let { magnitude, sgn } = party.body.balanceChange;
        party.body.balanceChange = new Int64(magnitude, sgn).sub(x);
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
   *   Party.assertBetween(this.self.body.preconditions.account.balance, lower, upper);
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
   *   Party.assertEquals(this.self.body.preconditions.account.nonce, UInt32.zero);
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
    let nonce = Party.getNonce(this);
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

  static getNonce(party: Party | FeePayerUnsigned) {
    if (inCompileMode()) {
      return emptyWitness(UInt32);
    }
    return inProver()
      ? Circuit.witness(UInt32, () => Party.getNonceUnchecked(party))
      : Party.getNonceUnchecked(party);
  }

  private static getNonceUnchecked(update: Party | FeePayerUnsigned) {
    let publicKey = update.body.publicKey;
    let nonce = Number(
      Precondition.getAccountPreconditions(update.body).nonce.toString()
    );
    // if the fee payer is the same party as this one, we have to start the nonce predicate at one higher,
    // bc the fee payer already increases its nonce
    let isFeePayer = Mina.currentTransaction()?.sender?.equals(publicKey);
    if (isFeePayer?.toBoolean()) nonce++;
    // now, we check how often this party already updated its nonce in this tx, and increase nonce from `getAccount` by that amount
    CallForest.forEach(Mina.currentTransaction.get().parties, (update) => {
      let shouldIncreaseNonce = update.publicKey
        .equals(publicKey)
        .and(update.body.incrementNonce);
      if (shouldIncreaseNonce.toBoolean()) nonce++;
    });
    return UInt32.from(nonce);
  }

  toFields() {
    return Types.Party.toFields(this);
  }

  toJSON() {
    return Types.Party.toJSON(this);
  }

  hash() {
    // these two ways of hashing are (and have to be) consistent / produce the same hash
    // TODO: there's no reason anymore to use two different hashing methods here!
    // -- the "inCheckedComputation" branch works in all circumstances now
    // we just leave this here for a couple more weeks, because it checks consistency between
    // JS & OCaml hashing on *every single party proof* we create. It will give us 100%
    // confidence that the two implementations are equivalent, and catch regressions quickly
    if (inCheckedComputation()) {
      let input = Types.Party.toInput(this);
      return hashWithPrefix(prefixes.body, packToFields(input));
    } else {
      let json = Types.Party.toJSON(this);
      return Ledger.hashPartyFromJson(JSON.stringify(json));
    }
  }

  // TODO: this was only exposed to be used in a unit test
  // consider removing when we have inline unit tests
  toPublicInput(): ZkappPublicInput {
    let party = this.hash();
    let calls = CallForest.hashChildren(this);
    return { party, calls };
  }

  static defaultParty(address: PublicKey, tokenId?: Field) {
    const body = Body.keepAll(address);
    if (tokenId) {
      body.tokenId = tokenId;
      body.caller = tokenId;
    }
    return new Party(body);
  }
  static dummy() {
    return this.defaultParty(PublicKey.empty());
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
    let party = Party.defaultParty(publicKey, tokenId);
    if (smartContractContext.has()) {
      makeChildParty(smartContractContext.get().this.self, party);
    } else {
      Mina.currentTransaction()?.parties.push(party);
    }
    return party;
  }

  static createSigned(signer: PrivateKey) {
    let publicKey = signer.toPublicKey();
    if (!Mina.currentTransaction.has()) {
      throw new Error(
        'Party.createSigned: Cannot run outside of a transaction'
      );
    }
    let party = Party.defaultParty(publicKey);
    // it's fine to compute the nonce outside the circuit, because we're constraining it with a precondition
    let nonce = Circuit.witness(UInt32, () => Party.getNonceUnchecked(party));
    party.account.nonce.assertEquals(nonce);
    party.body.incrementNonce = Bool(true);

    Authorization.setLazySignature(party, { privateKey: signer });
    Mina.currentTransaction.get().parties.push(party);
    return party;
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
    let party = Party.createSigned(feePayerKey);
    let amount =
      initialBalance instanceof UInt64
        ? initialBalance
        : UInt64.fromString(`${initialBalance}`);
    party.balance.subInPlace(amount.add(Mina.accountCreationFee()));
  }

  static witness<T>(
    type: AsFieldElements<T>,
    compute: () => { party: Party; result: T },
    { skipCheck = false } = {}
  ) {
    // construct the circuit type for a party + other result
    let partyType = circuitArray(Field, Types.Party.sizeInFields());
    type combinedType = { party: Field[]; result: T };
    let combinedType = circuitValue<combinedType>({
      party: partyType,
      result: type,
    });

    // compute the witness, with the party represented as plain field elements
    // (in the prover, also store the actual party)
    let proverParty: Party | undefined;
    let fieldsAndResult = Circuit.witness<combinedType>(combinedType, () => {
      let { party, result } = compute();
      proverParty = party;
      return { party: Types.Party.toFields(party), result };
    });

    // get back a Types.Party from the fields + aux (where aux is just the default in compile)
    let aux = Types.Party.toAuxiliary(proverParty);
    let rawParty = Types.Party.fromFields(fieldsAndResult.party, aux);
    // usually when we introduce witnesses, we add checks for their type-specific properties (e.g., booleanness).
    // a party, however, might already be forced to be valid by the on-chain transaction logic,
    // allowing us to skip expensive checks in user proofs.
    if (!skipCheck) Types.Party.check(rawParty);

    // construct the full Party instance from the raw party + (maybe) the prover party
    let party = new Party(rawParty.body, rawParty.authorization);
    party.lazyAuthorization =
      proverParty && cloneCircuitValue(proverParty.lazyAuthorization);
    party.children = proverParty?.children ?? { parties: [] };
    party.parent = proverParty?.parent;
    return { party, result: fieldsAndResult.result };
  }

  /**
   * Like Party.witness, but lets you specify a layout for the party's children,
   * which also get witnessed
   */
  static witnessTree<T>(
    resultType: AsFieldElements<T>,
    childLayout: PartiesLayout,
    compute: () => { party: Party; result: T },
    options?: { skipCheck: boolean }
  ) {
    // witness the root party
    let { party, result } = Party.witness(resultType, compute, options);
    // stop early if children === undefined
    if (childLayout === undefined) {
      let calls = Circuit.witness(Field, () => CallForest.hashChildren(party));
      party.children.calls = calls;
      return { party, result };
    }
    let childArray: PartiesLayout[] =
      typeof childLayout === 'number'
        ? Array(childLayout).fill(0)
        : childLayout;
    let n = childArray.length;
    for (let i = 0; i < n; i++) {
      party.children.parties[i] = Party.witnessTree(
        circuitValue<null>(null),
        childArray[i],
        () => ({
          party: party.children.parties[i] ?? Party.dummy(),
          result: null,
        }),
        options
      ).party;
    }
    party.children.calls = CallForest.hashChildren(party);
    if (n === 0) {
      party.children.calls.assertEquals(CallForest.emptyHash());
    }
    return { party, result };
  }
}

/**
 * Describes list of parties (call forest) to be witnessed.
 *
 * A parties list is represented by either
 * - an array, whose entries are parties, each represented by their list of children
 * - a positive integer, which gives the number of top-level parties, which aren't allowed to have further children
 * - `undefined`, which means just the `calls` (call forest hash) is witnessed, allowing arbitrary parties but no access to them in the circuit
 *
 * Examples:
 * ```ts
 * []              // an empty parties list
 * 0               // same as []
 * [0]             // a list of one party, which doesn't have children
 * 1               // same as [0]
 * 2               // same as [0, 0]
 * undefined       // an arbitrary list of parties
 * [undefined, 1]  // a list of 2 parties, of which one has arbitrary children and the other has exactly 1 child
 * ```
 */
type PartiesLayout = number | undefined | PartiesLayout[];

const CallForest = {
  // similar to Mina_base.Parties.Call_forest.to_parties_list
  // takes a list of parties, which each can have children, so they form a "forest" (list of trees)
  // returns a flattened list, with `party.body.callDepth` specifying positions in the forest
  // also removes any "dummy" parties
  toFlatList(forest: Party[], depth = 0): Party[] {
    let parties = [];
    for (let party of forest) {
      if (party.isDummy().toBoolean()) continue;
      party.body.callDepth = depth;
      let children = party.children.parties;
      parties.push(party, ...CallForest.toFlatList(children, depth + 1));
    }
    return parties;
  },

  // Mina_base.Parties.Digest.Forest.empty
  emptyHash() {
    return Field.zero;
  },

  // similar to Mina_base.Parties.Call_forest.accumulate_hashes
  // hashes a party's children (and their children, and ...) to compute the `calls` field of ZkappPublicInput
  hashChildren({ children }: Party): Field {
    // only compute calls if it's not there yet --
    // this gives us the flexibility to witness a specific layout of parties
    if (children.calls !== undefined) return children.calls;
    let stackHash = CallForest.emptyHash();
    for (let party of [...children.parties].reverse()) {
      let calls = CallForest.hashChildren(party);
      let nodeHash = hashWithPrefix(prefixes.partyNode, [party.hash(), calls]);
      // stackHash = hashWithPrefix(prefixes.partyCons, [nodeHash, stackHash]);
      let newHash = hashWithPrefix(prefixes.partyCons, [nodeHash, stackHash]);
      // skip party if it's a dummy
      stackHash = Circuit.if(party.isDummy(), stackHash, newHash);
    }
    return stackHash;
  },

  forEach(updates: Party[], callback: (update: Party) => void) {
    for (let update of updates) {
      callback(update);
      CallForest.forEach(update.children.parties, callback);
    }
  },
};

function createChildParty(
  parent: Party,
  childAddress: PublicKey,
  tokenId?: Field
) {
  let child = Party.defaultParty(childAddress, tokenId);
  makeChildParty(parent, child);
  return child;
}
function makeChildParty(parent: Party, child: Party) {
  child.body.callDepth = parent.body.callDepth + 1;
  child.parent = parent;
  if (!parent.children.parties.find((party) => party === child)) {
    parent.children.parties.push(child);
  }
}

// authorization

type Parties = {
  feePayer: FeePayerUnsigned;
  otherParties: Party[];
  memo: string;
};
type PartiesSigned = {
  feePayer: FeePayer;
  otherParties: (Party & { lazyAuthorization?: LazyProof })[];
  memo: string;
};
type PartiesProved = {
  feePayer: FeePayerUnsigned;
  otherParties: (Party & { lazyAuthorization?: LazySignature })[];
  memo: string;
};

function partiesToJson({ feePayer, otherParties, memo }: Parties) {
  memo = Ledger.memoToBase58(memo);
  return Types.Parties.toJSON({ feePayer, otherParties, memo });
}

const Authorization = {
  hasLazyProof(party: Party) {
    return party.lazyAuthorization?.kind === 'lazy-proof';
  },
  hasAny(party: Party) {
    let { authorization: auth, lazyAuthorization: lazyAuth } = party;
    return !!(lazyAuth || 'proof' in auth || 'signature' in auth);
  },
  setSignature(party: Party, signature: string) {
    party.authorization = { signature };
    party.lazyAuthorization = undefined;
  },
  setProof(party: Party, proof: string) {
    party.authorization = { proof };
    party.lazyAuthorization = undefined;
  },
  setLazySignature(party: Party, signature?: Omit<LazySignature, 'kind'>) {
    signature ??= {};
    party.authorization = {};
    party.lazyAuthorization = { ...signature, kind: 'lazy-signature' };
  },
  setLazyProof(party: Party, proof: Omit<LazyProof, 'kind'>) {
    party.authorization = {};
    party.lazyAuthorization = { ...proof, kind: 'lazy-proof' };
  },
};

function addMissingSignatures(
  parties: Parties,
  additionalKeys = [] as PrivateKey[]
): PartiesSigned {
  let additionalPublicKeys = additionalKeys.map((sk) => sk.toPublicKey());
  let { commitment, fullCommitment } = Ledger.transactionCommitments(
    JSON.stringify(partiesToJson(parties))
  );
  function addFeePayerSignature(party: FeePayerUnsigned): FeePayer {
    let { body, authorization, lazyAuthorization } = cloneCircuitValue(party);
    if (lazyAuthorization === undefined) return { body, authorization };
    let { privateKey } = lazyAuthorization;
    if (privateKey === undefined) {
      let i = additionalPublicKeys.findIndex((pk) =>
        pk.equals(party.body.publicKey).toBoolean()
      );
      if (i === -1) {
        let pk = PublicKey.toBase58(party.body.publicKey);
        throw Error(
          `addMissingSignatures: Cannot add signature for fee payer (${pk}), private key is missing.`
        );
      }
      privateKey = additionalKeys[i];
    }
    let signature = Ledger.signFieldElement(fullCommitment, privateKey);
    return { body, authorization: signature };
  }

  function addSignature(party: Party) {
    party = Party.clone(party);
    if (party.lazyAuthorization?.kind !== 'lazy-signature') {
      return party as Party & { lazyAuthorization?: LazyProof };
    }
    let { privateKey } = party.lazyAuthorization;
    if (privateKey === undefined) {
      let i = additionalPublicKeys.findIndex((pk) =>
        pk.equals(party.body.publicKey).toBoolean()
      );
      if (i === -1)
        throw Error(
          `addMissingSignatures: Cannot add signature for ${party.publicKey.toBase58()}, private key is missing.`
        );
      privateKey = additionalKeys[i];
    }
    let transactionCommitment = party.body.useFullCommitment.toBoolean()
      ? fullCommitment
      : commitment;
    let signature = Ledger.signFieldElement(transactionCommitment, privateKey);
    Authorization.setSignature(party, signature);
    return party as Party & { lazyAuthorization: undefined };
  }
  let { feePayer, otherParties, memo } = parties;
  return {
    feePayer: addFeePayerSignature(feePayer),
    otherParties: otherParties.map(addSignature),
    memo,
  };
}

/**
 * The public input for zkApps consists of certain hashes of the proving Party (and its child parties) which is constructed during method execution.

  For SmartContract proving, a method is run twice: First outside the proof, to obtain the public input, and once in the prover,
  which takes the public input as input. The current transaction is hashed again inside the prover, which asserts that the result equals the input public input,
  as part of the snark circuit. The block producer will also hash the transaction they receive and pass it as a public input to the verifier.
  Thus, the transaction is fully constrained by the proof - the proof couldn't be used to attest to a different transaction.
 */
type ZkappPublicInput = { party: Field; calls: Field };
let ZkappPublicInput = circuitValue<ZkappPublicInput>(
  { party: Field, calls: Field },
  { customObjectKeys: ['party', 'calls'] }
);

function partyToPublicInput(self: Party): ZkappPublicInput {
  let party = self.hash();
  let calls = CallForest.hashChildren(self);
  return { party, calls };
}

async function addMissingProofs(parties: Parties): Promise<{
  parties: PartiesProved;
  proofs: (Proof<ZkappPublicInput> | undefined)[];
}> {
  type PartyProved = Party & { lazyAuthorization?: LazySignature };

  async function addProof(party: Party) {
    party = Party.clone(party);
    if (party.lazyAuthorization?.kind !== 'lazy-proof') {
      return { partyProved: party as PartyProved, proof: undefined };
    }
    let {
      methodName,
      args,
      previousProofs,
      ZkappClass,
      memoized,
      blindingValue,
    } = party.lazyAuthorization;
    let publicInput = partyToPublicInput(party);
    let publicInputFields = ZkappPublicInput.toFields(publicInput);
    if (ZkappClass._provers === undefined)
      throw Error(
        `Cannot prove execution of ${methodName}(), no prover found. ` +
          `Try calling \`await ${ZkappClass.name}.compile(address)\` first, this will cache provers in the background.`
      );
    let provers = ZkappClass._provers;
    let methodError =
      `Error when computing proofs: Method ${methodName} not found. ` +
      `Make sure your environment supports decorators, and annotate with \`@method ${methodName}\`.`;
    if (ZkappClass._methods === undefined) throw Error(methodError);
    let i = ZkappClass._methods.findIndex((m) => m.methodName === methodName);
    if (i === -1) throw Error(methodError);
    let [, [, proof]] = await snarkContext.runWithAsync(
      { inProver: true, witnesses: args },
      () =>
        memoizationContext.runWithAsync(
          { memoized, currentIndex: 0, blindingValue },
          () => provers[i](publicInputFields, previousProofs)
        )
    );
    Authorization.setProof(party, Pickles.proofToBase64Transaction(proof));
    let maxProofsVerified = ZkappClass._maxProofsVerified!;
    const Proof = ZkappClass.Proof();
    return {
      partyProved: party as PartyProved,
      proof: new Proof({ publicInput, proof, maxProofsVerified }),
    };
  }

  let { feePayer, otherParties, memo } = parties;
  // compute proofs serially. in parallel would clash with our global variable hacks
  let otherPartiesProved: PartyProved[] = [];
  let proofs: (Proof<ZkappPublicInput> | undefined)[] = [];
  for (let party of otherParties) {
    let { partyProved, proof } = await addProof(party);
    otherPartiesProved.push(partyProved);
    proofs.push(proof);
  }
  return {
    parties: { feePayer, otherParties: otherPartiesProved, memo },
    proofs,
  };
}

/**
 * Sign all parties of a transaction which belong to the account determined by [[ `privateKey` ]].
 * @returns the modified transaction JSON
 */
function signJsonTransaction(
  transactionJson: string,
  privateKey: PrivateKey | string
) {
  if (typeof privateKey === 'string')
    privateKey = PrivateKey.fromBase58(privateKey);
  let publicKey = privateKey.toPublicKey().toBase58();
  let parties: Types.Json.Parties = JSON.parse(transactionJson);
  let feePayer = parties.feePayer;
  if (feePayer.body.publicKey === publicKey) {
    parties = JSON.parse(
      Ledger.signFeePayer(JSON.stringify(parties), privateKey)
    );
  }
  for (let i = 0; i < parties.otherParties.length; i++) {
    let party = parties.otherParties[i];
    if (
      party.body.publicKey === publicKey &&
      party.authorization.proof === null
    ) {
      parties = JSON.parse(
        Ledger.signOtherParty(JSON.stringify(parties), privateKey, i)
      );
    }
  }
  return JSON.stringify(parties);
}
