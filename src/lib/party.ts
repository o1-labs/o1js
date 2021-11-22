import { prop, CircuitValue } from './circuit_value';
import { Field, Bool, VerificationKey, Poseidon } from '../snarky';
import { PrivateKey, PublicKey } from './signature';
import { Optional } from './optional';
import { UInt64, UInt32, Int64 } from './int';
import { mixedTypeAnnotation } from '@babel/types';
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

/**
 * Timing info inside an account.
 */
export class Timing extends CircuitValue {
  @prop initialMinimumBalance: Balance
  @prop cliffTime: GlobalSlot
  @prop cliffAmount: Amount
  @prop vestingPeriod: GlobalSlot
  @prop vestingIncrement: Amount

  constructor(initialMinimumBalance: Balance, cliffTime: GlobalSlot, cliffAmount: Amount, vestingPeriod: GlobalSlot, vestingIncrement: Amount) {
    super();
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
  @prop value: Optional<T>;

  set(x: T) {
    this.value.isSome = new Bool(true);
    this.value.value = x;
  }

  /**
   * An empty optional corresponds to a keep while some value is a set of that new value.
   */
  constructor(value: Optional<T>) {
    this.value = value;
  }
}

/**
 * Group a value with a hash.
 *
 * @typeParam T the value
 * @typeParam H the hash
 */
export class WithHash<T, H> extends CircuitValue {
  @prop value: T;
  @prop hash: H;

  constructor(value: T, hash: H) {
    super();
    this.value = value;
    this.hash = hash;
  }
}

export class Perm extends CircuitValue {
  @prop constant: Bool
  @prop signatureNecessary: Bool
  @prop signatureSufficient: Bool

