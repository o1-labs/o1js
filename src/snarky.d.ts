export {
  Field,
  Bool,
  Group,
  Scalar,
  AsFieldElements,
  Circuit,
  CircuitMain,
  Poseidon,
  VerificationKey,
  Keypair,
  Ledger,
  isReady,
  shutdown,
  Pickles,
  JSONValue,
  InferAsFieldElements,
};

/**
 * An element of a finite field.
 */
declare function Field(x: Field | number | string | boolean | bigint): Field;
declare class Field {
  /**
   * Coerces anything field-like to a [[`Field`]].
   */
  constructor(x: Field | number | string | boolean | bigint);

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

  /**
   * Serialize the [[`Field`]] to a string, e.g. for printing.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  toString(): string;
  /**
   * Serialize the [[`Field`]] to a bigint.
   * This operation does NOT affect the circuit and can't be used to prove anything about the bigint representation of the Field.
   */
  toBigInt(): bigint;
  /**
   * Serialize the [[`Field`]] to a JSON string.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
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
   * The number -1 as a [[`Field`]].
   */
  static minusOne: Field;
  /**
   * The field order as a `bigint`.
   */
  static ORDER: bigint;

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

  static toJSON(x: Field): JSONValue;
  static fromJSON(x: JSONValue): Field | null;

  static fromString(x: string): Field;
  static fromNumber(x: number): Field;
  static fromBigInt(x: bigint): Field;

  static check(x: Field): void;

  // monkey-patched in JS
  static toInput(x: Field): { fields: Field[] };
}

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
declare function Bool(x: Bool | boolean): Bool;
declare class Bool {
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
   * Proves that this [[`Bool`]] is equal to `y`.
   * @param y a [[`Bool`]].
   */
  assertEquals(y: Bool | boolean): void;

  /**
   * Proves that this [[`Bool`]] is `true`.
   */
  assertTrue(): void;

  /**
   * Proves that this [[`Bool`]] is `false`.
   */
  assertFalse(): void;

  /**
   * Returns true if this [[`Bool`]] is equal to `y`.
   * @param y a [[`Bool`]].
   */
  equals(y: Bool | boolean): Bool;

  sizeInFields(): number;
  toFields(): Field[];

  /**
   * Serialize the [[`Bool`]] to a string, e.g. for printing.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  toString(): string;
  /**
   * Serialize the [[`Bool`]] to a JSON string.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  toJSON(): JSONValue;

  /**
   * This converts the [[`Bool`]] to a javascript [[boolean]].
   * This can only be called on non-witness values.
   */
  toBoolean(): boolean;

  /* static members */
  /**
   * The constant [[`Bool`]] that is `true`.
   */
  //static true: Bool;
  /**
   * The constant [[`Bool`]] that is `false`.
   */
  //static false: Bool;

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

  static count(x: Bool | boolean[]): Field;

  static sizeInFields(): number;
  static toFields(x: Bool): Field[];
  static ofFields(fields: Field[]): Bool;

  static toJSON(x: Bool): JSONValue;
  static fromJSON(x: JSONValue): Bool | null;
  static check(x: Bool): void;

  // monkey-patched in JS
  static toInput(x: Bool): { packed: [Field, number][] };
}

declare interface AsFieldElements<T> {
  toFields: (x: T) => Field[];
  ofFields: (x: Field[]) => T;
  sizeInFields(): number;
  check: (x: T) => void;
}

type InferAsFieldElements<T extends AsFieldElements<any>> =
  T extends AsFieldElements<infer U> ? U : never;

declare interface CircuitMain<W, P> {
  snarkyWitnessTyp: AsFieldElements<W>;
  snarkyPublicTyp: AsFieldElements<P>;
  snarkyMain: (w: W, p: P) => void;
}

declare class Circuit {
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

  // this convoluted generic typing is needed to give type inference enough flexibility
  static witness<T, S extends AsFieldElements<T> = AsFieldElements<T>>(
    ctor: S,
    f: () => T
  ): T;

