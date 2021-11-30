export type JSONValue =
  | number
  | string
  | boolean
  | null
  | Array<JSON>
  | { [key: string]: JSONValue };

/**
 * Part of the circuit [[ Keypair ]]. A verification key can be used to verify a [[ Proof ]] when you provide the correct public input.
 */
export class VerificationKey {
  verify(publicInput: any[], proof: Proof): boolean;
}

/**
 * Contains a proving key and [[ VerificationKey ]] which can be used to verify proofs.
 */
export class Keypair {
  verificationKey(): VerificationKey;
}

/**
 * Proofs can be verified using a [[ VerificationKey ]] and the public input.
 */
export class Proof {
  verify(verificationKey: VerificationKey, publicInput: any[]): boolean;
}

/**
 * TODO: Pull from docs
 */
export class Field {
  /**
   * Coerces anything field-like to a [[ Field ]].
   */
  constructor(x: Field | number | string | boolean);

  /**
   * Negates this [[ Field ]]. This is equivalent to multiplying the [[ Field ]]
   * by -1.
   *
   * ```typescript
   * const negOne = Field.one.neg();
   * negOne.assertEquals(-1);
   * ```
   */
  neg(): Field;

  /**
   * Inverts this [[ Field ]] element.
   *
   * ```typescript
   * const invX = x.inv();
   * invX.assertEquals(Field.one.div(x));
   * ```
   *
   * @return A field element that is equivalent to one divided by this element.
   */
  inv(): Field;

  /**
   * Adds this [[ Field ]] element to another coercible to a field.
   */
  add(y: Field | number | string | boolean): Field;

  /**
   * Subtracts this [[ Field ]] element to another coercible to a field.
   */
  sub(y: Field | number | string | boolean): Field;

  /**
   * Multiplies this [[ Field ]] element to another coercible to a field.
   */
  mul(y: Field | number | string | boolean): Field;

  /**
   * Divides this [[ Field ]] element to another coercible to a field.
   */
  div(y: Field | number | string | boolean): Field;

  /**
   * Squares this [[ Field ]] element.
   *
   * ```typescript
   * const x2 = x.square();
   * x2.assertEquals(x.mul(x));
   * ```
   */
  square(): Field;

  /**
   * Square roots this [[ Field ]] element.
   *
   * ```typescript
   * x.square().sqrt().assertEquals(x);
   * ```
   */
  sqrt(): Field;

  toString(): string;
  toJSON(): JSONValue;

  // TODO: Rename to size()
  sizeInFieldElements(): number;
  // TODO: Rename to toFields()
  toFieldElements(): Field[];

  lt(y: Field | number | string | boolean): Bool;
  lte(y: Field | number | string | boolean): Bool;
  gt(y: Field | number | string | boolean): Bool;
  gte(y: Field | number | string | boolean): Bool;

  assertLt(y: Field | number | string | boolean): void;
  assertLte(y: Field | number | string | boolean): void;
  assertGt(y: Field | number | string | boolean): void;
  assertGte(y: Field | number | string | boolean): void;

  assertEquals(y: Field | number | string | boolean): void;
  assertBoolean(): void;
  isZero(): Bool;

  /**
   * Little endian binary representation of the field element.
   */
  toBits(): Bool[];

  /**
   * Little endian binary representation of the field element.
   * Fails if the field element cannot fit in `length` bits.
   */
  toBits(length: number): Bool[];

  equals(y: Field | number | string | boolean): Bool;

  // TODO: Izzy to document
  seal(): Field;
  // TODO: Izzy to document
  rangeCheckHelper(numBits: number): Field;

  isConstant(): boolean;
  toConstant(): Field;

  // value(this: Field | number | string | boolean): Field;

  /* Self members */
  static one: Field;
  static zero: Field;
  static random(): Field;

