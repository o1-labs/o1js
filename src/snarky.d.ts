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
 * An element of a finite field.
 */
export class Field {
  /**
   * Coerces anything field-like to a [[`Field`]].
   */
  constructor(x: Field | number | string | boolean);

  /**
   * Negates this [[`Field`]]. This is equivalent to multiplying the [[`Field`]]
   * by -1.
   *
   * ```typescript
   * const negOne = Field.one.neg();
   * negOne.assertEquals(-1);
   * ```
   */
  neg(): Field;

  /**
   * Inverts this [[`Field`]] element.
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
   * Adds this [[`Field`]] element to another coercible to a field.
   */
  add(y: Field | number | string | boolean): Field;

  /**
   * Subtracts another [[`Field`]]-like element from this one.
   */
  sub(y: Field | number | string | boolean): Field;

  /**
   * Multiplies this [[`Field`]] element with another coercible to a field.
   */
  mul(y: Field | number | string | boolean): Field;

  /**
   * Divides this [[`Field`]] element through another coercible to a field.
   */
  div(y: Field | number | string | boolean): Field;

  /**
   * Squares this [[`Field`]] element.
   *
   * ```typescript
   * const x2 = x.square();
   * x2.assertEquals(x.mul(x));
   * ```
   */
  square(): Field;

  /**
   * Square roots this [[`Field`]] element.
   *
   * ```typescript
   * x.square().sqrt().assertEquals(x);
   * ```
   */
  sqrt(): Field;

  toString(): string;
  toJSON(): JSONValue;

  // TODO: Rename to size()
  sizeInFields(): number;
  // TODO: Rename to toFields()
  toFields(): Field[];

  // TODO: Make these long form version
  /**
   * Check if this [[`Field`]] is lower than another Field-like value.
   * Returns a [[`Bool`]].
   *
   * ```ts
   * Field(2).lt(3); // Bool(true)
   * ```
   */
  lt(y: Field | number | string | boolean): Bool;
  /**
   * Check if this [[`Field`]] is lower than or equal to another Field-like value.
   * Returns a [[`Bool`]].
   *
   * ```ts
   * Field(2).lte(3); // Bool(true)
   * ```
   */
  lte(y: Field | number | string | boolean): Bool;
  /**
   * Check if this [[`Field`]] is greater than another Field-like value.
   * Returns a [[`Bool`]].
   *
   * ```ts
   * Field(2).gt(1); // Bool(true)
   * ```
   */
  gt(y: Field | number | string | boolean): Bool;
  /**
   * Check if this [[`Field`]] is greater than or equal to another Field-like value.
   * Returns a [[`Bool`]].
   *
   * ```ts
   * Field(2).gte(1); // Bool(true)
   * ```
   */
  gte(y: Field | number | string | boolean): Bool;

  // TODO: Make these long form version
  /**
   * Assert that this [[`Field`]] is lower than another Field-like value.
   *
   * ```ts
   * Field.one.assertLt(2);
   * ```
   *
   * This function can only be called inside a checked computation, like a
   * SmartContract method, and causes it to fail if the assertion fails.
   */
  assertLt(y: Field | number | string | boolean): void;
  /**
   * Assert that this [[`Field`]] is lower than or equal to another Field-like value.
   *
   * ```ts
   * Field.one.assertLte(2);
   * ```
   *
   * This function can only be called inside a checked computation, like a
   * SmartContract method, and causes it to fail if the assertion fails.
   */
  assertLte(y: Field | number | string | boolean): void;
  /**
   * Assert that this [[`Field`]] is greater than another Field-like value.
   *
   * ```ts
   * Field.one.assertGt(0);
   * ```
   *
   * This function can only be called inside a checked computation, like a
   * SmartContract method, and causes it to fail if the assertion fails.
   */
  assertGt(y: Field | number | string | boolean): void;
  /**
   * Assert that this [[`Field`]] is greater than or equal to another Field-like value.
   *
   * ```ts
   * Field.one.assertGte(0);
   * ```
   *
   * This function can only be called inside a checked computation, like a
   * SmartContract method, and causes it to fail if the assertion fails.
   */
  assertGte(y: Field | number | string | boolean): void;

  /**
   * Assert that this [[`Field`]] equals another Field-like value.
   * Throws an error if the assertion fails.
   *
   * ```ts
   * Field.one.assertEquals(1);
   * ```
   */
  assertEquals(y: Field | number | string | boolean): void;
  /**
   * Assert that this [[`Field`]] is either 0 or 1.
   *
   * ```ts
   * Field.zero.assertBoolean();
   * ```
   *
   * This function can only be called inside a checked computation, like a
   * SmartContract method, and throws an error if the assertion fails.
   */
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