  static asProver(f: () => void): void;

  static runAndCheck<T>(f: () => T): T;

  static constraintSystem<T>(f: () => T): {
    rows: number;
    digest: string;
    result: T;
  };

  static array<T>(
    elementType: AsFieldElements<T>,
    length: number
  ): AsFieldElements<T[]>;

  static assertEqual<T>(ctor: { toFields(x: T): Field[] }, x: T, y: T): void;

  static assertEqual<T>(x: T, y: T): void;

  static equal<T>(ctor: { toFields(x: T): Field[] }, x: T, y: T): Bool;

  static equal<T>(x: T, y: T): Bool;

  static if<T>(b: Bool | boolean, ctor: AsFieldElements<T>, x: T, y: T): T;

  static if<T>(b: Bool | boolean, x: T, y: T): T;

  /**
   * Generalization of `Circuit.if` for choosing between more than two different cases.
   * It takes a "mask", which is an array of `Bool`s that contains only one `true` element, as well as a type/constructor and an array of values of that type.
   * The result is that value which corresponds to the true element of the mask. Example:
   *
   * ```ts
   * let x = Circuit.switch([Bool(false), Bool(true)], Field, [Field(1), Field(2)]);
   * x.assertEquals(2);
   * ```
   */
  static switch<T, A extends AsFieldElements<T>>(
    mask: Bool[],
    type: A,
    values: T[]
  ): T;

  static generateKeypair(): Keypair;

  static prove(privateInput: any[], publicInput: any[], kp: Keypair): Proof;

  static verify(publicInput: any[], vk: VerificationKey, pi: Proof): boolean;

  static toFields<A>(a: A): Field[];

  static inProver(): boolean;

  static inCheckedComputation(): boolean;
}

declare class Scalar {
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
  static check(x: Scalar): void;
}

// TODO: Add this when OCaml bindings are implemented:
// declare class EndoScalar {
//   static toFields(x: Scalar): Field[];
//   static ofFields(fields: Field[]): Scalar;
//   static sizeInFields(): number;
// }

declare class Group {
  x: Field;
  y: Field;

  add(y: Group): Group;
  sub(y: Group): Group;
  neg(): Group;
  scale(y: Scalar): Group;
  // TODO: Add this function when OCaml bindings are implemented : endoScale(y: EndoScalar): Group;

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
  // TODO: Add this function when OCaml bindings are implemented : static endoScale(x: Group, y: EndoScalar): Group;

  static assertEqual(x: Group, y: Group): void;
  static equal(x: Group, y: Group): Bool;

  static toFields(x: Group): Field[];
  static ofFields(fields: Field[]): Group;
  static sizeInFields(): number;

  static toJSON(x: Group): JSONValue;
  static fromJSON({
    x,
    y,
  }: {
    x: string | number;
    y: string | number;
  }): Group | null;
  static check(g: Group): void;
}

declare const Poseidon: {
  hash(input: Field[], isChecked: boolean): Field;
  update(
    state: [Field, Field, Field],
    input: Field[],
    isChecked: boolean
  ): [Field, Field, Field];
  prefixes: Record<
    | 'event'
    | 'events'
    | 'sequenceEvents'
    | 'body'
    | 'accountUpdateCons'
    | 'accountUpdateNode',
    string
  >;
  spongeCreate(isChecked: boolean): unknown;
  spongeAbsorb(sponge: unknown, x: Field): void;
  spongeSqueeze(sponge: unknown): Field;
};

/**
 * Part of the circuit [[ Keypair ]]. A verification key can be used to verify a [[ Proof ]] when you provide the correct public input.
 */
declare class VerificationKey {
  verify(publicInput: any[], proof: Proof): boolean;
}

/**
 * Contains a proving key and [[ VerificationKey ]] which can be used to verify proofs.
 */
