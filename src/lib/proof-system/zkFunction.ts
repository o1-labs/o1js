import { Snarky, initializeBindings } from '../../snarky.js';
import { MlFieldArray, MlFieldConstArray } from '../ml/fields.js';
import { withThreadPool } from '../../snarky.js';
import { Provable } from '../provable/provable.js';
import { snarkContext, gatesFromJson } from '../provable/core/provable-context.js';
import { prettifyStacktrace, prettifyStacktracePromise } from '../util/errors.js';
import { ProvablePure } from '../provable/types/provable-intf.js';

// external API
export { ZkFunction, Keypair, Proof, VerificationKey };

type ZkFunctionConfig<P, W extends any[]> = {
  name: string;
  publicInputType: ProvablePure<P>;
  privateInputTypes: { [K in keyof W]: ProvablePure<W[K]> };
  main: (publicInput: P, ...privateInputs: W) => void;
};

function ZkFunction<P, W extends any[]>(config: ZkFunctionConfig<P, W>) {
  const { publicInputType } = config;
  return {
    /**
     * Generates a proving key and a verification key for this circuit(ZkFunction).
     * @example
     * ```ts
     * const keypair = await zkf.generateKeypair();
     * ```
     */
    async generateKeypair() {
      const main = mainFromCircuitData(config);
      const publicInputSize = config.publicInputType.sizeInFields();
      await initializeBindings();
      return prettifyStacktracePromise(
        withThreadPool(async () => {
          let keypair = Snarky.circuit.compile(main, publicInputSize);
          return new Keypair(keypair);
        })
      );
    },

    /**
     * Proves a statement using the public input, private input, and the {@link Keypair} of the circuit(ZkFunction).
     * @example
     * ```ts
     * const keypair = await zkf.generateKeypair();
     * const proof = await zkf.prove([privateInput], publicInput, keypair);
     * ```
     */
    async prove(privateInputs: W, publicInput: P, keypair: Keypair) {
      const publicInputSize = publicInputType.sizeInFields();
      const publicInputFields = config.publicInputType.toFields(publicInput);
      const main = mainFromCircuitData(config, privateInputs);
      await initializeBindings();
      return withThreadPool(async () => {
        const proof = Snarky.circuit.prove(
          main,
          publicInputSize,
          MlFieldConstArray.to(publicInputFields),
          keypair.value
        );
        return new Proof(proof);
      });
    },

    /**
     * Verifies a proof using the public input, the proof, and the initial {@link Keypair} of the circuit(ZkFunction).
     * @example
     * ```ts
     * const keypair = await zkf.generateKeypair();
     * const proof = await zkf.prove([privateInput], publicInput, keypair);
     * const isValid = await zkf.verify(publicInput, keypair.verificationKey(), proof);
     * ```
     */
    async verify(publicInput: P, verificationKey: VerificationKey, proof: Proof) {
      const publicInputFields = config.publicInputType.toFields(publicInput);
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
      const publicInput = config.publicInputType.fromFields(MlFieldArray.from(publicInputFields));
      const privateInputs_ = config.privateInputTypes.map((typ, i) =>
        Provable.witness(typ, () => (privateInputs ? privateInputs[i] : undefined))
      ) as W;
      config.main(publicInput, ...privateInputs_);
    } finally {
      snarkContext.leave(id);
    }
  };
}
