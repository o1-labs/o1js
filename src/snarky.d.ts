import type { Account as JsonAccount } from './bindings/mina-transaction/gen/transaction-json.js';
import type { Field, FieldConst, FieldVar } from './lib/field.js';
import type { BoolVar, Bool } from './lib/bool.js';
import type { ScalarConst } from './lib/scalar.js';
import type {
  MlArray,
  MlTuple,
  MlList,
  MlOption,
  MlBool,
  MlBytes,
} from './lib/ml/base.js';
import type { MlHashInput } from './lib/ml/conversion.js';

export { ProvablePure, Provable, Ledger, Pickles, Gate };

// internal
export { Snarky, Test, JsonGate, MlPublicKey, MlPublicKeyVar };

/**
 * `Provable<T>` is the general circuit type interface in SnarkyJS. `Provable<T>` interface describes how a type `T` is made up of {@link Field} elements and "auxiliary" (non-provable) data.
 *
 * `Provable<T>` is the required input type in a few places in SnarkyJS. One convenient way to create a `Provable<T>` is using `Struct`.
 *
 * The properties and methods on the provable type exist in all base SnarkyJS types as well (aka. {@link Field}, {@link Bool}, etc.). In most cases, a zkApp developer does not need these functions to create zkApps.
 */
declare interface Provable<T> {
  /**
   * A function that takes `value`, an element of type `T`, as argument and returns an array of {@link Field} elements that make up the provable data of `value`.
   *
   * @param value - the element of type `T` to generate the {@link Field} array from.
   *
   * @return A {@link Field} array describing how this `T` element is made up of {@link Field} elements.
   */
  toFields: (value: T) => Field[];

  /**
   * A function that takes `value` (optional), an element of type `T`, as argument and returns an array of any type that make up the "auxiliary" (non-provable) data of `value`.
   *
   * @param value - the element of type `T` to generate the auxiliary data array from, optional. If not provided, a default value for auxiliary data is returned.
   *
   * @return An array of any type describing how this `T` element is made up of "auxiliary" (non-provable) data.
   */
  toAuxiliary: (value?: T) => any[];

  /**
   * A function that returns an element of type `T` from the given provable and "auxiliary" data.
   *
   * **Important**: For any element of type `T`, this function is the reverse operation of calling {@link toFields} and {@link toAuxilary} methods on an element of type `T`.
   *
   * @param fields - an array of {@link Field} elements describing the provable data of the new `T` element.
   * @param aux - an array of any type describing the "auxiliary" data of the new `T` element, optional.
   *
   * @return An element of type `T` generated from the given provable and "auxiliary" data.
   */
  fromFields: (fields: Field[], aux: any[]) => T;

  /**
   * Return the size of the `T` type in terms of {@link Field} type, as {@link Field} is the primitive type.
   *
   * **Warning**: This function returns a `number`, so you cannot use it to prove something on chain. You can use it during debugging or to understand the memory complexity of some type.
   *
   * @return A `number` representing the size of the `T` type in terms of {@link Field} type.
   */
  sizeInFields(): number;

  /**
   * Add assertions to the proof to check if `value` is a valid member of type `T`.
   * This function does not return anything, instead it creates any number of assertions to prove that `value` is a valid member of the type `T`.
   *
   * For instance, calling check function on the type {@link Bool} asserts that the value of the element is either 1 or 0.
   *
   * @param value - the element of type `T` to put assertions on.
   */
  check: (value: T) => void;
}

/**
 * `ProvablePure<T>` is a special kind of {@link Provable} interface, where the "auxiliary" (non-provable) data is empty. This means the type consists only of field elements, in that sense it is "pure".
 * Any element on the interface `ProvablePure<T>` is also an element of the interface `Provable<T>` where the "auxiliary" data is empty.
 *
 * Examples where `ProvablePure<T>` is required are types of on-chain state, events and actions.
 *
 * It includes the same properties and methods as the {@link Provable} interface.
 */
