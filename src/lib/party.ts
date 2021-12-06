import { CircuitValue } from './circuit_value';
import { Group, Field, Bool, VerificationKey, Poseidon } from '../snarky';
import { PrivateKey, PublicKey } from './signature';
import { Optional } from './optional';
import { UInt64, UInt32, Int64 } from './int';
import * as Mina from './mina';
import { Circuit, PartyBody } from '..';

export type Amount = UInt64;
export const Amount = UInt64;
export type Balance = UInt64;
export const Balance = UInt64;
export type Fee = UInt64;
export const Fee = UInt64;
export type GlobalSlot = UInt32;
export const GlobalSlot = UInt32;
export type SignedAmount = Int64;
export const SignedAmount = Int64;

const SnappStateLength: number = 8;

/**
 * Timing info inside an account.
 */
export class Timing {
  initialMinimumBalance: Balance;
  cliffTime: GlobalSlot;
  cliffAmount: Amount;
  vestingPeriod: GlobalSlot;
  vestingIncrement: Amount;

  constructor(
    initialMinimumBalance: Balance,
    cliffTime: GlobalSlot,
    cliffAmount: Amount,
    vestingPeriod: GlobalSlot,
    vestingIncrement: Amount
  ) {
    this.initialMinimumBalance = initialMinimumBalance;
    this.cliffTime = cliffTime;
    this.cliffAmount = cliffAmount;
    this.vestingPeriod = vestingPeriod;
    this.vestingIncrement = vestingIncrement;
  }
}

/**
 * Either set a value or keep it the same.
 */
export class SetOrKeep<T> {
  set: Bool;
  value: T;

  setValue(x: T) {
    this.set = new Bool(true);
    this.value = x;
  }

  constructor(set: Bool, value: T) {
    this.set = set;
    this.value = value;
  }
}

/**
 * Group a value with a hash.
 *
 * @typeParam T the value
 * @typeParam H the hash
 */
export type WithHash<T, H> = {
  value: T;
  hash: H;
};

/**
 * One specific permission value.
 *
 * A [[ Perm ]] tells one specific permission for our snapp how it should behave
 * when presented with requested modifications.
 *
 * Use static factory methods on this class to use a specific behavior. See
 * documentation on those methods to learn more.
 */
export class Perm {
  constant: Bool;
  signatureNecessary: Bool;
  signatureSufficient: Bool;

  constructor(
    constant: Bool,
    signatureNecessary: Bool,
    signatureSufficient: Bool
  ) {
    this.constant = constant;
    this.signatureNecessary = signatureNecessary;
    this.signatureSufficient = signatureSufficient;
  }

  /**
   * Modification is impossible.
   */
  static impossible() {
    return new Perm(new Bool(true), new Bool(true), new Bool(false));
  }

  /**
   * Modification is permitted completely
   * TODO: Is this correct?
   */
  static none() {
    return new Perm(new Bool(true), new Bool(false), new Bool(true));
  }

  /**
   * Modification is permitted by proofs within the Snapp only
   */
  static proof() {
    return new Perm(new Bool(false), new Bool(false), new Bool(false));
  }

  /**
   * Modification is permitted by signatures using the private key of this
   * account only.
   *
   * TODO: Is this accurate?
   */
  static signature() {
    return new Perm(new Bool(false), new Bool(true), new Bool(true));
  }

  /**
   * Modification is permitted by [[ Perm.proof ]] or [[ Perm.signature ]]
   */
  static proofOrSignature() {
    return new Perm(new Bool(false), new Bool(false), new Bool(true));
  }

  /**
   * Modification is permitted by only [[ Perm.proof ]] and [[ Perm.signature ]]
   */
  static proofAndSignature() {
    return new Perm(new Bool(false), new Bool(true), new Bool(false));
  }
}

/**
 * Permissions specify how specific aspects of the Snapp account are allowed to
 * be modified. Most fields are denominated by a [[ Perm ]].
 */
export class Permissions {
  /**
   * True means that this account can stake directly. False means this account
   * cannot.
   *
   * TODO: Is this correct?
   */
  stake: Bool;

  /**
   * The [[ Perm ]] corresponding to the 8 state fields associated with an
   * account.
   */
  editState: Perm;

  /**
   * The [[ Perm ]] corresponding to the ability to send transactions from this
   * account.
   *
   * TODO: Is this correct?
   */
  send: Perm;

  /**
   * The [[ Perm ]] corresponding to the ability to receive transactions to this
   * account.
   *
   * TODO: Is this correct?
   */
  receive: Perm;