  /*
  static neg(x: Field | number | string | boolean): Field;
  static inv(x: Field | number | string | boolean): Field;

  static add(
    x: Field | number | string | boolean,
    y: Field | number | string | boolean
  ): Field;
  static sub(
    x: Field | number | string | boolean,
    y: Field | number | string | boolean
  ): Field;
  static mul(
    x: Field | number | string | boolean,
    y: Field | number | string | boolean
  ): Field;
  static div(
    x: Field | number | string | boolean,
    y: Field | number | string | boolean
  ): Field;

  static square(x: Field | number | string | boolean): Field;
  static sqrt(x: Field | number | string | boolean): Field;

  static toString(x: Field | number | string | boolean): string;
  */

  // TODO: Ask izzy/matthew why we need this?
  ofFieldElements(fields: Field[]): Field;
  // TODO: Rename to fromFields(fields: Field[])
  // TODO: (bkase) Refactor AsFieldElements to not need these redundant static things
  static ofFieldElements(fields: Field[]): Field;
  static sizeInFieldElements(): number;
  static toFieldElements(x: Field): Field[];

  /*
  static assertEqual(
    x: Field | number | string | boolean,
    y: Field | number | string | boolean
  ): Field;
  static assertBoolean(x: Field | number | string | boolean): void;
  static isZero(x: Field | number | string | boolean): Bool;
  */

  /**
   * Converts a bit array into a field element (little endian)
   * Fails if the field element cannot fit given too many bits.
   *
   * TODO: Rename to fromBits
   */
  static ofBits(x: (Bool | boolean)[]): Field;
  /*
  static toBits(x: Field | number | string | boolean): Bool[];
  */

  /*
  static equal(
    x: Field | number | string | boolean,
    y: Field | number | string | boolean
  ): Bool;
  */

  // static toJSON(x: Field): JSONValue;

  static fromJSON(x: JSONValue): Field | null;
}

export class Bool {
  constructor(x: Bool | boolean);

  toField(): Field;

  not(): Bool;
  and(y: Bool | boolean): Bool;
  or(y: Bool | boolean): Bool;

  assertEquals(y: Bool | boolean): void;

  equals(y: Bool | boolean): Bool;
  isTrue(): Bool;
  isFalse(): Bool;

  sizeInFieldElements(): number;
  toFieldElements(): Field[];

  toString(): string;
  toJSON(): JSONValue;

  /* Can only be called on non-witness values */
  toBoolean(): boolean;

  /* static members */
  static toField(x: Bool | boolean): Field;

  static Unsafe: {
    ofField(x: Field | number | string | boolean): Bool;
  };

  static not(x: Bool | boolean): Bool;
  static and(x: Bool | boolean, y: Bool | boolean): Bool;
  static or(x: Bool | boolean, y: Bool | boolean): Bool;

  static assertEqual(x: Bool | boolean, y: Bool | boolean): void;

  static equal(x: Bool | boolean, y: Bool | boolean): Bool;
  static isTrue(x: Bool | boolean): Bool;
  static isFalse(x: Bool | boolean): Bool;

  static count(x: Bool | boolean[]): Field;

  static sizeInFieldElements(): number;
  static toFieldElements(x: Bool | boolean): Field[];
  static ofFieldElements(fields: Field[]): Bool;

  static toJSON(x: Bool): JSONValue;
  static fromJSON(x: JSONValue): Bool | null;
}

export interface AsFieldElements<T> {
  toFieldElements(x: T): Field[];
  ofFieldElements(x: Field[]): T;
  sizeInFieldElements(): number;
}

export interface CircuitMain<W, P> {
  snarkyWitnessTyp: AsFieldElements<W>;
  snarkyPublicTyp: AsFieldElements<P>;
  snarkyMain: (W, P) => void;
}

export class Circuit {
  static addConstraint(
    this: Circuit,
    kind: 'multiply',
    x: Field,
    y: Field,
    z: Field
  ): void;
  static addConstraint(
    this: Circuit,
    kind: 'add',
    x: Field,
    y: Field,
    z: Field
  ): void;
  static addConstraint(
    this: Circuit,
    kind: 'equal',
    x: Field,
    y: Field,
    z: Field
  ): void;
  static addConstraint(
    this: Circuit,
    kind: 'boolean',
    x: Field,
    y: Field,
    z: Field
  ): void;

