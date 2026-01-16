import { getRustConversion } from '../../bindings/crypto/bindings.js';
import { Pickles, Snarky, initializeBindings, wasm, withThreadPool } from '../../bindings.js';
import { MlFieldArray, MlFieldConstArray } from '../ml/fields.js';
import {
  ConstraintSystemSummary,
  gatesFromJson,
  printGates,
  snarkContext,
  summarizeGates,
} from '../provable/core/provable-context.js';
import { Provable } from '../provable/provable.js';
import { InferProvable, provablePure } from '../provable/types/provable-derivers.js';
import { ProvableTypePure } from '../provable/types/provable-intf.js';
import { Field } from '../provable/wrapped.js';
import { prettifyStacktrace, prettifyStacktracePromise } from '../util/errors.js';
import { Get, Tuple } from '../util/types.js';
import { TupleToInstances } from './zkprogram.js';

// external API
export { KimchiJsonProof, KimchiProof, KimchiVerificationKey, ZkFunction };

type PublicInput<Config extends ZkFunctionConfig> = InferProvable<Get<Config, 'publicInputType'>>;
type PrivateInputs<Config extends ZkFunctionConfig> = TupleToInstances<Config['privateInputTypes']>;

type ZkFunctionConfig = {
  name: string;
  publicInputType?: ProvableTypePure;
  privateInputTypes: Tuple<ProvableTypePure>;
  lazyMode?: boolean;
};

type MainType<
  PublicInput,
  PrivateInputs extends Tuple<ProvableTypePure>,
> = PublicInput extends undefined
  ? (...args: TupleToInstances<PrivateInputs>) => void
  : (publicInput: InferProvable<PublicInput>, ...args: TupleToInstances<PrivateInputs>) => void;

type InferMainType<Config extends ZkFunctionConfig> = MainType<
  Get<Config, 'publicInputType'>,
  Config['privateInputTypes']
>;

type ProveMethodType<Config extends ZkFunctionConfig> =
  Get<Config, 'publicInputType'> extends undefined
    ? (...args: PrivateInputs<Config>) => Promise<KimchiProof>
    : (publicInput: PublicInput<Config>, ...args: PrivateInputs<Config>) => Promise<KimchiProof>;

