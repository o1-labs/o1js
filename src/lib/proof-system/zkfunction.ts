import { Snarky, initializeBindings } from '../../bindings.js';
import { MlFieldArray, MlFieldConstArray } from '../ml/fields.js';
import { withThreadPool } from '../../bindings.js';
import { Provable } from '../provable/provable.js';
import {
  snarkContext,
  gatesFromJson,
  summarizeGates,
  printGates,
} from '../provable/core/provable-context.js';
import { prettifyStacktrace, prettifyStacktracePromise } from '../util/errors.js';
import { ProvableTypePure } from '../provable/types/provable-intf.js';
import { provablePure, InferProvable } from '../provable/types/provable-derivers.js';
import { ConstraintSystemSummary } from '../provable/core/provable-context.js';
import { Tuple, Get } from '../util/types.js';
import { TupleToInstances } from './zkprogram.js';
import { Field } from '../provable/wrapped.js';

// external API
export { ZkFunction, Proof, VerificationKey };

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
  PrivateInputs extends Tuple<ProvableTypePure>
> = PublicInput extends undefined
  ? (...args: TupleToInstances<PrivateInputs>) => void
  : (publicInput: InferProvable<PublicInput>, ...args: TupleToInstances<PrivateInputs>) => void;

type InferMainType<Config extends ZkFunctionConfig> = MainType<
  Get<Config, 'publicInputType'>,
  Config['privateInputTypes']
>;

type ProveMethodType<Config extends ZkFunctionConfig> = Get<
  Config,
  'publicInputType'
> extends undefined
  ? (...args: PrivateInputs<Config>) => Promise<Proof>
  : (publicInput: PublicInput<Config>, ...args: PrivateInputs<Config>) => Promise<Proof>;

function ZkFunction<Config extends ZkFunctionConfig>(
  config: Config & {
    main: InferMainType<Config>;
  }
) {
  const publicInputType = provablePure(config.publicInputType ?? undefined);
  const hasPublicInput = config.publicInputType !== undefined;

  type Keypair = Snarky.Keypair;
  let _keypair: Keypair | undefined;

  return {
    /**
     * Generates and stores a proving key and a verification key for this circuit(ZkFunction).
     *
     * @returns The generated verification key.
     *
     * @example
     * ```ts
     * const { verificationKey } = await zkf.compile();
     * ```
     * @warning Must be called before `prove` or `analyzeMethod`.
     */
    async compile() {
      const main = mainFromCircuitData(config);
      const publicInputSize = publicInputType.sizeInFields();
      const lazyMode = config.lazyMode ?? false;
      await initializeBindings();
      _keypair = await prettifyStacktracePromise(
        withThreadPool(async () => {
          return Snarky.circuit.compile(main, publicInputSize, lazyMode);
        })
      );
      const verificationKey = new VerificationKey(
        Snarky.circuit.keypair.getVerificationKey(_keypair)
      );
      return { verificationKey };
    },

    /**
     * Returns a low-level JSON representation of the constraint system (gates)
     *
     * @throws If compile() has not been called yet.
     *
     * @example
     * ```ts
     * await zkf.compile();
     * const cs = zkf.analyzeMethod();
     * console.log(cs);
     * ```
     */
    analyzeMethod(): Omit<ConstraintSystemSummary, 'digest'> {
      if (!_keypair) throw new Error('Cannot find prover artifacts. Please call compile() first!');
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
     * @returns The generated proof.
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
      if (!_keypair) throw new Error('Cannot find prover artifacts. Please call compile() first!');

      const publicInput = hasPublicInput ? args[0] : undefined;
      const privateInputs = (hasPublicInput ? args.slice(1) : args) as PrivateInputs<Config>;
      const publicInputSize = publicInputType.sizeInFields();
      const publicInputFields = publicInputType.toFields(publicInput);
      const main = mainFromCircuitData(config, privateInputs);
      await initializeBindings();
      return withThreadPool(async () => {
        const proof = Snarky.circuit.prove(
          main,
          publicInputSize,
          MlFieldConstArray.to(publicInputFields),
          _keypair!
        );
        return new Proof(proof, publicInputFields);
      });
    },

    /**
     * Verifies a proof using the verification key of the circuit(ZkFunction).
     *
     * @param proof The proof to verify.
     * @param verificationKey The key to verify against.
     *
     * @returns `true` if the proof is valid, otherwise `false`.
     *
     * @example
     * ```ts
     * const { verificationKey } = await zkf.compile();
     * const proof = await zkf.prove(publicInput, privateInput1, privateInput2);
     * const isValid = await zkf.verify(proof, verificationKey);
     * ```
     */
    async verify(proof: Proof, verificationKey: VerificationKey) {
      return await proof.verify(verificationKey);
    },
  };
}

/**
 * Encapsulates a {@link ZkFunction} proof together with its public input fields.
 *
 * Generated by {@link ZkFunction.prove}, it wraps the raw `Snarky.Proof`
 * and the array of `Field` inputs used for verification.
 *
 * You can call `verify` on a `Proof` to check its validity against a
 * {@link VerificationKey}.
 */
class Proof {
  value: Snarky.Proof;
  publicInputFields: Field[];

  constructor(value: Snarky.Proof, publicInputFields: Field[]) {
    this.value = value;
    this.publicInputFields = publicInputFields;
  }

  /**
   * Verifies this proof using the provided verification key.
   * @param verificationKey The key to verify against.
   * @returns A promise that resolves to `true` if valid, otherwise `false`.
   */
  async verify(verificationKey: VerificationKey) {
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
}

/**
 * A verification key is used to verify a {@link Proof}.
 */
class VerificationKey {
  value: Snarky.VerificationKey;

  constructor(value: Snarky.VerificationKey) {
    this.value = value;
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
