import type { Account as JsonAccount } from './bindings/mina-transaction/gen/transaction-json.js';
import type { Field, FieldConst, FieldVar, VarFieldVar } from './lib/field.js';
import type { BoolVar, Bool } from './lib/bool.js';
import type { ScalarConst } from './lib/scalar.js';
import type {
  MlArray,
  MlPair,
  MlList,
  MlOption,
  MlBool,
  MlBytes,
  MlResult,
  MlUnit,
  MlString,
  MlTuple,
} from './lib/ml/base.js';
import type { MlHashInput } from './lib/ml/conversion.js';
import type {
  SnarkKey,
  SnarkKeyHeader,
  MlWrapVerificationKey,
} from './lib/proof-system/prover-keys.js';
import { getWasm } from './bindings/js/wrapper.js';
import type {
  WasmFpSrs,
  WasmFqSrs,
} from './bindings/compiled/node_bindings/plonk_wasm.cjs';
import type { KimchiGateType } from './lib/gates.ts';
import type { FieldVector } from './bindings/crypto/bindings/vector.ts';

export { ProvablePure, Provable, Ledger, Pickles, Gate, GateType, getWasm };

// internal
export {
  Snarky,
  Test,
  JsonGate,
  MlPublicKey,
  MlPublicKeyVar,
  FeatureFlags,
  MlFeatureFlags,
};