  /**
   * The [[ Perm ]] corresponding to the ability to set the delegate field of
   * the account.
   */
  setDelegate: Perm;

  /**
   * The [[ Perm ]] corresponding to the ability to set the permissions field of
   * the account.
   */
  setPermissions: Perm;

  /**
   * The [[ Perm ]] corresponding to the ability to set the verification key
   * associated with the circuit tied to this account. Effectively
   * "upgradability" of the smart contract.
   */
  setVerificationKey: Perm;

  /**
   * The [[ Perm ]] corresponding to the ability to set the snapp uri typically
   * pointing to the source code of the smart contract. Usually this should be
   * changed whenever the [[ Permissions.setVerificationKey ]] is changed.
   * Effectively "upgradability" of the smart contract.
   */
  setSnappUri: Perm;

  /**
   * The [[ Perm ]] corresponding to the ability to change the sequence state
   * associated with the account.
   *
   * TODO: Define sequence state here as well.
   */
  editRollupState: Perm;

  /**
   * The [[ Perm ]] corresponding to the ability to set the token symbol for
   * this account.
   */
  setTokenSymbol: Perm;

  /**
   * Default permissions are:
   *   [[ Permissions.stake ]]=true
   *   [[ Permissions.editState ]]=[[ Perm.proof ]]
   *   [[ Permissions.send ]]=[[ Perm.signature ]]
   *   [[ Permissions.receive ]]=[[ Perm.proof ]]
   *   [[ Permissions.setDelegate ]]=[[ Perm.signature ]]
   *   [[ Permissions.setPermissions ]]=[[ Perm.signature ]]
   *   [[ Permissions.setVerificationKey ]]=[[ Perm.signature ]]
   *   [[ Permissions.setSnappUri ]]=[[ Perm.signature ]]
   *   [[ Permissions.editRollupState ]]=[[ Perm.proof ]]
   *   [[ Permissions.setTokenSymbol ]]=[[ Perm.signature ]]
   */
  static default(): Permissions {
    return new Permissions(
      new Bool(true),
      Perm.proof(),
      Perm.signature(),
      Perm.proof(),
      Perm.signature(),
      Perm.signature(),
      Perm.signature(),
      Perm.signature(),
      Perm.proof(),
      Perm.signature()
    );
  }

  constructor(
    stake: Bool,
    editState: Perm,
    send: Perm,
    receive: Perm,
    setDelegate: Perm,
    setPermissions: Perm,
    setVerificationKey: Perm,
    setSnappUri: Perm,
    editRollupState: Perm,
    setTokenSymbol: Perm
  ) {
    this.stake = stake;
    this.editState = editState;
    this.send = send;
    this.receive = receive;
    this.setDelegate = setDelegate;
    this.setPermissions = setPermissions;
    this.setVerificationKey = setVerificationKey;
    this.setSnappUri = setSnappUri;
    this.editRollupState = editRollupState;
    this.setTokenSymbol = setTokenSymbol;
  }
}

/* TODO: How should we handle "String"s, should we bridge them from OCaml? */
export class String_ extends CircuitValue {}

export class TokenSymbol extends CircuitValue {
  // TODO: Figure out how to represent
  // (Bool, Num_bits.n) Pickles_types.Vector.t
}

export class Update {
  appState: Array<SetOrKeep<Field>>;
  delegate: SetOrKeep<PublicKey>;
  verificationKey: SetOrKeep<WithHash<VerificationKey, Field>>;
  permissions: SetOrKeep<Permissions>;
  snappUri: SetOrKeep<String_>;
  tokenSymbol: SetOrKeep<TokenSymbol>;
  timing: SetOrKeep<Timing>;

  constructor(
    appState: Array<SetOrKeep<Field>>,
    delegate: SetOrKeep<PublicKey>,
    verificationKey: SetOrKeep<WithHash<VerificationKey, Field>>,
    permissions: SetOrKeep<Permissions>,
    snappUri: SetOrKeep<String_>,
    tokenSymbol: SetOrKeep<TokenSymbol>,
    timing: SetOrKeep<Timing>
  ) {
    this.appState = appState;
    this.delegate = delegate;
    this.verificationKey = verificationKey;
    this.permissions = permissions;
    this.snappUri = snappUri;
    this.tokenSymbol = tokenSymbol;
    this.timing = timing;
  }
}

type TokenId = UInt64;
export const getDefaultTokenId = () => new UInt64(Field.one);

// TODO
export class Events {
  hash: Field;
  events: Array<Array<Field>>;

