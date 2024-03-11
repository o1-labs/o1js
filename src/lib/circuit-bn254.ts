import 'reflect-metadata';
import { ProvablePureBn254, Snarky } from '../snarky.js';
import { MlFieldArray, MlFieldConstArray } from './ml/fields.js';
import { withThreadPool } from '../bindings/js/wrapper.js';
import { ProvableBn254 } from './provable-bn254.js';
import { snarkContext, gatesFromJson } from './provable-context.js';
import { prettifyStacktrace, prettifyStacktracePromise } from './errors.js';

// external API
export { publicBn254, circuitMainBn254, CircuitBn254, KeypairBn254, ProofBn254, VerificationKeyBn254 };

class CircuitBn254 {
  // circuit-writing interface

  static _main: CircuitData<any, any>;

  /**
   * Generates a proving key and a verification key for this circuit.
   * Uses Pasta fields.
   * @example
   * ```ts
   * const keypair = await MyCircuit.generateKeypair();
   * ```
   */
  static generateKeypair() {
    let main = mainFromCircuitData(this._main);
    let publicInputSize = this._main.publicInputType.sizeInFields();
    return prettifyStacktracePromise(
      withThreadPool(async () => {
        let keypair = Snarky.bn254.circuit.compile(main, publicInputSize);
        return new KeypairBn254(keypair);
      })
    );
  }


  /**
   * Proves a statement using the private input, public input, and the {@link KeypairBn254} of the circuit.
   * Uses Pasta fields.
   * @example
   * ```ts
   * const keypair = await MyCircuit.generateKeypair();
   * const proof = await MyCircuit.prove(privateInput, publicInput, keypair);
   * ```
   */
  static prove(privateInput: any[], publicInput: any[], keypair: KeypairBn254) {
    let main = mainFromCircuitData(this._main, privateInput);
    let publicInputSize = this._main.publicInputType.sizeInFields();
    let publicInputFields = this._main.publicInputType.toFields(publicInput);
    return prettifyStacktracePromise(
      withThreadPool(async () => {
        let proof = Snarky.bn254.circuit.prove(
          main,
          publicInputSize,
          MlFieldConstArray.to(publicInputFields),
          keypair.value
        );
        return new ProofBn254(proof);
      })
    );
  }

  /**
   * Verifies a proof using the public input, the proof, and the initial {@link KeypairBn254} of the circuit.
   * @example
   * ```ts
   * const keypair = await MyCircuit.generateKeypair();
   * const proof = await MyCircuit.prove(privateInput, publicInput, keypair);
   * const isValid = await MyCircuit.verify(publicInput, keypair.vk, proof);
   * ```
   */
  static verify(
    publicInput: any[],
    verificationKey: VerificationKeyBn254,
    proof: ProofBn254
  ) {
    let publicInputFields = this._main.publicInputType.toFields(publicInput);
    return prettifyStacktracePromise(
      withThreadPool(async () =>
        Snarky.bn254.circuit.verify(
          MlFieldConstArray.to(publicInputFields),
          proof.value,
          verificationKey.value
        )
      )
    );
  }

  // utility namespace, moved to `ProvableBn254`

  /**
   * @deprecated use {@link ProvableBn254.witness}
   */
  static witness = ProvableBn254.witness;
  /**
   * @deprecated use {@link ProvableBn254.asProver}
   */
  static asProver = ProvableBn254.asProver;
  /**
   * @deprecated use {@link ProvableBn254.runAndCheck}
   */
  static runAndCheck = ProvableBn254.runAndCheck;
  /**
   * @deprecated use {@link ProvableBn254.runUnchecked}
   */
  static runUnchecked = ProvableBn254.runUnchecked;
  /**
   * @deprecated use {@link ProvableBn254.constraintSystem}
   */
  static constraintSystem = ProvableBn254.constraintSystem;
  /**
   * @deprecated use {@link ProvableBn254.Array}
   */
  static array = ProvableBn254.Array;
  /**
   * @deprecated use {@link ProvableBn254.assertEqual}
   */
  static assertEqual = ProvableBn254.assertEqual;
  /**
   * @deprecated use {@link ProvableBn254.equal}
   */
  static equal = ProvableBn254.equal;
  /**
   * @deprecated use {@link ProvableBn254.if}
   */
  static if = ProvableBn254.if;
  /**
   * @deprecated use {@link ProvableBn254.switch}
   */
  static switch = ProvableBn254.switch;
  /**
   * @deprecated use {@link ProvableBn254.inProver}
   */
  static inProver = ProvableBn254.inProver;
  /**
   * @deprecated use {@link ProvableBn254.inCheckedComputation}
   */
  static inCheckedComputation = ProvableBn254.inCheckedComputation;
  /**
   * @deprecated use {@link ProvableBn254.log}
   */
  static log = ProvableBn254.log;
}