/**
 * `Provable<T>` is the general circuit type interface in o1js. `Provable<T>` interface describes how a type `T` is made up of {@link Field} elements and "auxiliary" (non-provable) data.
 *
 * `Provable<T>` is the required input type in a few places in o1js. One convenient way to create a `Provable<T>` is using `Struct`.
 *
 * The properties and methods on the provable type exist in all base o1js types as well (aka. {@link Field}, {@link Bool}, etc.). In most cases, a zkApp developer does not need these functions to create zkApps.
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

type MlGroup = MlPair<FieldVar, FieldVar>;

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
  ): MlArray<VarFieldVar>;
  /**
   * witness a single field element variable
   */
  existsVar(compute: () => FieldConst): VarFieldVar;

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
    seal(x: FieldVar): VarFieldVar;
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
      terms: MlList<MlPair<FieldConst, number>>
    ];
  };

  gates: {
    zero(in1: FieldVar, in2: FieldVar, out: FieldVar): void;

    generic(
      sl: FieldConst,
      l: FieldVar,
      sr: FieldConst,
      r: FieldVar,
      so: FieldConst,
      o: FieldVar,
      sm: FieldConst,
      sc: FieldConst
    ): void;

    poseidon(state: MlArray<MlTuple<Field, 3>>): void;

    /**
     * Low-level Elliptic Curve Addition gate.
     */
    ecAdd(
      p1: MlGroup,
      p2: MlGroup,
      p3: MlGroup,
      inf: FieldVar,
      same_x: FieldVar,
      slope: FieldVar,
      inf_z: FieldVar,
      x21_inv: FieldVar
    ): MlGroup;

    ecScale(
      state: MlArray<
        [
          _: 0,
          accs: MlArray<MlTuple<FieldVar, 2>>,
          bits: MlArray<FieldVar>,
          ss: MlArray<FieldVar>,
          base: MlGroup,
          nPrev: Field,
          nNext: Field
        ]
      >
    ): void;

    ecEndoscale(
      state: MlArray<
        [
          _: 0,
          xt: FieldVar,
          yt: FieldVar,
          xp: FieldVar,
          yp: FieldVar,
          nAcc: FieldVar,
          xr: FieldVar,
          yr: FieldVar,
          s1: FieldVar,
          s3: FieldVar,
          b1: FieldVar,
          b2: FieldVar,
          b3: FieldVar,
          b4: FieldVar
        ]
      >,
      xs: FieldVar,
      ys: FieldVar,
      nAcc: FieldVar
    ): void;

    ecEndoscalar(
      state: MlArray<
        [
          _: 0,
          n0: FieldVar,
          n8: FieldVar,
          a0: FieldVar,
          b0: FieldVar,
          a8: FieldVar,
          b8: FieldVar,
          x0: FieldVar,
          x1: FieldVar,
          x2: FieldVar,
          x3: FieldVar,
          x4: FieldVar,
          x5: FieldVar,
          x6: FieldVar,
          x7: FieldVar
        ]
      >
    ): void;

    lookup(input: MlTuple<FieldVar, 7>): void;

    /**
     * Range check gate
     *
     * @param v0 field var to be range checked
     * @param v0p bits 16 to 88 as 6 12-bit limbs
     * @param v0c bits 0 to 16 as 8 2-bit limbs
     * @param compact boolean field elements -- whether to use "compact mode"
     */
    rangeCheck0(
      v0: FieldVar,
      v0p: MlTuple<FieldVar, 6>,
      v0c: MlTuple<FieldVar, 8>,
      compact: FieldConst
    ): void;

    rangeCheck1(
      v2: FieldVar,
      v12: FieldVar,
      vCurr: MlTuple<FieldVar, 13>,
      vNext: MlTuple<FieldVar, 15>
    ): void;

    xor(
      in1: FieldVar,
      in2: FieldVar,
      out: FieldVar,
      in1_0: FieldVar,
      in1_1: FieldVar,
      in1_2: FieldVar,
      in1_3: FieldVar,
      in2_0: FieldVar,
      in2_1: FieldVar,
      in2_2: FieldVar,
      in2_3: FieldVar,
      out_0: FieldVar,
      out_1: FieldVar,
      out_2: FieldVar,
      out_3: FieldVar
    ): void;

    foreignFieldAdd(
      left: MlTuple<FieldVar, 3>,
      right: MlTuple<FieldVar, 3>,
      fieldOverflow: FieldVar,
      carry: FieldVar,
      foreignFieldModulus: MlTuple<FieldConst, 3>,
      sign: FieldConst
    ): void;

    foreignFieldMul(
      left: MlTuple<FieldVar, 3>,
      right: MlTuple<FieldVar, 3>,
      remainder: MlTuple<FieldVar, 2>,
      quotient: MlTuple<FieldVar, 3>,
      quotientHiBound: FieldVar,
      product1: MlTuple<FieldVar, 3>,
      carry0: FieldVar,
      carry1p: MlTuple<FieldVar, 7>,
      carry1c: MlTuple<FieldVar, 4>,
      foreignFieldModulus2: FieldConst,
      negForeignFieldModulus: MlTuple<FieldConst, 3>
    ): void;

    rotate(
      field: FieldVar,
      rotated: FieldVar,
      excess: FieldVar,
      limbs: MlArray<FieldVar>,
      crumbs: MlArray<FieldVar>,
      two_to_rot: FieldConst
    ): void;

    addFixedLookupTable(id: number, data: MlArray<MlArray<FieldConst>>): void;

    addRuntimeTableConfig(id: number, firstColumn: MlArray<FieldConst>): void;

    raw(
      kind: KimchiGateType,
      values: MlArray<FieldVar>,
      coefficients: MlArray<FieldConst>
    ): void;
  };

  bool: {
    not(x: BoolVar): BoolVar;

    and(x: BoolVar, y: BoolVar): BoolVar;

    or(x: BoolVar, y: BoolVar): BoolVar;

    equals(x: BoolVar, y: BoolVar): BoolVar;

    assertEqual(x: BoolVar, y: BoolVar): void;
  };

  group: {
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

  // TODO: implement in TS
  poseidon: {
    update(
      state: MlArray<FieldVar>,
      input: MlArray<FieldVar>
    ): [0, FieldVar, FieldVar, FieldVar];

    hashToGroup(input: MlArray<FieldVar>): MlPair<FieldVar, FieldVar>;

    sponge: {
      create(isChecked: boolean): unknown;
      absorb(sponge: unknown, x: FieldVar): void;
      squeeze(sponge: unknown): FieldVar;
    };
  };

  lowLevel: {
    state: Ref<SnarkyState>;
    setState(state: SnarkyState): void;
    createState(
      numInputs: number,
      evalConstraints: MlBool,
      withWitness: MlBool,
      logConstraint: MlOption<
        (
          atLabelBoundary: MlOption<unknown>,
          constraint: MlOption<SnarkyConstraint>
        ) => void
      >
    ): [
      _: 0,
      state: SnarkyState,
      input: FieldVector,
      aux: FieldVector,
      system: ConstraintSystem
    ];
  };
};

type Ref<T> = [_: 0, contents: T];

type SnarkyVector = [0, [unknown, number, FieldVector]];
type ConstraintSystem = unknown;

