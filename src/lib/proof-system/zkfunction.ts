import { Snarky, initializeBindings } from '../../snarky.js';
import { MlFieldArray, MlFieldConstArray } from '../ml/fields.js';
import { withThreadPool } from '../../snarky.js';
import { Provable } from '../provable/provable.js';
import { snarkContext, gatesFromJson } from '../provable/core/provable-context.js';
import { prettifyStacktrace, prettifyStacktracePromise } from '../util/errors.js';
import { ProvableTypePure } from '../provable/types/provable-intf.js';
import { provablePure, InferProvable } from '../provable/types/provable-derivers.js';
import { Tuple } from '../util/types.js';
import { TupleToInstances, Undefined } from './zkprogram.js';

// external API
export { ZkFunction, Keypair, Proof, VerificationKey };

type Get<T, Key extends string> = T extends { [K in Key]: infer _Value } ? _Value : undefined;
type PublicInput<Config extends ZkFunctionConfig> = InferProvable<Get<Config, 'publicInputType'>>;
type PrivateInputs<Config extends ZkFunctionConfig> = TupleToInstances<Config['privateInputTypes']>;

type ZkFunctionConfig = {
  name: string;
  publicInputType?: ProvableTypePure;
  privateInputTypes: Tuple<ProvableTypePure>;
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

type VerifyMethodType<Config extends ZkFunctionConfig> = Get<
  Config,
  'publicInputType'
> extends undefined
  ? (proof: Proof, verificationKey?: VerificationKey) => Promise<boolean>
  : (
      publicInput: PublicInput<Config>,
      proof: Proof,
      verificationKey?: VerificationKey
    ) => Promise<boolean>;

function ZkFunction<Config extends ZkFunctionConfig>(
  config: Config & {
    main: InferMainType<Config>;
  }
): {
  compile: () => Promise<{ verificationKey: VerificationKey }>;
  prove: ProveMethodType<Config>;
  verify: VerifyMethodType<Config>;
} {
  const publicInputType = provablePure(config.publicInputType ?? Undefined);
  const hasPublicInput = config.publicInputType !== undefined;
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
     * @warning Must be called before `prove` or `verify`.
     */
    async compile() {
      const main = mainFromCircuitData(config);
      const publicInputSize = publicInputType.sizeInFields();
      await initializeBindings();
      _keypair = await prettifyStacktracePromise(
        withThreadPool(async () => {
          let keypair = Snarky.circuit.compile(main, publicInputSize);
          return new Keypair(keypair);
        })
      );
      return { verificationKey: _keypair.verificationKey() };
    },

    /**
     * Proves a statement using the public input and private inputs of the circuit(ZkFunction).
     *
     * @param privateInputs The private inputs to the circuit.
     * @param publicInput The public input to the circuit.
     * @returns The generated proof.
     *
     * @throws If `compile` has not been called.
     *
     * @example
     * ```ts
     * await zkf.compile();
     * const proof = await zkf.prove(publicInput, privateInput1, privateInput2);
     * ```
     */
    async prove(...args: any[]) {
      if (!_keypair) throw new Error('Cannot find Keypair. Please call compile() first!');

      const publicInput = hasPublicInput ? args[0] : Undefined.empty();
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
          _keypair!.value
        );
        return new Proof(proof);
      });
    },

    /**
     * Verifies a proof using the public input, the proof, and optionally a verification key of the circuit(ZkFunction).
     *
     * @param publicInput The public input to the circuit.
     * @param proof The proof to verify.
     * @returns `true` if the proof is valid, otherwise `false`.
     *
     * @throws If `compile` has not been called.
     *
     * @example
     * ```ts
     * const { verificationKey } = await zkf.compile();
     * const proof = await zkf.prove(publicInput, privateInput1, privateInput2);
     * const isValid = await zkf.verify(publicInput, proof, verificationKey);
     * ```
     */
    async verify(...args: any[]) {
      if (!_keypair) throw new Error('Cannot find VerificationKey. Please call compile() first!');

      let publicInput: PublicInput<Config>;
      let proof: Proof;
      let verificationKey: VerificationKey | undefined;
      if (hasPublicInput) {
        publicInput = args[0] as PublicInput<Config>;
        proof = args[1] as Proof;
        verificationKey = args[2] as VerificationKey | undefined;
      } else {
        publicInput = Undefined.empty() as PublicInput<Config>;
        proof = args[0] as Proof;
        verificationKey = args[1] as VerificationKey | undefined;
      }
      verificationKey = verificationKey ?? _keypair!.verificationKey();

      const publicInputFields = publicInputType.toFields(publicInput);
      await initializeBindings();
      return prettifyStacktracePromise(
        withThreadPool(async () =>
          Snarky.circuit.verify(
            MlFieldConstArray.to(publicInputFields),
            proof.value,
            verificationKey.value
          )
        )
      );
    },
  };
}

class Keypair {
  value: Snarky.Keypair;

  constructor(value: Snarky.Keypair) {
    this.value = value;
  }

  verificationKey() {
    return new VerificationKey(Snarky.circuit.keypair.getVerificationKey(this.value));
  }

  /**
   * Returns a low-level JSON representation of the {@link ZkFunction} from its {@link Keypair}:
   * a list of gates, each of which represents a row in a table, with certain coefficients and wires to other (row, column) pairs
   * @example
   * ```ts
   * const keypair = await zkf.compile();
   * const json = MyProvable.witnessFromKeypair(keypair);
   * ```
   */
  constraintSystem() {
    try {
      return gatesFromJson(Snarky.circuit.keypair.getConstraintSystemJSON(this.value)).gates;
    } catch (error) {
      throw prettifyStacktrace(error);
    }
  }
}

/**
 * Proofs can be verified using a {@link VerificationKey} and the public input.
 */
class Proof {
  value: Snarky.Proof;

  constructor(value: Snarky.Proof) {
    this.value = value;
  }
}

/**
 * Part of the circuit {@link Keypair}. A verification key can be used to verify a {@link Proof} when you provide the correct public input.
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
      const publicInput = provablePure(config.publicInputType ?? Undefined).fromFields(
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
