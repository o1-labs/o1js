import type { Account as JsonAccount } from './bindings/mina-transaction/gen/transaction-json.js';
import type { Field, FieldConst, FieldVar } from './lib/field.js';
// export { Field };
export { SnarkyField };
export {
  Bool,
  Group,
  Scalar,
  ProvablePure,
  Provable,
  Poseidon,
  Ledger,
  isReady,
  shutdown,
  Pickles,
  Gate,
};

// internal
export { Snarky, Test, JsonGate };

/**
 * `Provable<T>` is the general circuit type interface. It describes how a type `T` is made up of field elements and auxiliary (non-field element) data.
 *
 * You will find this as the required input type in a few places in snarkyjs. One convenient way to create a `Provable<T>` is using `Struct`.
 */
declare interface Provable<T> {
  toFields: (x: T) => Field[];
  toAuxiliary: (x?: T) => any[];
  fromFields: (x: Field[], aux: any[]) => T;
  sizeInFields(): number;
  check: (x: T) => void;
}
/**
 * `ProvablePure<T>` is a special kind of `Provable<T>`, where the auxiliary data is empty. This means the type only consists of field elements,
 * in that sense it is "pure".
 *
 * Examples where `ProvablePure<T>` is required are types of on-chain state, events and actions.
 */
declare interface ProvablePure<T> extends Provable<T> {
  toFields: (x: T) => Field[];
  toAuxiliary: (x?: T) => [];
  fromFields: (x: Field[]) => T;
  sizeInFields(): number;
  check: (x: T) => void;
}

// ocaml types
type MlTuple<X, Y> = [0, X, Y];
type MlArray<T> = [0, ...T[]];
type MlList<T> = [0, T, 0 | MlList<T>];
type MlOption<T> = 0 | [0, T];

declare namespace Snarky {
  type Keypair = unknown;
  type VerificationKey = unknown;
  type Proof = unknown;
}
// same representation, but use a different name to communicate intent / constraints
type BoolVar = FieldVar;

/**
 * Internal interface to snarky-ml
 *
 * Note for devs: This module is intended to closely mirror snarky-ml's core, low-level APIs.
 */
declare const Snarky: {
  /**
   * witness `sizeInFields` field element variables
   */
  exists(
    sizeInFields: number,
    compute: () => MlArray<FieldConst>
  ): MlArray<FieldVar>;
  /**
   * witness a single field element variable
   */
  existsVar(compute: () => FieldConst): FieldVar;
  /**
   * Runs code as a prover.
   */
  asProver(f: () => void): void;
  /**
   * Runs code and checks its correctness.
   */
  runAndCheck(f: () => void): void;
  /**
   * Runs code in prover mode, without checking correctness.
   */
  runUnchecked(f: () => void): void;
  /**
   * Returns information about the constraint system in the callback function.
   */
  constraintSystem(f: () => void): {
    rows: number;
    digest: string;
    json: JsonConstraintSystem;
  };

  /**
   * APIs to add constraints on field variables
   */
  field: {
    /**
     * add x, y to get a new AST node Add(x, y); handles if x, y are constants
     */
    add(x: FieldVar, y: FieldVar): FieldVar;
    /**
     * scale x by a constant to get a new AST node Scale(c, x); handles if x is a constant
     */
    scale(x: FieldVar, c: FieldConst): FieldVar;
    /**
     * witnesses z = x*y and constrains it with [assert_r1cs]; handles constants
     */
    mul(x: FieldVar, y: FieldVar): FieldVar;
    /**
     * evaluates a CVar by walking the AST and reading Vars from a list of public input + aux values
     */
    readVar(x: FieldVar): FieldConst;
    /**
     * x === y without handling of constants
     */
    assertEqual(x: FieldVar, y: FieldVar): void;
    /**
     * x*y === z without handling of constants
     */
    assertMul(x: FieldVar, y: FieldVar, z: FieldVar): void;
    /**
     * check x < y and x <= y
     */
    compare(
      bitLength: number,
      x: FieldVar,
      y: FieldVar
    ): [flag: 0, less: BoolVar, lessOrEqual: BoolVar];
    /**
     *
     */
    toBits(length: number, x: FieldVar): MlArray<BoolVar>;
    /**
     *
     */
    fromBits(bits: MlArray<BoolVar>): FieldVar;
    /**
     * returns x truncated to the lowest `length` bits
     * => can be used to assert that x fits in `length` bits.
     *
     * more efficient than `toBits()` because it uses the EC_endoscalar gate;
     * does 16 bits per row (vs 1 bits per row that you can do with generic gates).
     * `length` has to be a multiple of 16
     */
    truncateToBits(length: number, x: FieldVar): FieldVar;
    /**
     * returns a new witness from an AST
     * (implemented with toConstantAndTerms)
     */
    seal(x: FieldVar): FieldVar;
    /**
     * Unfolds AST to get `x = c + c0*Var(i0) + ... + cn*Var(in)`,
     * returns `(c, [(c0, i0), ..., (cn, in)])`;
     * c is optional
     */
    toConstantAndTerms(
      x: FieldVar
    ): MlTuple<MlOption<FieldConst>, MlList<MlTuple<FieldConst, number>>>;
  };

  /**
   * The circuit API is a low level interface to create zero-knowledge proofs
   */
  circuit: {
    /**
     * Generates a proving key and a verification key for the provable function `main`
     */
    compile(
      main: (publicInput: Field[]) => void,
      publicInputSize: number
    ): Snarky.Keypair;

    /**
     * Proves a statement using the private input, public input and the keypair of the circuit.
     */
    prove(
      main: (publicInput: Field[]) => void,
      publicInputSize: number,
      publicInput: Field[],
      keypair: Snarky.Keypair
    ): Snarky.Proof;

    /**
     * Verifies a proof using the public input, the proof and the verification key of the circuit.
     */
    verify(
      publicInput: Field[],
      proof: Snarky.Proof,
      verificationKey: Snarky.VerificationKey
    ): boolean;

    keypair: {
      getVerificationKey(keypair: Snarky.Keypair): Snarky.VerificationKey;
      /**
       * Returns a low-level JSON representation of the circuit:
       * a list of gates, each of which represents a row in a table, with certain coefficients and wires to other (row, column) pairs
       */
      getConstraintSystemJSON(keypair: Snarky.Keypair): JsonConstraintSystem;
    };
  };
};