  static newVariable(f: () => Field | number | string | boolean): Field;

  static witness<T>(
    ctor: {
      toFieldElements(x: T): Field[];
      ofFieldElements(x: Field[]): T;
      sizeInFieldElements(): number;
    },
    f: () => T
  ): T;

  static asProver(f: () => void): void;

  // static runAndCheck<T>(f : () => Promise<(() => T)>): Promise<T>;
  static runAndCheck<T>(f: () => Promise<() => T>): Promise<T>;

  static array<T>(
    ctor: AsFieldElements<T>,
    length: number
  ): AsFieldElements<T[]>;

  static assertEqual<T>(
    ctor: { toFieldElements(x: T): Field[] },
    x: T,
    y: T
  ): void;

  static assertEqual<T>(x: T, y: T): void;

  static equal<T>(ctor: { toFieldElements(x: T): Field[] }, x: T, y: T): Bool;

  static equal(x: T, y: T): Bool;

  static if<T>(b: Bool | boolean, ctor: AsFieldElements<T>, x: T, y: T): T;

  static if<T>(b: Bool | boolean, x: T, y: T): T;

  static generateKeypair(): Keypair;

  static prove(privateInput: any[], publicInput: any[], kp: Keypair): Proof;

  static verify(publicInput: any[], vk: VerificationKey, pi: Proof): boolean;

  static toFieldElements<A>(A): Field[];

  static inProver(): boolean;

  static inCheckedComputation(): boolean;
}

export class Scalar {
  toFieldElements(this: Scalar): Field[];

  /**
   * Negate a scalar field element.
   * Can only be called outside of circuit execution
   * */
  neg(): Scalar;

  /**
   * Add scalar field elements.
   * Can only be called outside of circuit execution
   * */
  add(y: Scalar): Scalar;

  /**
   * Subtract scalar field elements.
   * Can only be called outside of circuit execution
   * */
  sub(y: Scalar): Scalar;

  /**
   * Multiply scalar field elements.
   * Can only be called outside of circuit execution
   * */
  mul(y: Scalar): Scalar;

  /**
   * Divide scalar field elements.
   * Can only be called outside of circuit execution
   * */
  div(y: Scalar): Scalar;

  toJSON(): JSONValue;

  static toFieldElements(x: Scalar): Field[];
  static ofFieldElements(fields: Field[]): Scalar;
  static sizeInFieldElements(): number;
  static ofBits(bits: Bool[]): Scalar;
  static random(): Scalar;

  static toJSON(x: Scalar): JSONValue;
  static fromJSON(x: JSONValue): Scalar | null;
}

export class EndoScalar {
  static toFieldElements(x: Scalar): Field[];
  static ofFieldElements(fields: Field[]): Scalar;
  static sizeInFieldElements(): number;
}

export class Group {
  x: Field;
  y: Field;

  add(y: Group): Group;
  sub(y: Group): Group;
  neg(): Group;
  scale(y: Scalar): Group;
  endoScale(y: EndoScalar): Group;

  assertEquals(y: Group): void;
  equals(y: Group): Bool;

  toJSON(): JSONValue;

  constructor(args: {
    x: Field | number | string | boolean;
    y: Field | number | string | boolean;
  });
  constructor(
    x: Field | number | string | boolean,
    y: Field | number | string | boolean
  );

  static generator: Group;
  static add(x: Group, y: Group): Group;
  static sub(x: Group, y: Group): Group;
  static neg(x: Group): Group;
  static scale(x: Group, y: Scalar): Group;
  static endoScale(x: Group, y: EndoScalar): Group;

  static assertEqual(x: Group, y: Group): void;
  static equal(x: Group, y: Group): Bool;

  static toFieldElements(x: Group): Field[];
  static ofFieldElements(fields: Field[]): Group;
  static sizeInFieldElements(): number;

  static toJSON(x: Group): JSONValue;
  static fromJSON(x: JSONValue): Group | null;
}

export const Poseidon: {
  hash: (xs: Field[]) => Field;
};

interface UInt32 {
  value: Field;
}
interface UInt64 {
  value: Field;
}

