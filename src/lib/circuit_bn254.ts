import 'reflect-metadata';
import { ProvableBn254, Snarky } from '../snarky.js';
import { MlFieldArray, MlFieldConstArray } from './ml/fields.js';
import { withThreadPool } from '../bindings/js/wrapper.js';
import { Provable } from './provable.js';
import { snarkContext, gatesFromJson } from './provable-context.js';
import { prettifyStacktrace, prettifyStacktracePromise } from './errors.js';
import { Proof, VerificationKey } from './circuit.js';

// external API
export { circuitMainBn254, CircuitBn254, KeypairBn254 };

class CircuitBn254 {
  // circuit-writing interface

  static _main: CircuitData<any, any>;

  /**
   * Generates a proving key and a verification key for this circuit.
   * Uses Bn254 Fields.
   * @example
   * ```ts
   * const keypair = await MyCircuit.generateKeypairBn254();
   * ```
   */
  static generateKeypair() {
    let main = mainFromCircuitData(this._main);
    let publicInputSize = this._main.publicInputType.sizeInFields();
    return prettifyStacktracePromise(
      withThreadPool(async () => {
        let keypair = Snarky.circuitBn254.compile(main, publicInputSize);
        return new KeypairBn254(keypair);
      })
    );
  }

  /**
   * Proves a statement using the private input, public input, and the {@link Keypair} of the circuit.
   * Uses Bn254 fields.
   * @example
   * ```ts
   * const keypair = await MyCircuit.generateKeypairBn254();
   * const proof = await MyCircuit.proveBn254(privateInput, publicInput, keypair);
   * ```
   */
  static prove(privateInput: any[], publicInput: any[], keypair: KeypairBn254) {
    let main = mainFromCircuitData(this._main, privateInput);
    let publicInputSize = this._main.publicInputType.sizeInFields();
    let publicInputFields = this._main.publicInputType.toFields(publicInput);
    return prettifyStacktracePromise(
      withThreadPool(async () => {
        let proof = Snarky.circuitBn254.prove(
          main,
          publicInputSize,
          MlFieldConstArray.toBn254(publicInputFields),
          keypair.value
        );
        return new Proof(proof);
      })
    );
  }
}

class KeypairBn254 {
  value: Snarky.KeypairBn254;

  constructor(value: Snarky.KeypairBn254) {
    this.value = value;
  }

  verificationKey() {
    return new VerificationKey(
      Snarky.circuitBn254.keypair.getVerificationKey(this.value)
    );
  }

  /**
   * Returns a low-level JSON representation of the {@link Circuit} from its {@link Keypair}:
   * a list of gates, each of which represents a row in a table, with certain coefficients and wires to other (row, column) pairs
   * @example
   * ```ts
   * const keypair = await MyCircuit.generateKeypairBn254();
   * const gates = keypair.constraintSystem();
   * ```
   */
  constraintSystem() {
    try {
      return gatesFromJson(
        Snarky.circuitBn254.keypair.getConstraintSystemJSON(this.value)
      ).gates;
    } catch (error) {
      throw prettifyStacktrace(error);
    }
  }
}

type CircuitData<P, W> = {
  main(publicInput: P, privateInput: W): void;
  publicInputType: ProvableBn254<P>;
  privateInputType: ProvableBn254<W>;
};

function mainFromCircuitData<P, W>(
  data: CircuitData<P, W>,
  privateInput?: W
): Snarky.Main {
  return function main(publicInputFields: MlFieldArray) {
    let id = snarkContext.enter({ inCheckedComputation: true });
    try {
      let publicInput = data.publicInputType.fromFields(
        MlFieldArray.fromBn254(publicInputFields)
      );
      let privateInput_ = Provable.witnessBn254(
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
      Array.from(publicIndexSet).sort().map((i) => paramTypes[i])
    ),
    privateInputType: provableFromTuple(
      Array.from(witnessIndexSet).sort().map((i) => paramTypes[i])
    ),
  };
}

// TODO support auxiliary data
function provableFromTuple(typs: ProvableBn254<any>[]): ProvableBn254<any> {
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
