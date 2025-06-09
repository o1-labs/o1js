import { Snarky, initializeBindings } from '../../snarky.js';
import { MlFieldArray, MlFieldConstArray } from '../ml/fields.js';
import { withThreadPool } from '../../snarky.js';
import { Provable } from '../provable/provable.js';
import { snarkContext, gatesFromJson } from '../provable/core/provable-context.js';
import { prettifyStacktrace, prettifyStacktracePromise } from '../util/errors.js';
import { ProvableTypePure } from '../provable/types/provable-intf.js';
import { provablePure } from '../provable/types/provable-derivers.js';

// external API
export { ZkFunction, Keypair, Proof, VerificationKey };

type ZkFunctionConfig<P, W extends any[]> = {
  name: string;
  publicInputType: ProvableTypePure<P>;
  privateInputTypes: { [K in keyof W]: ProvableTypePure<W[K]> };
  main: (publicInput: P, ...privateInputs: W) => void;
};

function ZkFunction<P, W extends any[]>(config: ZkFunctionConfig<P, W>) {
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
     * const verificationKey = await zkf.generateKeypair();
     * ```
     * @warning Must be called before `prove` or `verify`.
     */
    async generateKeypair() {
      const main = mainFromCircuitData(config);
      const publicInputSize = publicInputType.sizeInFields();
      await initializeBindings();
      _keypair = await prettifyStacktracePromise(
        withThreadPool(async () => {
          let keypair = Snarky.circuit.compile(main, publicInputSize);
          return new Keypair(keypair);
        })
      );
      return _keypair.verificationKey();
    },

    /**
     * Proves a statement using the public input and private inputs of the circuit(ZkFunction).
     *
     * @param privateInputs The private inputs to the circuit.
     * @param publicInput The public input to the circuit.
     * @returns The generated proof.
     *
     * @throws If `generateKeypair` has not been called.
     *
     * @example
     * ```ts
     * await zkf.generateKeypair();
     * const proof = await zkf.prove([privateInput], publicInput);
     * ```
     */
    async prove(privateInputs: W, publicInput: P) {
      if (!_keypair) throw new Error('Cannot find Keypair. Please call generateKeypair() first!');
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
     * @throws If `generateKeypair` has not been called.
     *
     * @example
     * ```ts
     * const verificationKey = await zkf.generateKeypair();
     * const proof = await zkf.prove([privateInput], publicInput);
     * const isValid = await zkf.verify(publicInput, proof, verificationKey);
     * ```
     */
    async verify(publicInput: P, proof: Proof, verificationKey?: VerificationKey) {
      verificationKey = verificationKey ?? _keypair!.verificationKey();
      if (!_keypair)
        throw new Error('Cannot find verificationKey. Please call generateKeypair() first!');
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
   * const keypair = await zkf.generateKeypair();
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

function mainFromCircuitData<P, W extends any[]>(
  config: ZkFunctionConfig<P, W>,
  privateInputs?: W
): Snarky.Main {
  return function main(publicInputFields: MlFieldArray) {
    let id = snarkContext.enter({ inCheckedComputation: true });

    try {
      const publicInput = provablePure(config.publicInputType).fromFields(
        MlFieldArray.from(publicInputFields)
      );
      const privateInputs_ = config.privateInputTypes.map((typ, i) =>
        Provable.witness(typ, () => (privateInputs ? privateInputs[i] : undefined))
      ) as W;
      config.main(publicInput, ...privateInputs_);
    } finally {
      snarkContext.leave(id);
    }
  };
}