type JsonGate = {
  typ: string;
  wires: { row: number; col: number }[];
  coeffs: number[][];
};
type JsonConstraintSystem = { gates: JsonGate[]; public_input_size: number };

/**
 * An element of a finite field.
 */
declare function SnarkyField(
  x: SnarkyField | Field | number | string | boolean | bigint
): SnarkyField;
declare class SnarkyField {}

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
   * Converts a {@link Bool} to a {@link Field}. `false` becomes 0 and `true` becomes 1.
   */
  toField(): Field;

  /**
   * @returns a new {@link Bool} that is the negation of this {@link Bool}.
   */
  not(): Bool;

  /**
   * @param y A {@link Bool} to AND with this {@link Bool}.
   * @returns a new {@link Bool} that is set to true only if
   * this {@link Bool} and `y` are also true.
   */
  and(y: Bool | boolean): Bool;

  /**
   * @param y a {@link Bool} to OR with this {@link Bool}.
   * @returns a new {@link Bool} that is set to true if either
   * this {@link Bool} or `y` is true.
   */
  or(y: Bool | boolean): Bool;

  /**
   * Proves that this {@link Bool} is equal to `y`.
   * @param y a {@link Bool}.
   */
  assertEquals(y: Bool | boolean, message?: string): void;

  /**
   * Proves that this {@link Bool} is `true`.
   */
  assertTrue(message?: string): void;

  /**
   * Proves that this {@link Bool} is `false`.
   */
  assertFalse(message?: string): void;

  /**
   * Returns true if this {@link Bool} is equal to `y`.
   * @param y a {@link Bool}.
   */
  equals(y: Bool | boolean): Bool;

  /**
   * Returns the size of this type.
   */
  sizeInFields(): number;

  /**
   * Serializes this {@link Bool} into {@link Field} elements.
   */
  toFields(): Field[];

  /**
   * Serialize the {@link Bool} to a string, e.g. for printing.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  toString(): string;
  /**
   * Serialize the {@link Bool} to a JSON string.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  toJSON(): boolean;

  /**
   * This converts the {@link Bool} to a javascript [[boolean]].
   * This can only be called on non-witness values.
   */
  toBoolean(): boolean;

  /* static members */
  /**
   * The constant {@link Bool} that is `true`.
   */
  //static true: Bool;
  /**
   * The constant {@link Bool} that is `false`.
   */
  //static false: Bool;

  /**
   * Serializes a {@link Bool} into an array of {@link Field} elements.
   */
  static toField(x: Bool | boolean): Field;

  static Unsafe: {
    /**
     * Converts a {@link Field} into a {@link Bool}. This is a **dangerous** operation
     * as it assumes that the field element is either 1 or 0
     * (which might not be true).
     * @param x a {@link Field}
     */
    ofField(x: Field | number | string | boolean): Bool;
  };

  /**
   * Boolean negation.
   */
  static not(x: Bool | boolean): Bool;

  /**
   * Boolean AND operation.
   */
  static and(x: Bool | boolean, y: Bool | boolean): Bool;

  /**
   * Boolean OR operation.
   */
  static or(x: Bool | boolean, y: Bool | boolean): Bool;

  /**
   * Asserts if both {@link Bool} are equal.
   */
  static assertEqual(x: Bool | boolean, y: Bool | boolean): void;

  /**
   * Checks two {@link Bool} for equality.
   */
  static equal(x: Bool | boolean, y: Bool | boolean): Bool;

  /**
   * Counts all elements of type {@link Bool}.
   */
  static count(x: Bool | boolean[]): Field;

  /**
   * Returns the size of this type.
   */
  static sizeInFields(): number;

  /**
   * Static method to serialize a {@link Bool} into an array of {@link Field} elements.
   */
  static toFields(x: Bool): Field[];

  /**
   * Static method to serialize a {@link Bool} into its auxiliary data.
   */
  static toAuxiliary(x?: Bool): [];
  /**
   * Creates a data structure from an array of serialized {@link Field} elements.
   */
  static fromFields(fields: Field[]): Bool;

  /**
   * Serialize a {@link Bool} to a JSON string.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  static toJSON(x: Bool): boolean;
  /**
   * Deserialize a JSON structure into a {@link Bool}.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  static fromJSON(x: boolean): Bool;

  static check(x: Bool): void;

  // monkey-patched in JS
  static toInput(x: Bool): { packed: [Field, number][] };
  static toBytes(x: Bool): number[];
  static fromBytes(bytes: number[]): Bool;
  static readBytes(
    bytes: number[],
    offset: number
  ): [value: Bool, offset: number];
  static sizeInBytes(): number;
}

type Gate = {
  type: string;
  wires: { row: number; col: number }[];
  coeffs: string[];
};

/**
 * Represents a {@link Scalar}.
 */