interface OrIgnore<A> {
  check: Bool;
  value: A;
}

interface SetOrKeep<A> {
  set: Bool;
  value: A;
}

interface ClosedInterval<A> {
  lower: A;
  upper: A;
}

export interface EpochLedgerPredicate {
  hash: OrIgnore<Field>;
  totalCurrency: ClosedInterval<UInt64>;
}

export interface EpochDataPredicate {
  ledger: EpochLedgerPredicate;
  seed: OrIgnore<Field>;
  startCheckpoint: OrIgnore<Field>;
  lockCheckpoint: OrIgnore<Field>;
  epochLength: ClosedInterval<UInt32>;
}

export interface ProtocolStatePredicate {
  snarkedLedgerHash: OrIgnore<Field>;
  snarkedNextAvailableToken: ClosedInterval<UInt64>;
  timestamp: ClosedInterval<UInt64>;
  blockchainLength: ClosedInterval<UInt32>;
  minWindowDensity: ClosedInterval<UInt32>;
  lastVrfOutput: OrIgnore<Field>;
  totalCurrency: ClosedInterval<UInt64>;
  globalSlotSinceHardFork: ClosedInterval<UInt32>;
  globalSlotSinceGenesis: ClosedInterval<UInt32>;
  stakingEpochData: EpochDataPredicate;
  nextEpochData: EpochDataPredicate;
}

interface Int64 {
  uint64Value(): Field;
}

interface PartyUpdate {
  appState: Array<SetOrKeep<Field>>;
  delegate: SetOrKeep<{ g: Group }>;
  // TODO: Verification key
  // TODO: permissions
  // TODO: snapp uri
  // TODO: token symbol
  // TODO: timing
}

interface PartyBody {
  publicKey: { g: Group };
  update: PartyUpdate;
  tokenId: UInt32;
  delta: Int64;
  events: Array<Array<Field>>;
  sequenceEvents: Array<Array<Field>>;
  callData: Field;
  depth: number;
}

interface FullAccountPredicate {
  balance: ClosedInterval<UInt64>;
  nonce: ClosedInterval<UInt32>;
  receiptChainHash: OrIgnore<Field>;
  publicKey: OrIgnore<{ g: Group }>;
  delegate: OrIgnore<{ g: Group }>;
  state: Array<OrIgnore<Field>>;
  sequenceState: OrIgnore<Field>;
  provedState: OrIgnore<Bool>;
}

type AccountPredicate =
  | { type: 'accept' }
  | { type: 'nonce'; value: UInt32 }
  | { type: 'full'; value: FullAccountPredicate };

interface Party {
  body: PartyBody;
  predicate: AccountPredicate;
}

interface FeePayerParty {
  body: PartyBody;
  predicate: UInt32;
}

interface Parties {
  feePayer: FeePayerParty;
  otherParties: Array<Party>;
  protocolState: ProtocolStatePredicate;
}

interface SnappAccount {
  appState: Array<Field>;
}

interface Account {
  balance: UInt64;
  nonce: UInt32;
  snapp: SnappAccount;
}

export class Ledger {
  static create(
    genesisAccounts: Array<{ publicKey: { g: Group }; balance: number }>
  ): Ledger;

  addAccount(publicKey: { g: Group }, balance: number): void;

  applyPartiesTransaction(parties: Parties): void;

  getAccount(publicKey: { g: Group }): Account | null;
}

/* TODO: Figure out types for these. */
export const ofFieldElements: (x: any[], y: any[]) => any[];
export const toFieldElements: (x: any[], y: any[]) => any[];
export const sizeInFieldElements: (x: any[]) => number;

export const NumberAsField: AsFieldElements<Number>;

export const array: <T>(
  x: AsFieldElements<T>,
  length: number
) => AsFieldElements<T[]>;

/* This function *must* be called at the end of a nodejs program, otherwise the
 * worker threads will continue running and the program will never terminate.
 * From web applications, this function is a no-op. */
export const shutdown: () => Promise<undefined>;

export let isReady: Promise<undefined>;