declare interface ProvablePure<T> extends Provable<T> {
  /**
   * A function that takes `value`, an element of type `T`, as argument and returns an array of {@link Field} elements that make up the provable data of `value`.
   *
   * @param value - the element of type `T` to generate the {@link Field} array from.
   *
   * @return A {@link Field} array describing how this `T` element is made up of {@link Field} elements.
   */
  toFields: (value: T) => Field[];

  /**
   * A function that takes `value` (optional), an element of type `T`, as argument and returns an array of any type that make up the "auxiliary" (non-provable) data of `value`.
   * As any element of the interface `ProvablePure<T>` includes no "auxiliary" data by definition, this function always returns a default value.
   *
   * @param value - the element of type `T` to generate the auxiliary data array from, optional. If not provided, a default value for auxiliary data is returned.
   *
   * @return An empty array, as any element of the interface `ProvablePure<T>` includes no "auxiliary" data by definition.
   */
  toAuxiliary: (value?: T) => any[];

  /**
   * A function that returns an element of type `T` from the given provable data.
   *
   * **Important**: For any element of type `T`, this function is the reverse operation of calling {@link toFields} method on an element of type `T`.
   *
   * @param fields - an array of {@link Field} elements describing the provable data of the new `T` element.
   *
   * @return An element of type `T` generated from the given provable data.
   */
  fromFields: (fields: Field[]) => T;

  /**
   * Return the size of the `T` type in terms of {@link Field} type, as {@link Field} is the primitive type.
   *
   * **Warning**: This function returns a `number`, so you cannot use it to prove something on chain. You can use it during debugging or to understand the memory complexity of some type.
   *
   * @return A `number` representing the size of the `T` type in terms of {@link Field} type.
   */
  sizeInFields(): number;

  /**
   * Add assertions to the proof to check if `value` is a valid member of type `T`.
   * This function does not return anything, rather creates any number of assertions on the proof to prove `value` is a valid member of the type `T`.
   *
   * For instance, calling check function on the type {@link Bool} asserts that the value of the element is either 1 or 0.
   *
   * @param value - the element of type `T` to put assertions on.
   */
  check: (value: T) => void;
}

type MlGroup = MlTuple<FieldVar, FieldVar>;

declare namespace Snarky {
  type Main = (publicInput: MlArray<FieldVar>) => void;
  type Keypair = unknown;
  type VerificationKey = unknown;
  type Proof = unknown;
}

/**
 * Internal interface to snarky-ml
 *
 * Note for devs: This module is intended to closely mirror snarky-ml's core, low-level APIs.
 */
