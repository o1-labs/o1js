import type { Account as JsonAccount } from './bindings/mina-transaction/gen/transaction-json.js';
import type { Field } from './lib/provable/field.js';
import type {
  FieldVar,
  FieldConst,
  VarFieldVar,
} from './lib/provable/core/fieldvar.ts';
import type { BoolVar } from './lib/provable/bool.ts';
import type { ScalarConst } from './lib/provable/scalar.js';
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
  MlArrayOptionalElements,
} from './lib/ml/base.js';
import type { MlHashInput } from './lib/ml/conversion.js';
import type {
  SnarkKey,
  SnarkKeyHeader,
  MlWrapVerificationKey,
} from './lib/proof-system/prover-keys.js';
import type {
  WasmFpSrs,
  WasmFqSrs,
} from './bindings/compiled/node_bindings/plonk_wasm.cjs';
import * as wasm from './bindings/compiled/node_bindings/plonk_wasm.cjs';
import type { KimchiGateType } from './lib/provable/gates.ts';
import type { MlConstraintSystem } from './lib/provable/core/provable-context.ts';
import type { FieldVector } from './bindings/crypto/bindings/vector.ts';

export { Ledger, Pickles, Gate, GateType, wasm, initializeBindings };

// internal
export {
  Snarky,
  Test,
  WasmModule,
  withThreadPool,
  JsonGate,
  MlPublicKey,
  MlPublicKeyVar,
  MlFeatureFlags,
  areBindingsInitialized,
};

declare let areBindingsInitialized: boolean;

type WasmModule = typeof wasm;

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
   * APIs that have to do with running provable code
   */
  run: {
    /**
     * Checks whether Snarky runs in "prover mode", that is, with witnesses
     */
    inProver(): MlBool;
    /**
     * Runs code as a prover.
     */
    asProver(f: () => void): void;
    /**
     * Check whether we are inside an asProver or exists block
     */
    inProverBlock(): boolean;
    /**
     * Setting that controls whether snarky throws an exception on violated constraint.
     */
    setEvalConstraints(value: MlBool): void;
    /**
     * Starts constraint system runner and returns a function to finish it.
     */
    enterConstraintSystem(): () => MlConstraintSystem;
    /**
     * Starts witness generation and returns a function to finish it.
     */
    enterGenerateWitness(): () => [
      _: 0,
      public_inputs: FieldVector,
      auxiliary_inputs: FieldVector
    ];
    /**
     * Starts an asProver / witness block and returns a function to finish it.
     */
    enterAsProver(
      size: number
    ): (fields: MlOption<MlArray<FieldConst>>) => MlArray<VarFieldVar>;

    /**
     * Operations on snarky's internal state
     */
    state: {
      allocVar(state: SnarkyState): FieldVar;
      storeFieldElt(state: SnarkyState, x: FieldConst): FieldVar;
      getVariableValue(state: SnarkyState, x: FieldVar): FieldConst;

      asProver(state: SnarkyState): MlBool;
      setAsProver(state: SnarkyState, value: MlBool): void;
      hasWitness(state: SnarkyState): MlBool;
    };
  };

  /**
   * APIs to interact with a `Backend.R1CS_constraint_system.t`
   */
  constraintSystem: {
    /**
     * Returns the number of rows of the constraint system.
     */
    rows(system: MlConstraintSystem): number;
    /**
     * Returns an md5 digest of the constraint system.
     */
    digest(system: MlConstraintSystem): string;
    /**
     * Returns a JSON representation of the constraint system.
     */
    toJson(system: MlConstraintSystem): JsonConstraintSystem;
  };

  /**
   * APIs to add constraints on field variables
   */
  field: {
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
     * returns x truncated to the lowest `16 * lengthDiv16` bits
     * => can be used to assert that x fits in `16 * lengthDiv16` bits.
     *
     * more efficient than `toBits()` because it uses the EC_endoscalar gate;
     * does 16 bits per row (vs 1 bits per row that you can do with generic gates).
     */
    truncateToBits16(lengthDiv16: number, x: FieldVar): FieldVar;
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

  group: {
    /**
     * Computes `(2*s + 1 + 2^numBits) * P` and also returns the bits of s (which are proven correct).
     *
     * `numBits` must be a multiple of 5, and s must be in the range [0, 2^numBits).
     * The [soundness proof](https://github.com/zcash/zcash/issues/3924) assumes
     * `numBits <= n - 2` where `n` is the bit length of the scalar field.
     * In our case, n=255 so numBits <= 253.
     */
    scaleFastUnpack(
      P: MlGroup,
      shiftedValue: [_: 0, s: FieldVar],
      numBits: number
    ): MlPair<MlGroup, MlArray<BoolVar>>;
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
};

type MlRef<T> = [_: 0, contents: T];

type SnarkyVector = [0, [unknown, number, FieldVector]];
type ConstraintSystem = unknown;

type SnarkyState = [
  _: 0,
  system: MlOption<ConstraintSystem>,
  input: SnarkyVector,
  aux: SnarkyVector,
  eval_constraints: MlBool,
  num_inputs: number,
  next_auxiliary: MlRef<number>,
  has_witness: MlBool,
  stack: MlList<MlString>,
  handler: unknown,
  is_running: MlBool,
  as_prover: MlRef<MlBool>,
  log_constraint: unknown
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

declare function Test(): Promise<Test>;

type Test = {
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
      networkId: string
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
    accountUpdate(json: string, networkId: string): FieldConst;
    /**
     * Returns the commitment of a JSON transaction.
     */
    transactionCommitments(
      txJson: string,
      networkId: string
    ): {
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
    hashZkAppCommand(command: string): string;
  };
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
    main: (publicInput: MlArray<FieldVar>) => Promise<{
      publicOutput: MlArray<FieldVar>;
      previousStatements: MlArray<Statement<FieldVar>>;
      previousProofs: MlArray<Proof>;
      shouldVerify: MlArray<BoolVar>;
    }>;
    /**
     * Feature flags which enable certain custom gates
     */
    featureFlags: MlArrayOptionalElements<MlFeatureFlags>;
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
    publicInput: MlArray<FieldConst>
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
    getVerificationKey: () => Promise<[_: 0, data: string, hash: FieldConst]>;
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

  sideLoaded: {
    // Create a side-loaded key tag
    create: (
      name: string,
      numProofsVerified: 0 | 1 | 2,
      publicInputLength: number,
      publicOutputLength: number,
      featureFlags: MlArrayOptionalElements<MlFeatureFlags>
    ) => unknown /* tag */;
    // Instantiate the verification key inside the circuit (required).
    inCircuit: (tag: unknown, verificationKey: unknown) => undefined;
    // Instantiate the verification key in prover-only logic (also required).
    inProver: (tag: unknown, verificationKey: string) => undefined;
    // Create an in-circuit representation of a verification key
    vkToCircuit: (
      verificationKey: () => string
    ) => unknown /* verificationKeyInCircuit */;
    // Get the digest of a verification key in the circuit
    vkDigest: (verificationKeyInCircuit: unknown) => MlArray<FieldVar>;
  };

  util: {
    toMlString(s: string): MlString;
    fromMlString(s: MlString): string;
  };
};

/**
 * A function that has to finish before any bindings exports can be used.
 */
declare function initializeBindings(): Promise<void>;

declare function withThreadPool<T>(run: () => Promise<T>): Promise<T>;
