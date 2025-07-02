import { Snarky, initializeBindings, withThreadPool } from '../../bindings.js';
import { MlFieldArray, MlFieldConstArray } from '../ml/fields.js';
import {  } from '../../bindings.js';
import { Provable } from '../provable/provable.js';
import { snarkContext, gatesFromJson } from '../provable/core/provable-context.js';
import { prettifyStacktrace, prettifyStacktracePromise } from '../util/errors.js';
import { ProvableTypePure } from '../provable/types/provable-intf.js';
import { provablePure, InferProvable } from '../provable/types/provable-derivers.js';
import { Tuple } from '../util/types.js';
import { TupleToInstances } from './zkprogram.js';

// external API
export { ZkFunction, Keypair, Proof, VerificationKey };

type PublicInput<Config extends ZkFunctionConfig> = InferProvable<Config['publicInputType']>;
type PrivateInputs<Config extends ZkFunctionConfig> = TupleToInstances<Config['privateInputTypes']>;

type ZkFunctionConfig = {
  name: string;
  publicInputType: ProvableTypePure;
  privateInputTypes: Tuple<ProvableTypePure>;
};

function ZkFunction<Config extends ZkFunctionConfig>(
  config: Config & {
    main: (publicInput: PublicInput<Config>, ...args: PrivateInputs<Config>) => void;
    numChunks?: number;
  }
) {
  const publicInputType = provablePure(config.publicInputType);
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
          let keypair = Snarky.circuit.compile(main, publicInputSize, config.numChunks ?? 1);
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
    async prove(publicInput: PublicInput<Config>, ...privateInputs: PrivateInputs<Config>) {
      if (!_keypair) throw new Error('Cannot find Keypair. Please call compile() first!');
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
    async verify(
      publicInput: PublicInput<Config>,
      proof: Proof,
      verificationKey?: VerificationKey
    ) {
      verificationKey = verificationKey ?? _keypair!.verificationKey();
      if (!_keypair) throw new Error('Cannot find VerificationKey. Please call compile() first!');
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
  config: Config & {
    main: (publicInput: PublicInput<Config>, ...args: PrivateInputs<Config>) => void;
  },
  privateInputs?: PrivateInputs<Config>
): Snarky.Main {
  return function main(publicInputFields: MlFieldArray) {
    let id = snarkContext.enter({ inCheckedComputation: true });

    try {
      const publicInput = provablePure(config.publicInputType).fromFields(
        MlFieldArray.from(publicInputFields)
      );
      const privateInputs_ = config.privateInputTypes.map((typ, i) =>
        Provable.witness(typ, () => (privateInputs ? privateInputs[i] : undefined))
      ) as PrivateInputs<Config>;
      config.main(publicInput, ...privateInputs_);
    } finally {
      snarkContext.leave(id);
    }
  };
}