declare const Snarky: {
  /**
   * witness `sizeInFields` field element variables
   *
   * Note: this is called "exists" because in a proof, you use it like this:
   * > "I prove that there exists x, such that (some statement)"
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
   * APIs that have to do with running provable code
   */
  run: {
    /**
     * Runs code as a prover.
     */
    asProver(f: () => void): void;
    /**
     * Check whether we are inside an asProver or exists block
     */
    inProverBlock(): boolean;
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
    scale(c: FieldConst, x: FieldVar): FieldVar;
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
     * x*x === y without handling of constants
     */
    assertSquare(x: FieldVar, y: FieldVar): void;
    /**
     * x*x === x without handling of constants
     */
    assertBoolean(x: FieldVar): void;
    /**
     * check x < y and x <= y
     */
    compare(
      bitLength: number,
      x: FieldVar,
      y: FieldVar
    ): [_: 0, less: BoolVar, lessOrEqual: BoolVar];
    /**
     *
     */
    toBits(length: number, x: FieldVar): MlArray<BoolVar>;
    /**
     *
     */
    fromBits(bits: MlArray<BoolVar>): FieldVar;
    /**
     * returns x truncated to the lowest `16 * lengthDiv16` bits
     * => can be used to assert that x fits in `16 * lengthDiv16` bits.
     *
     * more efficient than `toBits()` because it uses the EC_endoscalar gate;
     * does 16 bits per row (vs 1 bits per row that you can do with generic gates).
     */
    truncateToBits16(lengthDiv16: number, x: FieldVar): FieldVar;
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
    ): [
      _: 0,
      constant: MlOption<FieldConst>,
      terms: MlList<MlTuple<FieldConst, number>>
    ];
  };

  bool: {
    not(x: BoolVar): BoolVar;

    and(x: BoolVar, y: BoolVar): BoolVar;

    or(x: BoolVar, y: BoolVar): BoolVar;

    equals(x: BoolVar, y: BoolVar): BoolVar;

    assertEqual(x: BoolVar, y: BoolVar): void;
  };

  group: {
    /**
     * Low-level Elliptic Curve Addition gate.
     */
    ecadd(
      p1: MlGroup,
      p2: MlGroup,
      p3: MlGroup,
      inf: FieldVar,
      same_x: FieldVar,
      slope: FieldVar,
      inf_z: FieldVar,
      x21_inv: FieldVar
    ): MlGroup;

    scale(p: MlGroup, s: MlArray<BoolVar>): MlGroup;
  };

  /**
   * The circuit API is a low level interface to create zero-knowledge proofs
   */
  circuit: {
    /**
     * Generates a proving key and a verification key for the provable function `main`
     */
    compile(main: Snarky.Main, publicInputSize: number): Snarky.Keypair;

    /**
     * Proves a statement using the private input, public input and the keypair of the circuit.
     */
    prove(
      main: Snarky.Main,
      publicInputSize: number,
      publicInput: MlArray<FieldConst>,
      keypair: Snarky.Keypair
    ): Snarky.Proof;

    /**
     * Verifies a proof using the public input, the proof and the verification key of the circuit.
     */
    verify(
      publicInput: MlArray<FieldConst>,
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

  poseidon: {
    update(
      state: MlArray<FieldVar>,
      input: MlArray<FieldVar>
    ): [0, FieldVar, FieldVar, FieldVar];

    hashToGroup(input: MlArray<FieldVar>): MlTuple<FieldVar, FieldVar>;

    sponge: {
      create(isChecked: boolean): unknown;
      absorb(sponge: unknown, x: FieldVar): void;
      squeeze(sponge: unknown): FieldVar;
    };
  };
};

type JsonGate = {
  typ: string;
  wires: { row: number; col: number }[];
  coeffs: number[][];
};
type JsonConstraintSystem = { gates: JsonGate[]; public_input_size: number };

type Gate = {
  type: string;
  wires: { row: number; col: number }[];
  coeffs: string[];
};

// TODO: Add this when OCaml bindings are implemented:
// declare class EndoScalar {
//   static toFields(x: Scalar): Field[];
//   static fromFields(fields: Field[]): Scalar;
//   static sizeInFields(): number;
// }

type MlPublicKey = [_: 0, x: FieldConst, isOdd: MlBool];
type MlPublicKeyVar = [_: 0, x: FieldVar, isOdd: BoolVar];

/**
 * Represents the Mina ledger.
 */
declare class Ledger {
  /**
   * Creates a fresh ledger.
   */
  static create(): Ledger;

  /**
   * Adds an account and its balance to the ledger.
   */
  addAccount(publicKey: MlPublicKey, balance: string): void;

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
  getAccount(
    publicKey: MlPublicKey,
    tokenId: FieldConst
  ): JsonAccount | undefined;
}

declare const Test: {
  encoding: {
    // arbitrary base58Check encoding
    toBase58(s: MlBytes, versionByte: number): string;
    ofBase58(base58: string, versionByte: number): MlBytes;

    // base58 encoding of some transaction types
    publicKeyToBase58(publicKey: MlPublicKey): string;
    publicKeyOfBase58(publicKeyBase58: string): MlPublicKey;
    privateKeyToBase58(privateKey: ScalarConst): string;
    privateKeyOfBase58(privateKeyBase58: string): ScalarConst;
    tokenIdToBase58(field: FieldConst): string;
    tokenIdOfBase58(fieldBase58: string): FieldConst;
    memoToBase58(memoString: string): string;
    memoHashBase58(memoBase58: string): FieldConst;
  };

  tokenId: {
    // derive custom token ids
    derive(publicKey: MlPublicKey, tokenId: FieldConst): FieldConst;
    deriveChecked(publicKey: MlPublicKeyVar, tokenId: FieldVar): FieldVar;
  };

  poseidon: {
    hashToGroup(input: MlArray<FieldConst>): MlTuple<FieldConst, FieldConst>;
  };

  signature: {
    /**
     * Signs a {@link Field} element.
     */
    signFieldElement(
      messageHash: FieldConst,
      privateKey: ScalarConst,
      isMainnet: boolean
    ): string;
    /**
     * Returns a dummy signature.
     */
    dummySignature(): string;
  };

  fieldsFromJson: {
    accountUpdate(json: string): MlArray<FieldConst>;
  };
  hashFromJson: {
    accountUpdate(json: string): FieldConst;
    /**
     * Returns the commitment of a JSON transaction.
     */
    transactionCommitments(txJson: string): {
      commitment: FieldConst;
      fullCommitment: FieldConst;
      feePayerHash: FieldConst;
    };
    /**
     * Returns the public input of a zkApp transaction.
     */
    zkappPublicInput(
      txJson: string,
      accountUpdateIndex: number
    ): { accountUpdate: FieldConst; calls: FieldConst };
  };
  hashInputFromJson: {
    packInput(input: MlHashInput): MlArray<FieldConst>;
    timing(json: String): MlHashInput;
    permissions(json: String): MlHashInput;
    update(json: String): MlHashInput;
    accountPrecondition(json: String): MlHashInput;
    networkPrecondition(json: String): MlHashInput;
    body(json: String): MlHashInput;
  };

  transactionHash: {
    examplePayment(): string;
    serializePayment(payment: string): { data: Uint8Array };
    serializePaymentV1(payment: string): string;
    serializeCommon(common: string): { data: Uint8Array };
    hashPayment(payment: string): string;
    hashPaymentV1(payment: string): string;
  };
};

declare namespace Pickles {
  type Proof = unknown; // opaque to js
  type Statement<F> = [_: 0, publicInput: MlArray<F>, publicOutput: MlArray<F>];
  type Rule = {
    identifier: string;
    main: (publicInput: MlArray<FieldVar>) => {
      publicOutput: MlArray<FieldVar>;
      previousStatements: MlArray<Statement<FieldVar>>;
      shouldVerify: MlArray<BoolVar>;
    };
    proofsToVerify: MlArray<{ isSelf: true } | { isSelf: false; tag: unknown }>;
  };
  type Prover = (
    publicInput: MlArray<FieldConst>,
    previousProofs: MlArray<Proof>
  ) => Promise<[_: 0, publicOutput: MlArray<FieldConst>, proof: Proof]>;
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
    rules: MlArray<Pickles.Rule>,
    signature: {
      publicInputSize: number;
      publicOutputSize: number;
      overrideWrapDomain?: 0 | 1 | 2;
    }
  ) => {
    provers: MlArray<Pickles.Prover>;
    verify: (
      statement: Pickles.Statement<FieldConst>,
      proof: Pickles.Proof
    ) => Promise<boolean>;
    tag: unknown;
    /**
     * @returns (base64 vk, hash)
     */
    getVerificationKey: () => [_: 0, data: string, hash: FieldConst];
  };

  verify(
    statement: Pickles.Statement<FieldConst>,
    proof: Pickles.Proof,
    verificationKey: string
  ): Promise<boolean>;

  dummyBase64Proof: () => string;
  /**
   * @returns (base64 vk, hash)
   */
  dummyVerificationKey: () => [_: 0, data: string, hash: FieldConst];

  proofToBase64: (proof: [0 | 1 | 2, Pickles.Proof]) => string;
  proofOfBase64: (
    base64: string,
    maxProofsVerified: 0 | 1 | 2
  ) => [0 | 1 | 2, Pickles.Proof];

  proofToBase64Transaction: (proof: Pickles.Proof) => string;
};