declare class Scalar {
  /**
   * Serialize this Scalar to Field elements.
   *
   * WARNING: This function is for internal usage by the proof system. It returns 255 field elements
   * which represent the Scalar in a shifted, bitwise format.
   * Check out {@link Scalar.toFieldsCompressed} for a user-friendly serialization that can be used outside proofs.
   */
  toFields(): Field[];

  /**
   * Serialize a Scalar into a Field element plus one bit, where the bit is represented as a Bool.
   *
   * Note: Since the Scalar field is slightly larger than the base Field, an additional high bit
   * is needed to represent all Scalars. However, for a random Scalar, the high bit will be `false` with overwhelming probability.
   */
  static toFieldsCompressed(s: Scalar): { field: Field; highBit: Bool };

  /**
   * Negate a scalar field element.
   * Can only be called outside of circuit execution
   */
  neg(): Scalar;

  /**
   * Add scalar field elements.
   * Can only be called outside of circuit execution
   */
  add(y: Scalar): Scalar;

  /**
   * Subtract scalar field elements.
   * Can only be called outside of circuit execution
   */
  sub(y: Scalar): Scalar;

  /**
   * Multiply scalar field elements.
   * Can only be called outside of circuit execution
   */
  mul(y: Scalar): Scalar;

  /**
   * Divide scalar field elements.
   * Can only be called outside of circuit execution
   */
  div(y: Scalar): Scalar;

  /**
   * Serializes this Scalar to a string
   */
  toJSON(): string;

  /**
   * Static method to serialize a {@link Scalar} into an array of {@link Field} elements.
   */
  static toFields(x: Scalar): Field[];
  /**
   * Static method to serialize a {@link Scalar} into its auxiliary data.
   */
  static toAuxiliary(x?: Scalar): [];
  /**
   * Creates a data structure from an array of serialized {@link Field} elements.
   */
  static fromFields(fields: Field[]): Scalar;
  /**
   * Returns the size of this type.
   */
  static sizeInFields(): number;
  /**
   * Creates a data structure from an array of serialized {@link Bool}.
   */
  static fromBits(bits: Bool[]): Scalar;
  /**
   * Returns a random {@link Scalar}.
   * Randomness can not be proven inside a circuit!
   */
  static random(): Scalar;
  /**
   * Serialize a {@link Scalar} to a JSON string.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Scalar.
   */
  static toJSON(x: Scalar): string;
  /**
   * Deserialize a JSON structure into a {@link Scalar}.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Scalar.
   */
  static fromJSON(x: string | number | boolean): Scalar;
  /**
   * Create a constant {@link Scalar} from a bigint.
   * If the bigint is too large, it is reduced modulo the scalar field order.
   */
  static fromBigInt(s: bigint): Scalar;
  static check(x: Scalar): void;
}