  /**
   * Check if this [[`Field`]] equals another [[`Field`]]-like value.
   * Returns a [[`Bool`]].
   *
   * ```ts
   * Field(2).equals(2); // Bool(true)
   * ```
   */
  equals(y: Field | number | string | boolean): Bool;

  // TODO: Izzy to document
  seal(): Field;
  // TODO: Izzy to document
  rangeCheckHelper(numBits: number): Field;

  isConstant(): boolean;
  toConstant(): Field;

  // value(this: Field | number | string | boolean): Field;

  /* Self members */
  /**
   * The number 1 as a [[`Field`]].
   */
  static one: Field;
  /**
   * The number 0 as a [[`Field`]].
   */
  static zero: Field;
  /**
   * A random field element.
   */
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

  // TODO: Ask izzy/matthew why we need this non-static version?
  ofFields(fields: Field[]): Field;
  // TODO: Rename to fromFields(fields: Field[])
  // TODO: (bkase) Refactor AsFieldElements to not need these redundant static things
  static ofFields(fields: Field[]): Field;
  // TODO: Rename to size()
  static sizeInFields(): number;
  // TODO: Rename to toFields
  static toFields(x: Field): Field[];

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

/**
 * An element of a finite field.
 */
export function Field(x: number | string): Field;

/**
 * A boolean value. You can use it like this:
 *
 * ```
 * const x = new Bool(true);
 * ```
 *
 * You can also combine multiple booleans via [[`not`]], [[`and`]], [[`or`]].
 *
 * Use [[assertEquals]] to enforce the value of a Bool.
 */
export function Bool(x: Bool | boolean): Bool;
export class Bool {
  constructor(x: Bool | boolean);

  /**
   * Converts a [[`Bool`]] to a [[`Field`]]. `false` becomes 0 and `true` becomes 1.
   */
  toField(): Field;

  /**
   * @returns a new [[`Bool`]] that is the negation of this [[`Bool`]].
   */
  not(): Bool;

  /**
   * @param y A [[`Bool`]] to AND with this [[`Bool`]].
   * @returns a new [[`Bool`]] that is set to true only if
   * this [[`Bool`]] and `y` are also true.
   */
  and(y: Bool | boolean): Bool;

  /**
   * @param y a [[`Bool`]] to OR with this [[`Bool`]].
   * @returns a new [[`Bool`]] that is set to true if either
   * this [[`Bool`]] or `y` is true.
   */
  or(y: Bool | boolean): Bool;

  /**
   * Aborts the program if this [[`Bool`]] is equal to `y`.
   * @param y a [[`Bool`]].
   */
  assertEquals(y: Bool | boolean): void;

  /**
   * Returns true if this [[`Bool`]] is equal to `y`.
   * @param y a [[`Bool`]].
   */
  equals(y: Bool | boolean): Bool;

  /**
   * Returns true if this [[`Bool`]] is true.
   */
  // TODO: that seems useless :D?
  isTrue(): Bool;

  /**
   * Returns true if this [[`Bool`]] is false.
   */
  // not very useful no?
  isFalse(): Bool;

  sizeInFields(): number;
  toFields(): Field[];

  toString(): string;
  toJSON(): JSONValue;

  /**
   * This converts the [[`Bool`]] to a javascript [[boolean]].
   * This can only be called on non-witness values.
   */
  toBoolean(): boolean;

  /* static members */
  static toField(x: Bool | boolean): Field;

  static Unsafe: {
    /**
     * Converts a [[`Field`]] into a [[`Bool`]]. This is a **dangerous** operation
     * as it assumes that the field element is either 1 or 0
     * (which might not be true).
     * @param x a [[`Field`]]
     */
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

  static sizeInFields(): number;
  static toFields(x: Bool | boolean): Field[];
  static ofFields(fields: Field[]): Bool;

  static toJSON(x: Bool): JSONValue;
  static fromJSON(x: JSONValue): Bool | null;
}

export interface AsFieldElements<T> {
  toFields(x: T): Field[];
  ofFields(x: Field[]): T;
  sizeInFields(): number;
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
      toFields(x: T): Field[];
      ofFields(x: Field[]): T;
      sizeInFields(): number;
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

  static assertEqual<T>(ctor: { toFields(x: T): Field[] }, x: T, y: T): void;

  static assertEqual<T>(x: T, y: T): void;

  static equal<T>(ctor: { toFields(x: T): Field[] }, x: T, y: T): Bool;

  static equal(x: T, y: T): Bool;

  static if<T>(b: Bool | boolean, ctor: AsFieldElements<T>, x: T, y: T): T;

  static if<T>(b: Bool | boolean, x: T, y: T): T;

  static generateKeypair(): Keypair;

  static prove(privateInput: any[], publicInput: any[], kp: Keypair): Proof;

  static verify(publicInput: any[], vk: VerificationKey, pi: Proof): boolean;

  static toFields<A>(A): Field[];

  static inProver(): boolean;