  // TODO
  constructor(hash: Field, events: Array<Array<Field>>) {
    this.hash = hash;
    this.events = events;
  }
}

// TODO
export class MerkleList<T> {
  constructor() {}
}

/**
 * The body of describing how some [[ Party ]] should change.
 *
 * TODO: We need to rename this still.
 */
export class Body {
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
  tokenId: TokenId;

  /**
   * By what [[ SignedAmount ]] should the balance of this account change. All
   * deltas must balance by the end of smart contract execution.
   *
   * TODO: Is this correct?
   */
  delta: SignedAmount;

  /**
   * Recent events that have been emitted from this account.
   *
   * TODO: Add a reference to general explanation of events.
   */
  events: Events;
  sequenceEvents: Field;
  callData: MerkleList<Array<Field>>;
  depth: Field; // TODO: this is an `int As_prover.t`

  /**
   * A body that Don't change part of the underlying account record.
   */
  static keepAll(publicKey: PublicKey): Body {
    function keep<A>(dummy: A): SetOrKeep<A> {
      return new SetOrKeep(new Bool(false), dummy);
    }

    const appState: Array<SetOrKeep<Field>> = [];

    for (let i = 0; i < SnappStateLength; ++i) {
      appState.push(keep(Field.zero));
    }

    const update = new Update(
      appState,
      keep(new PublicKey(Group.generator)),
      keep({ hash: Field.zero, value: undefined as any }),
      keep(Permissions.default()),
      keep(undefined as any),
      keep(undefined as any),
      keep(undefined as any)
    );
    return new Body(
      publicKey,
      update,
      getDefaultTokenId(),
      Int64.zero,
      new Events(Field.zero, []),
      Field.zero,
      new MerkleList(),
      Field.zero
    );
  }

  constructor(
    publicKey: PublicKey,
    update: Update,
    tokenId: TokenId,
    delta: SignedAmount,
    events: Events,
    sequenceEvents: Field,
    callData: MerkleList<Array<Field>>,
    depth: Field
  ) {
    this.publicKey = publicKey;
    this.update = update;
    this.tokenId = tokenId;
    this.delta = delta;
    this.events = events;
    this.sequenceEvents = sequenceEvents;
    this.callData = callData;
    this.depth = depth;
  }
}

/**
 * Either check a value or ignore it.
 *
 * Used within [[ AccountPredicate ]]s and [[ ProtocolStatePredicate ]]s.
 */
export class OrIgnore<A> {
  check: Bool;
  value: A;

  constructor(check: Bool, value: A) {
    this.check = check;
    this.value = value;
  }
}

/**
 * Gettable and settable state that you can be checked for equality.
 */
export abstract class State<A> {
  abstract get(): Promise<A>;
  abstract set(x: A): void;
  abstract assertEquals(x: A): void;

  static init<A>(x: A): State<A> {
    class Init extends State<A> {
      value: A;
      constructor() {
        super();
        this.value = x;
      }
      get(): Promise<A> {
        throw 'init:unimplemented';
      }
      set(_: A) {
        throw 'init:unimplmented';
      }
      assertEquals(_: A) {
        throw 'init:unimplemented';
      }
    }
    return new Init();
  }

  constructor() {}
}

/**
 * An interval representing all the values between `lower` and `upper` inclusive
 * of both the `lower` and `upper` values.
 *
 * @typeParam A something with an ordering where one can quantify a lower and
 *            upper bound.
 */
export class ClosedInterval<A> {
  lower_: A | undefined;
  upper_: A | undefined;

  constructor(lower: A | undefined, upper: A | undefined) {
    this.lower_ = lower;
    this.upper_ = upper;
  }

  /**
   * Change this interval to have new lower and upper bounds.
   *
   * @param lower The lower part
   * @param upper The upper part
   */
  assertBetween(lower: A, upper: A) {
    this.lower = lower;
    this.upper = upper;
  }

  set lower(x: A) {
    this.lower_ = x;
  }

  get lower(): A {
    if (this.lower_ === undefined) {
      throw new Error('Cannot get lower before it was set.');
    } else {
      return this.lower_;
    }
  }

  set upper(x: A) {
    this.upper_ = x;
  }

  get upper(): A {
    if (this.upper_ === undefined) {
      throw new Error('Cannot get upper before it was set.');
    } else {
      return this.upper_;
    }
  }
}

export class EpochLedgerPredicate {
  hash_: OrIgnore<Field>;
  totalCurrency: ClosedInterval<UInt64>;

  constructor(hash_: OrIgnore<Field>, totalCurrency_: ClosedInterval<UInt64>) {
    this.hash_ = hash_;
    this.totalCurrency = totalCurrency_;
  }
}