type SnarkyState = [
  _: 0,
  system: MlOption<ConstraintSystem>,
  input: SnarkyVector,
  aux: SnarkyVector,
  eval_constraints: MlBool,
  num_inputs: number,
  next_auxiliary: Ref<number>,
  has_witness: MlBool,
  stack: MlList<MlString>,
  is_running: MlBool,
  log_constraint: unknown
];

type SnarkyConstraint = [
  _: 0,
  basic: [number, unknown], // actually this is an enum
  annotation: MlOption<MlString>
];

type GateType =
  | 'Zero'
  | 'Generic'
  | 'Poseidon'
  | 'CompleteAdd'
  | 'VarbaseMul'
  | 'EndoMul'
  | 'EndoMulScalar'
  | 'Lookup'
  | 'RangeCheck0'
  | 'RangeCheck1'
  | 'ForeignFieldAdd'
  | 'ForeignFieldMul'
  | 'Xor16'
  | 'Rot64';

type JsonGate = {
  typ: GateType;
  wires: { row: number; col: number }[];
  coeffs: string[];
};
type JsonConstraintSystem = { gates: JsonGate[]; public_input_size: number };

type Gate = {
  type: GateType;
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
    hashToGroup(input: MlArray<FieldConst>): MlPair<FieldConst, FieldConst>;
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

type FeatureFlags = {
  rangeCheck0: boolean;
  rangeCheck1: boolean;
  foreignFieldAdd: boolean;
  foreignFieldMul: boolean;
  xor: boolean;
  rot: boolean;
  lookup: boolean;
  runtimeTables: boolean;
};

type MlFeatureFlags = [
  _: 0,
  rangeCheck0: MlBool,
  rangeCheck1: MlBool,
  foreignFieldAdd: MlBool,
  foreignFieldMul: MlBool,
  xor: MlBool,
  rot: MlBool,
  lookup: MlBool,
  runtimeTables: MlBool
];

declare namespace Pickles {
  type Proof = unknown; // opaque to js
  type Statement<F> = [_: 0, publicInput: MlArray<F>, publicOutput: MlArray<F>];

  /**
   * A "rule" is a circuit plus some metadata for `Pickles.compile`
   */
  type Rule = {
    identifier: string;
    /**
     * The main circuit functions
     */
    main: (publicInput: MlArray<FieldVar>) => {
      publicOutput: MlArray<FieldVar>;
      previousStatements: MlArray<Statement<FieldVar>>;
      shouldVerify: MlArray<BoolVar>;
    };
    /**
     * Feature flags which enable certain custom gates
     */
    featureFlags: MlFeatureFlags;
    /**
     * Description of previous proofs to verify in this rule
     */
    proofsToVerify: MlArray<{ isSelf: true } | { isSelf: false; tag: unknown }>;
  };

  /**
   * Type to configure how Pickles should cache prover keys
   */
  type Cache = [
    _: 0,
    read: (header: SnarkKeyHeader, path: string) => MlResult<SnarkKey, MlUnit>,
    write: (
      header: SnarkKeyHeader,
      value: SnarkKey,
      path: string
    ) => MlResult<undefined, MlUnit>,
    canWrite: MlBool
  ];

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
    config: {
      publicInputSize: number;
      publicOutputSize: number;
      storable?: Pickles.Cache;
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

  loadSrsFp(): WasmFpSrs;
  loadSrsFq(): WasmFqSrs;

  dummyProof: <N extends 0 | 1 | 2>(
    maxProofsVerified: N,
    domainLog2: number
  ) => [N, Pickles.Proof];

  /**
   * @returns (base64 vk, hash)
   */
  dummyVerificationKey: () => [_: 0, data: string, hash: FieldConst];

  encodeVerificationKey: (vk: MlWrapVerificationKey) => string;
  decodeVerificationKey: (vk: string) => MlWrapVerificationKey;

  proofToBase64: (proof: [0 | 1 | 2, Pickles.Proof]) => string;
  proofOfBase64: <N extends 0 | 1 | 2>(
    base64: string,
    maxProofsVerified: N
  ) => [N, Pickles.Proof];

  proofToBase64Transaction: (proof: Pickles.Proof) => string;

  util: {
    toMlString(s: string): MlString;
    fromMlString(s: MlString): string;
  };
};