class KeypairBn254 {
  value: Snarky.Bn254.Keypair;

  constructor(value: Snarky.Bn254.Keypair) {
    this.value = value;
  }

  verificationKey() {
    return new VerificationKeyBn254(
      Snarky.bn254.circuit.keypair.getVerificationKey(this.value)
    );
  }

  /**
   * Returns a low-level JSON representation of the {@link CircuitBn254} from its {@link KeypairBn254}:
   * a list of gates, each of which represents a row in a table, with certain coefficients and wires to other (row, column) pairs
   * @example
   * ```ts
   * const keypair = await MyCircuit.generateKeypair();
   * const json = MyProvable.witnessFromKeypair(keypair);
   * ```
   */
  constraintSystem() {
    try {
      return gatesFromJson(
        Snarky.bn254.circuit.keypair.getConstraintSystemJSON(this.value)
      ).gates;
    } catch (error) {
      throw prettifyStacktrace(error);
    }
  }
}

/**
 * Proofs can be verified using a {@link VerificationKeyBn254} and the public input.
 */
class ProofBn254 {
  value: Snarky.Bn254.Proof;

  constructor(value: Snarky.Bn254.Proof) {
    this.value = value;
  }
}

/**
 * Part of the circuit {@link KeypairBn254}. A verification key can be used to verify a {@link ProofBn254} when you provide the correct public input.
 */
class VerificationKeyBn254 {
  value: Snarky.Bn254.VerificationKey;

  constructor(value: Snarky.Bn254.VerificationKey) {
    this.value = value;
  }
}

function publicBn254(target: any, _key: string | symbol, index: number) {
  // const fieldType = Reflect.getMetadata('design:paramtypes', target, key);

  if (target._public === undefined) {
    target._public = [];
  }
  target._public.push(index);
}

type CircuitData<P, W> = {
  main(publicInput: P, privateInput: W): void;
  publicInputType: ProvablePureBn254<P>;
  privateInputType: ProvablePureBn254<W>;
};

function mainFromCircuitData<P, W>(
  data: CircuitData<P, W>,
  privateInput?: W
): Snarky.Bn254.Main {
  return function main(publicInputFields: MlFieldArray) {
    let id = snarkContext.enter({ inCheckedComputation: true });
    try {
      let publicInput = data.publicInputType.fromFields(
        MlFieldArray.from(publicInputFields)
      );
      let privateInput_ = ProvableBn254.witness(
        data.privateInputType,
        () => privateInput as W
      );
      data.main(publicInput, privateInput_);
    } finally {
      snarkContext.leave(id);
    }
  };
}

function circuitMainBn254(
  target: typeof CircuitBn254,
  propertyName: string,
  _descriptor?: PropertyDescriptor
): any {
  const paramTypes = Reflect.getMetadata(
    'design:paramtypes',
    target,
    propertyName
  );
  const numArgs = paramTypes.length;

  const publicIndexSet: Set<number> = new Set((target as any)._public);
  const witnessIndexSet: Set<number> = new Set();
  for (let i = 0; i < numArgs; ++i) {
    if (!publicIndexSet.has(i)) witnessIndexSet.add(i);
  }

  target._main = {
    main(publicInput: any[], privateInput: any[]) {
      let args = [];
      for (let i = 0; i < numArgs; ++i) {
        let nextInput = publicIndexSet.has(i) ? publicInput : privateInput;
        args.push(nextInput.shift());
      }
      return (target as any)[propertyName].apply(target, args);
    },
    publicInputType: provableFromTuple(
      Array.from(publicIndexSet).map((i) => paramTypes[i])
    ),
    privateInputType: provableFromTuple(
      Array.from(witnessIndexSet).map((i) => paramTypes[i])
    ),
  };
}

// TODO support auxiliary data
function provableFromTuple(typs: ProvablePureBn254<any>[]): ProvablePureBn254<any> {
  return {
    sizeInFields: () => {
      return typs.reduce((acc, typ) => acc + typ.sizeInFields(), 0);
    },

    toFields: (t: Array<any>) => {
      if (t.length !== typs.length) {
        throw new Error(`typOfArray: Expected ${typs.length}, got ${t.length}`);
      }
      let res = [];
      for (let i = 0; i < t.length; ++i) {
        res.push(...typs[i].toFields(t[i]));
      }
      return res;
    },

    toAuxiliary() {
      return [];
    },

    fromFields: (xs: Array<any>) => {
      let offset = 0;
      let res: Array<any> = [];
      typs.forEach((typ) => {
        const n = typ.sizeInFields();
        res.push(typ.fromFields(xs.slice(offset, offset + n)));
        offset += n;
      });
      return res;
    },

    check(xs: Array<any>) {
      typs.forEach((typ, i) => (typ as any).check(xs[i]));
    },
  };
}