declare class Keypair {
  verificationKey(): VerificationKey;
}

/**
 * Proofs can be verified using a [[ VerificationKey ]] and the public input.
 */
declare class Proof {
  verify(verificationKey: VerificationKey, publicInput: any[]): boolean;
}

// these types should be implemented by corresponding snarkyjs classes
type UInt32_ = { value: Field };
type UInt64_ = { value: Field };
type PublicKey_ = { x: Field; isOdd: Bool };

// this closely corresponds to Mina_base.Account.t
interface Account {
  publicKey: PublicKey_;
  balance: UInt64_;
  nonce: UInt32_;
  tokenId: Field;
  tokenSymbol: string;
  receiptChainHash: Field;
  delegate?: PublicKey_;
  votingFor: Field;
  zkapp?: {
    appState: Field[];
    verificationKey?: { hash: Field; data: unknown };
    zkappVersion: number;
    sequenceState: Field[];
    lastSequenceSlot: number;
    provedState: boolean;
  };
  permissions: {
    editState: string;
    send: string;
    receive: string;
    setDelegate: string;
    setPermissions: string;
    setVerificationKey: string;
    setZkappUri: string;
    editSequenceState: string;
    setTokenSymbol: string;
    incrementNonce: string;
    setVotingFor: string;
  };
}

// TODO would be nice to document these, at least the parts that end up being used in the public API
declare class Ledger {
  static create(
    genesisAccounts: Array<{ publicKey: PublicKey_; balance: string }>
  ): Ledger;

  addAccount(publicKey: PublicKey_, balance: string): void;

  applyJsonTransaction(
    txJson: string,
    accountCreationFee: string,
    networkState: string
  ): Account[];

  getAccount(publicKey: PublicKey_, tokenId: Field): Account | undefined;

  static transactionCommitments(txJson: string): {
    commitment: Field;
    fullCommitment: Field;
  };
  static zkappPublicInput(
    txJson: string,
    accountUpdateIndex: number
  ): { accountUpdate: Field; calls: Field };
  static signFieldElement(
    messageHash: Field,
    privateKey: { s: Scalar }
  ): string;
  static dummySignature(): string;
  static signFeePayer(txJson: string, privateKey: { s: Scalar }): string;
  static signAccountUpdate(
    txJson: string,
    privateKey: { s: Scalar },
    i: number
  ): string;

  static customTokenId(publicKey: PublicKey_, tokenId: Field): Field;
  static customTokenIdChecked(publicKey: PublicKey_, tokenId: Field): Field;
  static createTokenAccount(publicKey: PublicKey_, tokenId: Field): string;

  static publicKeyToString(publicKey: PublicKey_): string;
  static publicKeyOfString(publicKeyBase58: string): PublicKey_;
  static privateKeyToString(privateKey: { s: Scalar }): string;
  static privateKeyOfString(privateKeyBase58: string): Scalar;
  static fieldToBase58(field: Field): string;
  static fieldOfBase58(fieldBase58: string): Field;
  static memoToBase58(memoString: string): string;

  static fieldsOfJson(json: string): Field[];
  static hashAccountUpdateFromFields(fields: Field[]): Field;
  static hashAccountUpdateFromJson(json: string): Field;

  static hashInputFromJson: {
    packInput(input: OcamlInput): Field[];
    timing(json: String): OcamlInput;
    permissions(json: String): OcamlInput;
    update(json: String): OcamlInput;
    accountPrecondition(json: String): OcamlInput;
    networkPrecondition(json: String): OcamlInput;
    body(json: String): OcamlInput;
  };

  // low-level encoding helpers
  static encoding: {
    toBase58(s: MlBytes, versionByte: number): string;
    ofBase58(base58: string, versionByte: number): MlBytes;
    versionBytes: Record<
      | 'tokenIdKey'
      | 'receiptChainHash'
      | 'ledgerHash'
      | 'epochSeed'
      | 'stateHash',
      number
    >;
  };
}