  static inCheckedComputation(): boolean;
}

export class Scalar {
  toFields(this: Scalar): Field[];

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

  static toFields(x: Scalar): Field[];
  static ofFields(fields: Field[]): Scalar;
  static sizeInFields(): number;
  static ofBits(bits: Bool[]): Scalar;
  static random(): Scalar;

  static toJSON(x: Scalar): JSONValue;
  static fromJSON(x: JSONValue): Scalar | null;
}

export class EndoScalar {
  static toFields(x: Scalar): Field[];
  static ofFields(fields: Field[]): Scalar;
  static sizeInFields(): number;
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

  static toFields(x: Group): Field[];
  static ofFields(fields: Field[]): Group;
  static sizeInFields(): number;

  static toJSON(x: Group): JSONValue;
  static fromJSON(x: JSONValue): Group | null;
}

export const Poseidon: {
  hash: (xs: Field[]) => Field;
};

interface UInt32_ {
  value: Field;
}
interface UInt64_ {
  value: Field;
}

interface OrIgnore_<A> {
  check: Bool;
  value: A;
}

interface SetOrKeep_<A> {
  set: Bool;
  value: A;
}

interface ClosedInterval_<A> {
  lower: A;
  upper: A;
}

export interface EpochLedgerPredicate_ {
  hash: OrIgnore_<Field>;
  totalCurrency: ClosedInterval_<UInt64_>;
}

export interface EpochDataPredicate_ {
  ledger: EpochLedgerPredicate_;
  seed: OrIgnore_<Field>;
  startCheckpoint: OrIgnore_<Field>;
  lockCheckpoint: OrIgnore_<Field>;
  epochLength: ClosedInterval_<UInt32_>;
}

export interface ProtocolStatePredicate_ {
  snarkedLedgerHash: OrIgnore_<Field>;
  snarkedNextAvailableToken: ClosedInterval_<UInt64_>;
  timestamp: ClosedInterval_<UInt64_>;
  blockchainLength: ClosedInterval_<UInt32_>;
  minWindowDensity: ClosedInterval_<UInt32_>;
  lastVrfOutput: OrIgnore_<Field>;
  totalCurrency: ClosedInterval_<UInt64_>;
  globalSlotSinceHardFork: ClosedInterval_<UInt32_>;
  globalSlotSinceGenesis: ClosedInterval_<UInt32_>;
  stakingEpochData: EpochDataPredicate_;
  nextEpochData: EpochDataPredicate_;
}

interface Int64_ {
  uint64Value(): Field;
}

interface PartyUpdate {
  appState: Array<SetOrKeep_<Field>>;
  delegate: SetOrKeep_<{ g: Group }>;
  // TODO: Verification key
  // TODO: permissions
  // TODO: snapp uri
  // TODO: token symbol
  // TODO: timing
}

interface PartyBody {
  publicKey: { g: Group };
  update: PartyUpdate;
  tokenId: UInt32_;
  delta: Int64_;
  events: Array<Array<Field>>;
  sequenceEvents: Array<Array<Field>>;
  callData: Field;
  depth: number;
}

interface FullAccountPredicate_ {
  balance: ClosedInterval_<UInt64_>;
  nonce: ClosedInterval_<UInt32_>;
  receiptChainHash: OrIgnore_<Field>;
  publicKey: OrIgnore_<{ g: Group }>;
  delegate: OrIgnore_<{ g: Group }>;
  state: Array<OrIgnore_<Field>>;
  sequenceState: OrIgnore_<Field>;
  provedState: OrIgnore_<Bool>;
}

type AccountPredicate_ =
  | { type: 'accept' }
  | { type: 'nonce'; value: UInt32_ }
  | { type: 'full'; value: FullAccountPredicate_ };

interface Party_ {
  body: PartyBody;
  predicate: AccountPredicate_;
}

interface FeePayerParty {
  body: PartyBody;
  predicate: UInt32_;
}

interface Parties {
  feePayer: FeePayerParty;
  otherParties: Array<Party_>;
  protocolState: ProtocolStatePredicate_;
}

interface SnappAccount {
  appState: Array<Field>;
}

interface Account {
  balance: UInt64_;
  nonce: UInt32_;
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
export const ofFields: (x: any[], y: any[]) => any[];
export const toFields: (x: any[], y: any[]) => any[];
export const sizeInFields: (x: any[]) => number;

export const NumberAsField: AsFieldElements<Number>;

export const array: <T>(
  x: AsFieldElements<T>,
  length: number
) => AsFieldElements<T[]>;

/**
 * This function *must* be called at the end of a nodejs program, otherwise the
 * worker threads will continue running and the program will never terminate.
 * From web applications, this function is a no-op.
 */
export const shutdown: () => Promise<undefined>;

/**
 * A Promise that resolves when SnarkyJS is ready to be used
 */
export let isReady: Promise<undefined>;