export class EpochDataPredicate {
  ledger: EpochLedgerPredicate;
  seed_: OrIgnore<Field>;
  startCheckpoint_: OrIgnore<Field>;
  lockCheckpoint_: OrIgnore<Field>;
  epochLength: ClosedInterval<UInt32>;

  constructor(
    ledger: EpochLedgerPredicate,
    seed_: OrIgnore<Field>,
    startCheckpoint_: OrIgnore<Field>,
    lockCheckpoint_: OrIgnore<Field>,
    epochLength: ClosedInterval<UInt32>
  ) {
    this.ledger = ledger;
    this.seed_ = seed_;
    this.startCheckpoint_ = startCheckpoint_;
    this.lockCheckpoint_ = lockCheckpoint_;
    this.epochLength = epochLength;
  }

  // TODO: Should return promise
  get seed(): Field {
    if (this.seed_.value === null) {
      throw new Error('Cannot get seed before it was set.');
    } else {
      return this.seed_.value;
    }
  }

  get startCheckpoint(): Field {
    if (this.startCheckpoint_.value === null) {
      throw new Error('Cannot get startCheckpoint before it was set.');
    } else {
      return this.startCheckpoint_.value;
    }
  }

  get lockCheckpoint(): Field {
    if (this.lockCheckpoint_.value === null) {
      throw new Error('Cannot get lockCheckpoint before it was set.');
    } else {
      return this.lockCheckpoint_.value;
    }
  }
}

export class ProtocolStatePredicate {
  snarkedLedgerHash_: OrIgnore<Field>;
  snarkedNextAvailableToken: ClosedInterval<UInt64>;
  timestamp: ClosedInterval<UInt64>;
  blockchainLength: ClosedInterval<UInt32>;
  minWindowDensity: ClosedInterval<UInt32>;
  lastVrfOutput_: OrIgnore<Field>;
  totalCurrency: ClosedInterval<UInt64>;
  globalSlotSinceHardFork: ClosedInterval<UInt32>;
  globalSlotSinceGenesis: ClosedInterval<UInt32>;
  stakingEpochData: EpochDataPredicate;
  nextEpochData: EpochDataPredicate;

  static ignoreAll(): ProtocolStatePredicate {
    const ledger = new EpochLedgerPredicate(ignore(Field.zero), uint64());
    const epochData = new EpochDataPredicate(
      ledger,
      ignore(Field.zero),
      ignore(Field.zero),
      ignore(Field.zero),
      uint32()
    );
    return new ProtocolStatePredicate(
      ignore(Field.zero),
      uint64(),
      uint64(),
      uint32(),
      uint32(),
      ignore(Field.zero),
      uint64(),
      uint32(),
      uint32(),
      epochData,
      epochData
    );
  }

  constructor(
    snarkedLedgerHash_: OrIgnore<Field>,
    snarkedNextAvailableToken: ClosedInterval<UInt64>,
    timestamp: ClosedInterval<UInt64>,
    blockchainLength: ClosedInterval<UInt32>,
    minWindowDensity: ClosedInterval<UInt32>,
    lastVrfOutput_: OrIgnore<Field>,
    totalCurrency: ClosedInterval<UInt64>,
    globalSlotSinceHardFork: ClosedInterval<UInt32>,
    globalSlotSinceGenesis: ClosedInterval<UInt32>,
    stakingEpochData: EpochDataPredicate,
    nextEpochData: EpochDataPredicate
  ) {
    this.snarkedLedgerHash_ = snarkedLedgerHash_;
    this.snarkedNextAvailableToken = snarkedNextAvailableToken;
    this.timestamp = timestamp;
    this.blockchainLength = blockchainLength;
    this.minWindowDensity = minWindowDensity;
    this.lastVrfOutput_ = lastVrfOutput_;
    this.totalCurrency = totalCurrency;
    this.globalSlotSinceHardFork = globalSlotSinceHardFork;
    this.globalSlotSinceGenesis = globalSlotSinceGenesis;
    this.stakingEpochData = stakingEpochData;
    this.nextEpochData = nextEpochData;
  }

  get snarkedLedgerHash(): Field {
    this.snarkedLedgerHash_.check = new Bool(true);

    if (this.snarkedLedgerHash_.value === null) {
      throw new Error('Cannot get snarkedLedgerHash before it was set.');
    } else {
      return this.snarkedLedgerHash_.value;
    }
  }