// TODO: Add this when OCaml bindings are implemented:
// declare class EndoScalar {
//   static toFields(x: Scalar): Field[];
//   static fromFields(fields: Field[]): Scalar;
//   static sizeInFields(): number;
// }

/**
 * Represents a point with x and y coordinates on an elliptic curve.
 */
declare class Group {
  x: Field;
  y: Field;

  /**
   * Adds two {@link Group} elements together.
   */
  add(y: Group): Group;

  /**
   * Subtracts one {@link Group} element from the other.
   */
  sub(y: Group): Group;

  /**
   * Negates this {@link Group} elements and returns a new instance.
   */
  neg(): Group;

  /**
   * Scales this {@link Group} element using a {@link Scalar}.
   */
  scale(y: Scalar): Group;
  // TODO: Add this function when OCaml bindings are implemented : endoScale(y: EndoScalar): Group;

  /**
   * Asserts that two {@link Group} elements are equal.
   */
  assertEquals(y: Group, message?: string): void;

  /**
   * Checks if two {@link Group} elements are equal.
   */
  equals(y: Group): Bool;

  /**
   * Returns the JSON representation of this {@link Group} element.
   */
  toJSON(): { x: string; y: string };

  constructor(args: {
    x: Field | number | string | boolean;
    y: Field | number | string | boolean;
  });
  constructor(
    x: Field | number | string | boolean,
    y: Field | number | string | boolean
  );

  static generator: Group;
  /**
   * Adds two {@link Group} elements together.
   */
  static add(x: Group, y: Group): Group;
  /**
   * Subtracts one {@link Group} element from the other.
   */
  static sub(x: Group, y: Group): Group;
  /**
   * Negates a {@link Group} elements and returns a new instance.
   */
  static neg(x: Group): Group;

  /**
   * Scales this {@link Group} element using a {@link Scalar}.
   */
  static scale(x: Group, y: Scalar): Group;
  // TODO: Add this function when OCaml bindings are implemented : static endoScale(x: Group, y: EndoScalar): Group;

  /**
   * Asserts that two {@link Group} elements are equal.
   */
  static assertEqual(x: Group, y: Group): void;

  /**
   * Checks if two {@link Group} elements are equal.
   */
  static equal(x: Group, y: Group): Bool;
  /**
   * Static method to serialize a {@link Group} into an array of {@link Field} elements.
   */
  static toFields(x: Group): Field[];
  /**
   * Static method to serialize a {@link Group} into its auxiliary data.
   */
  static toAuxiliary(x?: Group): [];
  /**
   * Creates a data structure from an array of serialized {@link Field} elements.
   */
  static fromFields(fields: Field[]): Group;
  /**
   * Returns the size of this type.
   */
  static sizeInFields(): number;
  /**
   * Serialize a {@link Group} to a JSON string.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Group.
   */
  static toJSON(x: Group): { x: string; y: string };
  /**
   * Deserialize a JSON structure into a {@link Group}.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Group.
   */
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
  hashToGroup(
    input: Field[],
    isChecked: boolean
  ): {
    x: Field;
    y: Field;
  };
  prefixes: Record<
    | 'event'
    | 'events'
    | 'sequenceEvents'
    | 'body'
    | 'accountUpdateCons'
    | 'accountUpdateNode'
    | 'zkappMemo',
    string
  >;
  spongeCreate(isChecked: boolean): unknown;
  spongeAbsorb(sponge: unknown, x: Field): void;
  spongeSqueeze(sponge: unknown): Field;
};

// these types should be implemented by corresponding snarkyjs classes
type PublicKey_ = { x: Field; isOdd: Bool };

/**
 * Represents the Mina ledger.
 */
declare class Ledger {
  /**
   * Creates a fresh ledger.
   */
  static create(
    genesisAccounts: Array<{ publicKey: PublicKey_; balance: string }>
  ): Ledger;

  /**
   * Adds an account and its balance to the ledger.
   */
  addAccount(publicKey: PublicKey_, balance: string): void;

