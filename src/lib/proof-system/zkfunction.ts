import { Gate, Snarky, initializeBindings } from '../../bindings.js';
import { MlFieldArray, MlFieldConstArray } from '../ml/fields.js';
import { withThreadPool } from '../../bindings.js';
import { Provable } from '../provable/provable.js';
import { snarkContext, gatesFromJson } from '../provable/core/provable-context.js';
import { prettifyStacktrace, prettifyStacktracePromise } from '../util/errors.js';
import { ProvableTypePure } from '../provable/types/provable-intf.js';
import { provablePure, InferProvable } from '../provable/types/provable-derivers.js';
import { Tuple } from '../util/types.js';
import { TupleToInstances, Undefined } from './zkprogram.js';

// external API
export { ZkFunction, Proof, VerificationKey };

type Get<T, Key extends string> = T extends { [K in Key]: infer _Value } ? _Value : undefined;
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

type VerifyMethodType<Config extends ZkFunctionConfig> = Get<
  Config,
  'publicInputType'
> extends undefined
  ? (proof: Proof, verificationKey: VerificationKey) => Promise<boolean>
  : (
      publicInput: PublicInput<Config>,
      proof: Proof,
      verificationKey: VerificationKey
    ) => Promise<boolean>;

function ZkFunction<Config extends ZkFunctionConfig>(
  config: Config & {
    main: InferMainType<Config>;
  }
): {
  compile: () => Promise<{ verificationKey: VerificationKey }>;
  constraintSystem: () => Promise<Gate[]>;
  prove: ProveMethodType<Config>;
  verify: VerifyMethodType<Config>;
} {
  const publicInputType = provablePure(config.publicInputType ?? Undefined);
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
     * @warning Must be called before `prove` or `verify`.
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
     * const cs = await zkf.constraintSystem();
     * console.log(cs);
     * ```
     */
    async constraintSystem() {
      if (!_keypair) throw new Error('Cannot find Keypair. Please call compile() first!');
      try {
        return gatesFromJson(Snarky.circuit.keypair.getConstraintSystemJSON(_keypair)).gates;
      } catch (error) {
        throw prettifyStacktrace(error);
      }
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
     * const { verificationKey } = await zkf.compile();
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
          _keypair!
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
      let verificationKey: VerificationKey;
      if (hasPublicInput) {
        publicInput = args[0] as PublicInput<Config>;
        proof = args[1] as Proof;
        verificationKey = args[2] as VerificationKey;
      } else {
        publicInput = Undefined.empty() as PublicInput<Config>;
        proof = args[0] as Proof;
        verificationKey = args[1] as VerificationKey;
      }

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