  get lastVrfOutput(): Field {
    this.lastVrfOutput_.check = new Bool(true);

    if (this.lastVrfOutput_.value === null) {
      throw new Error('Cannot get lastVrfOutput before it was set.');
    } else {
      return this.lastVrfOutput_.value;
    }
  }
}

/**
 * Ignores a `dummy`
 *
 * @param dummy The value to ignore
 * @returns Always an ignored value regardless of the input.
 */
function ignore<A>(dummy: A): OrIgnore<A> {
  return new OrIgnore(new Bool(false), dummy);
}
/*
function check<A>(dummy: A): OrIgnore<A> {
  return new OrIgnore(new Optional(new Bool(true), dummy));
} */

/**
 * Ranges between all uint32 values
 */
const uint32 = () => new ClosedInterval(UInt32.fromNumber(0), UInt32.MAXINT());

/**
 * Ranges between all uint64 values
 */
const uint64 = () => new ClosedInterval(UInt64.fromNumber(0), UInt64.MAXINT());

export class AccountPredicate {
  balance: ClosedInterval<UInt64>;
  nonce: ClosedInterval<UInt32>;
  receiptChainHash: OrIgnore<Field>;
  publicKey: OrIgnore<PublicKey>;
  delegate: OrIgnore<PublicKey>;
  state: Array<OrIgnore<Field>>;
  sequenceState: OrIgnore<Field>;
  provedState: OrIgnore<Bool>;

  static ignoreAll(): AccountPredicate {
    let appState: Array<OrIgnore<Field>> = [];
    for (let i = 0; i < SnappStateLength; ++i) {
      appState.push(ignore(Field.zero));
    }

    return new AccountPredicate(
      uint64(),
      uint32(),
      ignore(Field.zero),
      ignore(new PublicKey(Group.generator)),
      ignore(new PublicKey(Group.generator)),
      appState,
      ignore(Field.zero),
      ignore(new Bool(false))
    );
  }

  constructor(
    balance: ClosedInterval<UInt64>,
    nonce: ClosedInterval<UInt32>,
    receiptChainHash: OrIgnore<Field>,
    publicKey: OrIgnore<PublicKey>,
    delegate: OrIgnore<PublicKey>,
    state: Array<OrIgnore<Field>>,
    sequenceState: OrIgnore<Field>,
    provedState: OrIgnore<Bool>
  ) {
    this.balance = balance;
    this.nonce = nonce;
    this.receiptChainHash = receiptChainHash;
    this.publicKey = publicKey;
    this.delegate = delegate;
    this.state = state;
    this.sequenceState = sequenceState;
    this.provedState = provedState;
  }
}

export class PartyBalance {
  private body: Body;
  constructor(body: Body) {
    this.body = body;
  }

  addInPlace(x: Int64 | UInt32 | UInt64) {
    this.body.delta = this.body.delta.add(x);
  }

  subInPlace(x: Int64 | UInt32 | UInt64) {
    this.body.delta = this.body.delta.sub(x);
  }
}

export class Party<P> {
  body: Body;
  predicate: P;

  constructor(body: Body, predicate: P) {
    this.body = body;
    this.predicate = predicate;
  }

  get balance(): PartyBalance {
    return new PartyBalance(this.body);
  }

  get update(): Update {
    return this.body.update;
  }

  get publicKey(): PublicKey {
    return this.body.publicKey;
  }

  static createUnsigned(publicKey: PublicKey): Party<void> {
    // TODO: This should be a witness block that uses the setVariable
    // API to set the value of a variable after it's allocated

    const pk = publicKey;
    const body: Body = Body.keepAll(pk);
    if (Mina.currentTransaction === undefined) {
      throw new Error(
        'Party.createUnsigned: Cannot run outside of a transaction'
      );
    }

    const party = new Party(body, undefined);
    Mina.currentTransaction.nextPartyIndex++;
    Mina.currentTransaction.parties.push(party);
    return party;
  }

  static createSigned(signer: PrivateKey): Promise<Party<UInt32>> {
    // TODO: This should be a witness block that uses the setVariable
    // API to set the value of a variable after it's allocated

    const pk = signer.toPublicKey();
    const body: Body = Body.keepAll(pk);
    return Mina.getAccount(pk).then((a) => {
      if (Mina.currentTransaction === undefined) {
        throw new Error(
          'Party.createSigned: Cannot run outside of a transaction'
        );
      }

      if (a == null) {
        throw new Error('Party.createSigned: Account not found');
      }

      const party = new Party(body, a.nonce);
      Mina.currentTransaction.nextPartyIndex++;
      Mina.currentTransaction.parties.push(party);
      return party;
    });
  }
}
