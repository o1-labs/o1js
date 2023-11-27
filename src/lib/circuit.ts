import { ProvablePure, Snarky } from '../snarky.js';
import { MlFieldArray, MlFieldConstArray } from './ml/fields.js';
import { withThreadPool } from '../bindings/js/wrapper.js';
import { Provable } from './provable.js';
import { snarkContext, gatesFromJson } from './provable-context.js';
import { prettifyStacktrace, prettifyStacktracePromise } from './errors.js';

// external API
export { public_, circuitMain, Circuit, Keypair, Proof, VerificationKey };

class Circuit {
  // circuit-writing interface

  static _main: CircuitData<any, any>;

  /**
   * Generates a proving key and a verification key for this circuit.
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
        let keypair = Snarky.circuit.compile(main, publicInputSize);
        return new Keypair(keypair);
      })
    );
  }

  /**
   * Proves a statement using the private input, public input, and the {@link Keypair} of the circuit.
   * @example
   * ```ts
   * const keypair = await MyCircuit.generateKeypair();
   * const proof = await MyCircuit.prove(privateInput, publicInput, keypair);
   * ```
   */
  static prove(privateInput: any[], publicInput: any[], keypair: Keypair) {
    let main = mainFromCircuitData(this._main, privateInput);
    let publicInputSize = this._main.publicInputType.sizeInFields();
    let publicInputFields = this._main.publicInputType.toFields(publicInput);
    return prettifyStacktracePromise(
      withThreadPool(async () => {
        let proof = Snarky.circuit.prove(
          main,
          publicInputSize,
          MlFieldConstArray.to(publicInputFields),
          keypair.value
        );
        return new Proof(proof);
      })
    );
  }

  /**
   * Verifies a proof using the public input, the proof, and the initial {@link Keypair} of the circuit.
   * @example
   * ```ts
   * const keypair = await MyCircuit.generateKeypair();
   * const proof = await MyCircuit.prove(privateInput, publicInput, keypair);
   * const isValid = await MyCircuit.verify(publicInput, keypair.vk, proof);
   * ```
   */
  static verify(
    publicInput: any[],
    verificationKey: VerificationKey,
    proof: Proof
  ) {
    let publicInputFields = this._main.publicInputType.toFields(publicInput);
    return prettifyStacktracePromise(
      withThreadPool(async () =>
        Snarky.circuit.verify(
          MlFieldConstArray.to(publicInputFields),
          proof.value,
          verificationKey.value
        )
      )
    );
  }

  // utility namespace, moved to `Provable`

  /**
   * @deprecated use {@link Provable.witness}
   */
  static witness = Provable.witness;
  /**
   * @deprecated use {@link Provable.asProver}
   */
  static asProver = Provable.asProver;
  /**
   * @deprecated use {@link Provable.runAndCheck}
   */
  static runAndCheck = Provable.runAndCheck;
  /**
   * @deprecated use {@link Provable.runUnchecked}
   */
  static runUnchecked = Provable.runUnchecked;
  /**
   * @deprecated use {@link Provable.constraintSystem}
   */
  static constraintSystem = Provable.constraintSystem;
  /**
   * @deprecated use {@link Provable.Array}
   */
  static array = Provable.Array;
  /**
   * @deprecated use {@link Provable.assertEqual}
   */
  static assertEqual = Provable.assertEqual;
  /**
   * @deprecated use {@link Provable.equal}
   */
  static equal = Provable.equal;
  /**
   * @deprecated use {@link Provable.if}
   */
  static if = Provable.if;
  /**
   * @deprecated use {@link Provable.switch}
   */
  static switch = Provable.switch;
  /**
   * @deprecated use {@link Provable.inProver}
   */
  static inProver = Provable.inProver;
  /**
   * @deprecated use {@link Provable.inCheckedComputation}
   */
  static inCheckedComputation = Provable.inCheckedComputation;
  /**
   * @deprecated use {@link Provable.log}
   */
  static log = Provable.log;
}

class Keypair {
  value: Snarky.Keypair;

  constructor(value: Snarky.Keypair) {
    this.value = value;
  }

  verificationKey() {
    return new VerificationKey(
      Snarky.circuit.keypair.getVerificationKey(this.value)
    );
  }

  /**
   * Returns a low-level JSON representation of the {@link Circuit} from its {@link Keypair}:
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
        Snarky.circuit.keypair.getConstraintSystemJSON(this.value)
      ).gates;
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

function public_(target: any, _key: string | symbol, index: number) {
  // const fieldType = Reflect.getMetadata('design:paramtypes', target, key);

  if (target._public === undefined) {
    target._public = [];
  }
  target._public.push(index);
}

type CircuitData<P, W> = {
  main(publicInput: P, privateInput: W): void;
  publicInputType: ProvablePure<P, any>;
  privateInputType: ProvablePure<W, any>;
};

function mainFromCircuitData<P, W>(
  data: CircuitData<P, W>,
  privateInput?: W
): Snarky.Main {
  return function main(publicInputFields: MlFieldArray) {
    let id = snarkContext.enter({ inCheckedComputation: true });
    try {
      let publicInput = data.publicInputType.fromFields(
        MlFieldArray.from(publicInputFields)
      );
      let privateInput_ = Provable.witness(
        data.privateInputType,
        () => privateInput as W
      );
      data.main(publicInput, privateInput_);
    } finally {
      snarkContext.leave(id);
    }
  };
}

function circuitMain(
  target: typeof Circuit,
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
function provableFromTuple(
  typs: ProvablePure<any, any>[]
): ProvablePure<any, any> {
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

    toValue(x) {
      return typs.map((typ, i) => typ.toValue(x[i]));
    },

    fromValue(x) {
      return typs.map((typ, i) => typ.fromValue(x[i]));
    },
  };
}