  /**
   * Applies a JSON transaction to the ledger.
   */
  applyJsonTransaction(
    txJson: string,
    accountCreationFee: string,
    networkState: string
  ): void;

  /**
   * Returns an account.
   */
  getAccount(publicKey: PublicKey_, tokenId: Field): JsonAccount | undefined;

  /**
   * Returns the commitment of a JSON transaction.
   */
  static transactionCommitments(txJson: string): {
    commitment: Field;
    fullCommitment: Field;
    feePayerHash: Field;
  };

  /**
   * Returns the public input of a zkApp transaction.
   */
  static zkappPublicInput(
    txJson: string,
    accountUpdateIndex: number
  ): { accountUpdate: Field; calls: Field };

  /**
   * Signs a {@link Field} element.
   */
  static signFieldElement(
    messageHash: Field,
    privateKey: { s: Scalar },
    isMainnet: boolean
  ): string;

  /**
   * Returns a dummy signature.
   */
  static dummySignature(): string;

  /**
   * Signs a transaction as the fee payer.
   */
  static signFeePayer(txJson: string, privateKey: { s: Scalar }): string;

  /**
   * Signs an account update.
   */
  static signOtherAccountUpdate(
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
  static memoHashBase58(memoBase58: string): Field;

  static checkAccountUpdateSignature(
    updateJson: string,
    commitment: Field
  ): boolean;

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
      | 'stateHash'
      | 'publicKey'
      | 'userCommandMemo',
      number
    >;
  };
}

declare const Test: {
  transactionHash: {
    examplePayment(): string;
    serializePayment(payment: string): { data: Uint8Array };
    serializePaymentV1(payment: string): string;
    serializeCommon(common: string): { data: Uint8Array };
    hashPayment(payment: string): string;
    hashPaymentV1(payment: string): string;
  };
};

/**
 * js_of_ocaml representation of a byte array,
 * see https://github.com/ocsigen/js_of_ocaml/blob/master/runtime/mlBytes.js
 */
type MlBytes = { t: number; c: string; l: number };
type OcamlInput = { fields: Field[]; packed: { field: Field; size: number }[] };

/**
 * @deprecated `shutdown()` is no longer needed, and is a no-op. Remove it from your code.
 */
declare const shutdown: () => Promise<undefined>;

/**
 * @deprecated `await isReady` is no longer needed. Remove it from your code.
 */
declare let isReady: Promise<undefined>;

declare namespace Pickles {
  type Proof = unknown; // opaque to js
  type Statement = { input: Field[]; output: Field[] };
  type ProofWithStatement = {
    publicInput: Field[];
    publicOutput: Field[];
    proof: Proof;
  };
  type Rule = {
    identifier: string;
    main: (publicInput: Field[]) => {
      publicOutput: Field[];
      previousStatements: Statement[];
      shouldVerify: Bool[];
    };
    proofsToVerify: ({ isSelf: true } | { isSelf: false; tag: unknown })[];
  };
  type Prover = (
    publicInput: Field[],
    previousProofs: Proof[]
  ) => Promise<{ publicOutput: Field[]; proof: Proof }>;
}

declare const Pickles: {
  /**
   * This is the core API of the `Pickles` library, exposed from OCaml to JS. It takes a list of circuits --
   * each in the form of a function which takes a public input `{ accountUpdate: Field; calls: Field }` as argument --,
   * and augments them to add the necessary circuit logic to recursively merge in earlier proofs.
   *
   * After forming those augmented circuits in the finite field represented by `Field`, they gets wrapped in a
   * single recursive circuit in the field represented by `Scalar`. Any SmartContract proof will go through both of these steps,
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
    signature: { publicInputSize: number; publicOutputSize: number }
  ) => {
    provers: Pickles.Prover[];
    verify: (
      statement: Pickles.Statement,
      proof: Pickles.Proof
    ) => Promise<boolean>;
    tag: unknown;
    getVerificationKeyArtifact: () => { data: string; hash: string };
  };

  verify(
    statement: Pickles.Statement,
    proof: Pickles.Proof,
    verificationKey: string
  ): Promise<boolean>;

  dummyBase64Proof: () => string;
  dummyVerificationKey: () => { data: string; hash: string };

  proofToBase64: (proof: [0 | 1 | 2, Pickles.Proof]) => string;
  proofOfBase64: (
    base64: string,
    maxProofsVerified: 0 | 1 | 2
  ) => [0 | 1 | 2, Pickles.Proof];

  proofToBase64Transaction: (proof: Pickles.Proof) => string;
};