function ZkFunction<Config extends ZkFunctionConfig>(
  config: Config & {
    main: InferMainType<Config>;
  }
) {
  const publicInputType = provablePure(config.publicInputType ?? undefined);
  const hasPublicInput = config.publicInputType !== undefined;

  type Keypair = Snarky.Keypair;
  let _keypair: Keypair | undefined;
  let _proofsEnabled = true;

  return {
    /**
     * Generates and stores a proving key and a verification key for this circuit(ZkFunction).
     *
     * @param options Optional configuration object.
     * @param options.proofsEnabled If `false`, proofs will be disabled and dummy proofs will be generated instead. Defaults to `true`.
     * @returns The generated verification key.
     *
     * @example
     * ```ts
     * const { verificationKey } = await zkf.compile();
     * // or with proofs disabled:
     * const { verificationKey } = await zkf.compile({ proofsEnabled: false });
     * ```
     * @warning Must be called before `prove` or `analyzeMethod`.
     */
    async compile(options?: { proofsEnabled?: boolean }) {
      _proofsEnabled = options?.proofsEnabled ?? true;

      if (_proofsEnabled) {
        const main = mainFromCircuitData(config);
        const publicInputSize = publicInputType.sizeInFields();
        const lazyMode = config.lazyMode ?? false;
        await initializeBindings();
        _keypair = await prettifyStacktracePromise(
          withThreadPool(async () => {
            return Snarky.circuit.compile(main, publicInputSize, lazyMode);
          })
        );
        const verificationKey = new KimchiVerificationKey(
          Snarky.circuit.keypair.getVerificationKey(_keypair)
        );
        return { verificationKey };
      } else {
        // When proofs are disabled, create a minimal circuit to get a verification key
        // This ensures the API remains consistent
        await initializeBindings();
        const minimalMain: Snarky.Main = () => {
          // Empty circuit - just for getting a verification key
        };
        const publicInputSize = publicInputType.sizeInFields();
        const tempKeypair = await prettifyStacktracePromise(
          withThreadPool(async () => {
            return Snarky.circuit.compile(minimalMain, publicInputSize, false);
          })
        );
        const verificationKey = new KimchiVerificationKey(
          Snarky.circuit.keypair.getVerificationKey(tempKeypair)
        );
        return { verificationKey };
      }
    },

    /**
     * Returns a low-level JSON representation of the constraint system (gates)
     *
     * @throws If compile() has not been called yet or if proofs are disabled.
     *
     * @example
     * ```ts
     * await zkf.compile();
     * const cs = zkf.analyzeMethod();
     * console.log(cs);
     * ```
     */
    analyzeMethod(): Omit<ConstraintSystemSummary, 'digest'> {
      if (!_proofsEnabled || !_keypair) {
        throw new Error(
          'Cannot analyze method when proofs are disabled. Please call compile() with proofsEnabled: true first!'
        );
      }
      try {
        let { gates, publicInputSize } = gatesFromJson(
          Snarky.circuit.keypair.getConstraintSystemJSON(_keypair)
        );
        return {
          rows: gates.length,
          gates,
          publicInputSize,
          print() {
            printGates(gates);
          },
          summary() {
            return summarizeGates(gates);
          },
        };
      } catch (error) {
        throw prettifyStacktrace(error);
      }
    },

    /**
     * Proves a statement using the public input and private inputs of the circuit(ZkFunction).
     *
     * @param publicInput The public input to the circuit if it exists.
     * @param privateInputs The private inputs to the circuit.
     * @returns The generated proof. If `proofsEnabled` is `false`, returns a dummy proof.
     *
     * @throws If `compile` has not been called.
     *
     * @example
     * ```ts
     * const { verificationKey } = await zkf.compile();
     * const proof = await zkf.prove(publicInput, privateInput1, privateInput2);
     * ```
     */
    async prove(...args: Parameters<ProveMethodType<Config>>) {
      const publicInput = hasPublicInput ? args[0] : undefined;
      const privateInputs = (hasPublicInput ? args.slice(1) : args) as PrivateInputs<Config>;
      const publicInputFields = publicInputType.toFields(publicInput);

      if (!_proofsEnabled) {
        // When proofs are disabled, execute the circuit logic to ensure it works,
        // but return a dummy proof instead of generating a real one
        const main = mainFromCircuitData(config, privateInputs);
        await initializeBindings();
        // Execute the circuit to validate the logic without generating a proof
        // We compile and run the circuit to ensure the logic is correct
        await withThreadPool(async () => {
          const publicInputSize = publicInputType.sizeInFields();
          // Compile the circuit to validate the logic
          const tempKeypair = await Snarky.circuit.compile(
            main,
            publicInputSize,
            config.lazyMode ?? false
          );
          // Generate a proof to validate the circuit runs correctly
          // This ensures the circuit logic is valid even when proofs are disabled
          Snarky.circuit.prove(
            main,
            publicInputSize,
            MlFieldConstArray.to(publicInputFields),
            tempKeypair
          );
        });
        // Return a dummy proof
        return await KimchiProof.dummy(publicInputFields);
      }

      if (!_keypair) {
        throw new Error('Cannot find prover artifacts. Please call compile() first!');
      }

      const publicInputSize = publicInputType.sizeInFields();
      const main = mainFromCircuitData(config, privateInputs);
      await initializeBindings();
      return withThreadPool(async () => {
        const proof = Snarky.circuit.prove(
          main,
          publicInputSize,
          MlFieldConstArray.to(publicInputFields),
          _keypair!
        );
        return new KimchiProof(proof, publicInputFields);
      });
    },

    /**
     * Verifies a proof using the verification key of the circuit(ZkFunction).
     *
     * @param proof The proof to verify.
     * @param verificationKey The key to verify against.
     *
     * @returns `true` if the proof is valid, otherwise `false`. If `proofsEnabled` is `false`, always returns `true`.
     *
     * @example
     * ```ts
     * const { verificationKey } = await zkf.compile();
     * const proof = await zkf.prove(publicInput, privateInput1, privateInput2);
     * const isValid = await zkf.verify(proof, verificationKey);
     * ```
     */
    async verify(proof: KimchiProof, verificationKey: KimchiVerificationKey) {
      if (!_proofsEnabled) {
        return Promise.resolve(true);
      }
      return await proof.verify(verificationKey);
    },
  };
}

/**
 * Serializable representation of a Kimchi proof, useful for caching compiled proofs.
 */
type KimchiJsonProof = {
  /** Array of string, where each string is a `Field` in the publicInputFields of this proof */
  publicInputFields: string[];
  /** The proof itself, encoded as a Base64 string */
  proof: string;
};

/**
 * Encapsulates a {@link ZkFunction} proof together with its public input fields.
 *
 * Generated by {@link ZkFunction.prove}, it wraps the raw `Snarky.Proof`
 * and the array of `Field` inputs used for verification.
 *
 * You can call `verify` on a `Proof` to check its validity against a
 * {@link VerificationKey}.
 */
class KimchiProof {
  value: Snarky.Proof;
  publicInputFields: Field[];

  constructor(value: Snarky.Proof, publicInputFields: Field[]) {
    this.value = value;
    this.publicInputFields = publicInputFields;
  }