type MlBytes = { t: number; c: string; l: number };
type OcamlInput = { fields: Field[]; packed: { field: Field; size: number }[] };

/**
 * This function *must* be called at the end of a nodejs program, otherwise the
 * worker threads will continue running and the program will never terminate.
 * From web applications, this function is a no-op.
 */
declare const shutdown: () => Promise<undefined>;

/**
 * A Promise that resolves when SnarkyJS is ready to be used
 */
declare let isReady: Promise<undefined>;

declare namespace Pickles {
  type Proof = unknown; // opaque to js
  type PublicInput = Field[];
  type ProofWithPublicInput = { publicInput: PublicInput; proof: Proof };
  type Rule = {
    identifier: string;
    main: (publicInput: PublicInput, previousInputs: PublicInput[]) => Bool[];
    proofsToVerify: ({ isSelf: true } | { isSelf: false; tag: unknown })[];
  };
  type Prover = (
    publicInput: Field[],
    previousProofs: ProofWithPublicInput[]
  ) => Promise<Proof>;
}

declare const Pickles: {
  /**
   * This is the core API of the `Pickles` library, exposed from OCaml to JS. It takes a list of circuits --
   * each in the form of a function which takes a public input `{ accountUpdate: Field; calls: Field }` as argument --,
   * and joins them into one single circuit which can not only provide proofs for any of the sub-circuits, but also
   * adds the necessary circuit logic to recursively merge in earlier proofs.
   *
   * After forming that big circuit in the finite field represented by `Field`, it gets wrapped in a
   * recursive circuit in the field represented by `Scalar`. Any SmartContract proof will go through both of these circuits,
   * so that the final proof ends up back in `Field`.
   *
   * The function returns the building blocks needed for SmartContract proving:
   * * `provers` - a list of prover functions, on for each input `rule`
   * * `verify` - a function which can verify proofs from any of the provers
   * * `getVerificationKeyArtifact` - a function which returns the verification key used in `verify`, in base58 format, usable to deploy a zkapp
   *
   * Internal details:
   * `compile` calls each of the input rules four times, inside pickles.ml / compile:
   * 1) let step_data = ...    -> Pickles.Step_branch_data.create -> Pickles.Fix_domains.domains -> Impl.constraint_system
   * 2) let step_keypair = ... -> log_step -> Snarky_log.Constraints.log -> constraint_count
   * 3) let (wrap_pk, wrap_vk) -> log_wrap -> Snarky_log.Constraints.log -> constraint_count
   * 4) let (wrap_pk, wrap_vk) -> log_wrap -> Snarky_log.Constraints.log -> constraint_count (yes, a second time)
   */
  compile: (
    rules: Pickles.Rule[],
    publicInputSize: number
  ) => {
    provers: Pickles.Prover[];
    verify: (
      publicInput: Pickles.PublicInput,
      proof: Pickles.Proof
    ) => Promise<boolean>;
    tag: unknown;
    getVerificationKeyArtifact: () => { data: string; hash: string };
  };

  /**
   * This function has the same inputs as compile, but is a quick-to-compute
   * hash that can be used to short-circuit proofs if rules haven't changed.
   */
  circuitDigest: (rules: Pickles.Rule[], publicInputSize: number) => string;

  verify(
    publicInput: Pickles.PublicInput,
    proof: Pickles.Proof,
    verificationKey: string
  ): Promise<boolean>;

  proofToBase64: (proof: [0 | 1 | 2, Pickles.Proof]) => string;
  proofOfBase64: (
    base64: string,
    maxProofsVerified: 0 | 1 | 2
  ) => [0 | 1 | 2, Pickles.Proof];

  proofToBase64Transaction: (proof: Pickles.Proof) => string;
};

type JSONValue =
  | number
  | string
  | boolean
  | null
  | Array<JSONValue>
  | { [key: string]: JSONValue };