  constructor(constant: Bool, signatureNecessary: Bool, signatureSufficient: Bool) {
    super();
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

export class Permissions extends CircuitValue {
  @prop stake: Bool
  @prop editState: Perm
  @prop send: Perm
  @prop receive: Perm
  @prop setDelegate: Perm
  @prop setPermissions: Perm
  @prop setVerificationKey: Perm
  @prop setSnappUri: Perm
  @prop editRollupState: Perm
  @prop setTokenSymbol: Perm

  static default() : Permissions {
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
      Perm.signature(),
    );
  }

  constructor(stake: Bool, editState: Perm, send: Perm, receive: Perm, setDelegate: Perm, setPermissions: Perm, setVerificationKey: Perm, setSnappUri: Perm, editRollupState: Perm, setTokenSymbol: Perm) {
    super();
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

export class Update extends CircuitValue {
  @prop appState: SetOrKeep<Field>
  @prop delegate: SetOrKeep<PublicKey>
  @prop verificationKey: SetOrKeep<WithHash<VerificationKey, Field>>
  @prop permissions: SetOrKeep<Permissions>
  @prop snappUri: SetOrKeep<String_>
  @prop tokenSymbol: SetOrKeep<TokenSymbol>
  @prop timing: SetOrKeep<Timing>

  constructor(
       appState: SetOrKeep<Field>,
       delegate:SetOrKeep<PublicKey>,
       verificationKey:SetOrKeep<WithHash<VerificationKey, Field>>,
       permissions:SetOrKeep<Permissions>,
       snappUri:SetOrKeep<String_>,
       tokenSymbol:SetOrKeep<TokenSymbol>,
       timing:SetOrKeep<Timing>
  ) {
    super();
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

// TODO
export class Events extends CircuitValue {}

// TODO
export class MerkleList<T> extends CircuitValue {}

export class Body extends CircuitValue {
  @prop publicKey: PublicKey
  @prop update: Update
  @prop tokenId: TokenId
  @prop delta: SignedAmount
  @prop events: Events
  @prop rollupEvents: Field
  @prop callData: MerkleList<Array<Field>>
  @prop depth: Field // TODO: this is an `int As_prover.t`

  constructor(
    publicKey: PublicKey,
    update: Update,
    tokenId: TokenId,
    delta: SignedAmount,
    events: Events,
    rollupEvents: Field,
    callData: MerkleList<Array<Field>>,
    depth: Field
  ) {
    super();
    this.publicKey = publicKey;
    this.update = update;
    this.tokenId = tokenId;
    this.delta = delta;
    this.events = events;
    this.rollupEvents = rollupEvents;
    this.callData = callData;
    this.depth = depth;
  }
}

export class OrIgnore<A> extends CircuitValue {
  @prop checkEquals: Optional<A>
  constructor(value: Optional<A>) {
    super();
    this.checkEquals = value;
  }
}

export class State<A> {
  predicate: OrIgnore<A>;
  update: SetOrKeep<A>;
  
  _initialState: A;

  constructor() {
    let value : A = undefined as any;
    this._initialState = value;
    this.predicate = new OrIgnore(new Optional(new Bool(false), value));
    this.update = new SetOrKeep(new Optional(new Bool(false), value))
  }
  
  static initialize<A>(x: A): State<A> {
    const r = new State<A>();
    r._initialState = x;
    return r;
  }

  assertEquals(x: A) {
    this.predicate.checkEquals.isSome = new Bool(true);
    this.predicate.checkEquals.value = x;
  }

  set(x: A) {
    this.update.value.isSome = new Bool(true);
    this.update.value.value = x;
  }

  get(): Promise<A> {
    /*
    if (Circuit.inProver()) {
      let res = Circuit.witness()
    } else {
    }

    Mina.getAccount() */

    // TODO: Get the state from somewhere
    let actualState: A = undefined as any;
    this.assertEquals(actualState);
    return new Promise((resolve) => resolve(actualState));
  }
}

export class ClosedInterval<A> extends CircuitValue {
  @prop lower_: OrIgnore<A>;
  @prop upper_: OrIgnore<A>;

  constructor(lower: OrIgnore<A>, upper: OrIgnore<A>) {
    super();
    this.lower_ = lower;
    this.upper_ = upper;
  }

  assertBetween(x: A, y: A) {
    this.lower = x;
    this.upper = y;
  }

  set lower(x: A) {
    this.lower_.checkEquals.value = x;
    this.lower_.checkEquals.isSome = new Bool(true);
  }

  get lower(): A {
    if (this.lower_.checkEquals.value === null) {
      throw new Error('Cannot get lower before it was set.');
    } else {
      return this.lower_.checkEquals.value;
    }
  }

  set upper(x: A) {
    this.upper_.checkEquals.value = x;
    this.upper_.checkEquals.isSome = new Bool(true);
  }

  get upper(): A {
    if (this.upper_.checkEquals.value === null) {
      throw new Error('Cannot get upper before it was set.');
    } else {
      return this.upper_.checkEquals.value;
    }
  }
}

export class EpochLedgerPredicate extends CircuitValue {
  @prop hash_: OrIgnore<Field>;
  @prop totalCurrency_: OrIgnore<UInt64>;

  constructor(hash_: OrIgnore<Field>, totalCurrency_: OrIgnore<UInt64>) {
    super();
    this.hash_ = hash_;
    this.totalCurrency_ = totalCurrency_;
  }
}

export class EpochDataPredicate extends CircuitValue {
  @prop ledger: EpochLedgerPredicate;
  @prop seed_: OrIgnore<Field>;
  @prop startCheckpoint_: OrIgnore<Field>;
  @prop lockCheckpoint_: OrIgnore<Field>;
  @prop epochLength: ClosedInterval<UInt32>;

  constructor(ledger: EpochLedgerPredicate, seed_: OrIgnore<Field>, startCheckpoint_: OrIgnore<Field>, lockCheckpoint_: OrIgnore<Field>, epochLength: ClosedInterval<UInt32>) {
    super();
    this.ledger = ledger;
    this.seed_ = seed_;
    this.startCheckpoint_ = startCheckpoint_;
    this.lockCheckpoint_ = lockCheckpoint_;
    this.epochLength = epochLength;
  }

  set seed(x: Field) {
    this.seed_.checkEquals.value = x;
    this.seed_.checkEquals.isSome = new Bool(true);
  }

  get seed(): Field {
    if (this.seed_.checkEquals.value === null) {
      throw new Error('Cannot get seed before it was set.');
    } else {
      return this.seed_.checkEquals.value;
    }
  }

  set startCheckpoint(x: Field) {
    this.startCheckpoint_.checkEquals.value = x;
    this.startCheckpoint_.checkEquals.isSome = new Bool(true);
  }

  get startCheckpoint(): Field {
    if (this.startCheckpoint_.checkEquals.value === null) {
      throw new Error('Cannot get startCheckpoint before it was set.');
    } else {
      return this.startCheckpoint_.checkEquals.value;
    }
  }

  set lockCheckpoint(x: Field) {
    this.lockCheckpoint_.checkEquals.value = x;
    this.lockCheckpoint_.checkEquals.isSome = new Bool(true);
  }

  get lockCheckpoint(): Field {
    if (this.lockCheckpoint_.checkEquals.value === null) {
      throw new Error('Cannot get lockCheckpoint before it was set.');
    } else {
      return this.lockCheckpoint_.checkEquals.value;
    }
  }
}

export class ProtocolStatePredicate extends CircuitValue {
  @prop snarkedLedgerHash_: OrIgnore<Field>;
  @prop snarkedNextAvailableToken: ClosedInterval<UInt64>;
  @prop timestamp: ClosedInterval<UInt64>;
  @prop blockchainLength: ClosedInterval<UInt32>;
  @prop minWindowDensity: ClosedInterval<UInt32>;
  @prop lastVrfOutput_: OrIgnore<Field>;
  @prop totalCurrency: ClosedInterval<UInt64>;
  @prop globalSlotSinceHardFork: ClosedInterval<UInt32>;
  @prop globalSlotSinceGenesis: ClosedInterval<UInt32>;
  @prop stakingEpochData: EpochDataPredicate;
  @prop nextEpochData: EpochDataPredicate;

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
    super();
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

  set snarkedLedgerHash(x: Field) {
    this.snarkedLedgerHash_.checkEquals.value = x;
    this.snarkedLedgerHash_.checkEquals.isSome = new Bool(true);
  }

  get snarkedLedgerHash(): Field {
    if (this.snarkedLedgerHash_.checkEquals.value === null) {
      throw new Error('Cannot get snarkedLedgerHash before it was set.');
    } else {
      return this.snarkedLedgerHash_.checkEquals.value;
    }
  }

  set lastVrfOutput(x: Field) {
    this.lastVrfOutput_.checkEquals.value = x;
    this.lastVrfOutput_.checkEquals.isSome = new Bool(true);
  }

  get lastVrfOutput(): Field {
    if (this.lastVrfOutput_.checkEquals.value === null) {
      throw new Error('Cannot get lastVrfOutput before it was set.');
    } else {
      return this.lastVrfOutput_.checkEquals.value;
    }
  }
}

export class Party {
  static createSigned(privKey: PrivateKey): Body {
    throw 'none';
  }
}
/*
  type timing = {
    // TODO: These all will change to the precise values instead
    .
    "initialMinimumBalance": string,
    "cliffTime": string,
    "cliffAmount": string,
    "vestingPeriod": string,
    "vestingIncrement": string
  };

  type permissions = {
    .
    "stake": bool,
    "editState": authRequired,
    "send": authRequired,
    "receive": authRequired,
    "setDelegate": authRequired,
    "setPermissions": authRequired,
    "setVerificationKey": authRequired,
    "setSnappUri": authRequired,
    "editRollupState": authRequired,
    "setTokenSymbol": authRequired
  };

  type verificationKeyWithHash = {
    .
    "verificationKey": string,
    "hash": string
  };

  type delta = {
    .
    "sign": sign,
    "magnitude": uint64
  };

  type account_action = {
    .
    "appState": list(Js.Undefined.t(field)),
    "delegate": Js.Undefined.t(publicKey),
    "verificationKey": Js.Undefined.t(verificationKeyWithHash),
    "permissions": Js.Undefined.t(permissions),
    "snappUri": Js.Undefined.t(string),
    "tokenSymbol": Js.Undefined.t(string),
    "timing": Js.Undefined.t(timing)
  };

  type body = {
    .
    "publicKey": publicKey,
    "update": update,
    "tokenId": int64,
    "delta": delta,
    "events": list(list(string)),
    "rollupEvents": list(list(string)),
    "callData": string
  };

  type state = {
    .
    "elements": list(Js.Undefined.t(field))
  };

  type account = {
    .
    "balance": Js.Undefined.t(interval(uint64)),
    "nonce": Js.Undefined.t(interval(uint32)),
    "receipt_chain_hash": Js.Undefined.t(string),
    "publicKey": Js.Undefined.t(publicKey),
    "delegate": Js.Undefined.t(publicKey),
    "state": state,
    "rollupState": Js.Undefined.t(field),
    "provedState": Js.Undefined.t(bool),
  };

  // null, null = Accept
  // Some, null = Full
  // null, Some = Nonce
  // Some, Some = <ill typed>
  type predicate = {
    .
    "account": Js.Undefined.t(account),
    "nonce": Js.Undefined.t(uint32)
  };

  type predicated('predicate) = {
    .
    "body": body,
    "predicate": 'predicate
  };

  type member('auth, 'predicate) = {
    .
    "authorization": 'auth,
    "data": predicated('predicate)
  };

  type proof_or_signature = {
    .
    "proof": Js.Undefined.t(proof),
    "signature": Js.Undefined.t(signature)
  };

  type protocolState = {
    .
    "snarkedLedgerHash": Js.Undefined.t(string),
    "snarkedNextAvailableToken": Js.Undefined.t(int64),
    "snarkedLedgerHash": Js.Undefined.t(string),
    "timestamp": Js.Undefined.t(interval(uint64)),
    "blockchainLength": Js.Undefined.t(uint32),
    "minWindowDensity": Js.Undefined.t(uint32),
    "lastVrfOutput": Js.Undefined.t(string),
    "totalCurrency": Js.Undefined.t(uint64),
    "globalSlotSinceHardFork": Js.Undefined.t(string),
    "globalSlotSinceGenesis": Js.Undefined.t(string),
    "stakingEpochData": Js.Undefined.t(string),
    "nextEpochData": Js.Undefined.t(string),
  }

  [@genType]
  type t = {
    .
    "feePayer": member(signature, uint32),
    "otherParties": array(member(proof_or_signature, predicate)),
    "protocolState": protocolState
  };
  */

// Act on the merkle tree