  toJSON(): KimchiJsonProof {
    const proofWithEvalsMl: any = Snarky.circuit.proofToBackendProofEvals(
      MlFieldConstArray.to(this.publicInputFields),
      this.value
    );
    const rustConversion = getRustConversion(wasm);
    const rustProof = rustConversion.fp.proofToRust(proofWithEvalsMl);
    return {
      proof: rustProof.serialize(),
      publicInputFields: this.publicInputFields.map((f) => f.toString()),
    };
  } 

  static fromJSON(json: KimchiJsonProof): KimchiProof {
    const bytes = Uint8Array.from(Buffer.from(json.proof, 'base64'));
    const rustProof = wasm.WasmFpProverProof.deserialize(bytes);
    const rustConversion = getRustConversion(wasm);
    const proofWithEvalsMl = Snarky.circuit.proofFromBackendProofEvals(
      rustConversion.fp.proofFromRust(rustProof)
    );
    const publicInputFields = json.publicInputFields.map((s) => Field(s));
    return new KimchiProof(proofWithEvalsMl, publicInputFields);
  } 
 
  /**
   * Verifies this proof using the provided verification key.
   * @param verificationKey The key to verify against.
   * @returns A promise that resolves to `true` if valid, otherwise `false`.
   */
  async verify(verificationKey: KimchiVerificationKey) {
    await initializeBindings();
    return prettifyStacktracePromise(
      withThreadPool(async () =>
        Snarky.circuit.verify(
          MlFieldConstArray.to(this.publicInputFields),
          this.value,
          verificationKey.value
        )
      )
    );
  }

  /**
   * Creates a dummy proof with the given public input fields.
   * This is useful for testing the logic of a ZkFunction without generating a real proof.
   *
   * @param publicInputFields The public input fields for the dummy proof.
   * @returns A promise that resolves to a dummy KimchiProof.
   *
   * @example
   * ```ts
   * const dummyProof = await KimchiProof.dummy([Field(0), Field(1)]);
   * ```
   */
  static async dummy(publicInputFields: Field[]): Promise<KimchiProof> {
    await initializeBindings();
    // Create a minimal circuit that does nothing to generate a dummy proof
    const minimalMain: Snarky.Main = (publicInputFields: MlFieldArray) => {
      // Empty circuit - just validates the public input structure
    };
    const publicInputSize = publicInputFields.length;
    return withThreadPool(async () => {
      const keypair = await Snarky.circuit.compile(minimalMain, publicInputSize, false);
      const proof = Snarky.circuit.prove(
        minimalMain,
        publicInputSize,
        MlFieldConstArray.to(publicInputFields),
        keypair
      );
      return new KimchiProof(proof, publicInputFields);
    });
  }
}

/**
 * A verification key is used to verify a {@link Proof}.
 */
class KimchiVerificationKey {
  value: Snarky.VerificationKey;

  constructor(value: Snarky.VerificationKey) {
    this.value = value;
  }
 
  toString(): string {
    const rustConversion = getRustConversion(wasm);
    const rustVerifierIndex = rustConversion.fp.verifierIndexToRust(this.value as any);
    const verifierIndexBase64 =
      wasm.caml_pasta_fp_plonk_verifier_index_serialize(rustVerifierIndex);
    return Buffer.from(verifierIndexBase64, 'utf8').toString('base64');
  }

  static fromString(base64: string): KimchiVerificationKey {
    const srsFp = Pickles.loadSrsFp();
    const rustVerifierIndex = wasm.caml_pasta_fp_plonk_verifier_index_deserialize(
      srsFp,
      Buffer.from(base64, 'base64').toString('utf8')
    );
    const rustConversion = getRustConversion(wasm);
    const verifierIndexMl: unknown = rustConversion.fp.verifierIndexFromRust(rustVerifierIndex);
    return new KimchiVerificationKey(verifierIndexMl);
  } 
}

function mainFromCircuitData<Config extends ZkFunctionConfig>(
  config: Config & { main: InferMainType<Config> },
  privateInputs?: PrivateInputs<Config>
): Snarky.Main {
  return function main(publicInputFields: MlFieldArray) {
    let id = snarkContext.enter({ inCheckedComputation: true });
    try {
      const publicInput = provablePure(config.publicInputType ?? undefined).fromFields(
        MlFieldArray.from(publicInputFields)
      ) as PublicInput<Config>;

      const privateInputs_ = config.privateInputTypes.map((typ, i) =>
        Provable.witness(typ, () => (privateInputs ? privateInputs[i] : undefined))
      ) as PrivateInputs<Config>;

      if (config.publicInputType !== undefined) {
        (config.main as (...args: unknown[]) => void)(publicInput, ...privateInputs_);
      } else {
        (config.main as (...args: unknown[]) => void)(...privateInputs_);
      }
    } finally {
      snarkContext.leave(id);
    }
  };
}
