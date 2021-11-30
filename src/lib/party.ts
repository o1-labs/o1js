import { CircuitValue } from './circuit_value';
import { Group, Field, Bool, VerificationKey, Poseidon } from '../snarky';
import { PrivateKey, PublicKey } from './signature';
import { Optional } from './optional';
import { UInt64, UInt32, Int64 } from './int';
import { appendToMemberExpression, mixedTypeAnnotation } from '@babel/types';
import * as Mina from './mina';
import { Circuit } from '..';

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

  static impossible() {
    return new Perm(new Bool(true), new Bool(true), new Bool(false));
  }

  static none() {
    return new Perm(new Bool(true), new Bool(false), new Bool(true));
  }

  static proof() {
    return new Perm(new Bool(false), new Bool(false), new Bool(false));
  }

  static signature() {
    return new Perm(new Bool(false), new Bool(true), new Bool(true));
  }

  static proofOrSignature() {
    return new Perm(new Bool(false), new Bool(false), new Bool(true));
  }

  static proofAndSignature() {
    return new Perm(new Bool(false), new Bool(true), new Bool(false));
  }
}

// Perm = ProofRequried | SignatureRequired | NothingRequired | EitherRequired

export class Permissions {
  stake: Bool;
  editState: Perm;
  send: Perm;
  receive: Perm;
  setDelegate: Perm;
  setPermissions: Perm;
  setVerificationKey: Perm;
  setSnappUri: Perm;
  editRollupState: Perm;
  setTokenSymbol: Perm;

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
export const DefaultTokenId: TokenId = new UInt64(Field.one);

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

export class Body {
  publicKey: PublicKey;
  update: Update;
  tokenId: TokenId;
  delta: SignedAmount;
  events: Events;
  sequenceEvents: Field;
  callData: MerkleList<Array<Field>>;
  depth: Field; // TODO: this is an `int As_prover.t`

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
      DefaultTokenId,
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

export class OrIgnore<A> {
  check: Bool;
  value: A;

  constructor(check: Bool, value: A) {
    this.check = check;
    this.value = value;
  }
}

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

export class ClosedInterval<A> {
  lower_: A | undefined;
  upper_: A | undefined;

  constructor(lower: A | undefined, upper: A | undefined) {
    this.lower_ = lower;
    this.upper_ = upper;
  }

  assertBetween(x: A, y: A) {
    this.lower = x;
    this.upper = y;
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

function ignore<A>(dummy: A): OrIgnore<A> {
  return new OrIgnore(new Bool(false), dummy);
}
/*
function check<A>(dummy: A): OrIgnore<A> {
  return new OrIgnore(new Optional(new Bool(true), dummy));
} */

const uint32 = () => new ClosedInterval(UInt32.fromNumber(0), UInt32.MAXINT());

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

export class Party<P> {
  body: Body;
  predicate: P;

  constructor(body: Body, predicate: P) {
    this.body = body;
    this.predicate = predicate;
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
