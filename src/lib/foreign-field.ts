import { Snarky } from '../snarky.js';
import { mod } from '../bindings/crypto/finite_field.js';
import { Tuple } from '../bindings/lib/binable.js';
import { FieldConst, FieldVar } from './field.js';

// external API
export { createForeignField, ForeignField };

// internal API
export { MlForeignFieldVar, MlForeignFieldConst };

const limbBits = 88n;

type MlForeignField<F> = [_: 0, x0: F, x1: F, x2: F];
type MlForeignFieldVar = MlForeignField<FieldVar>;
type MlForeignFieldConst = MlForeignField<FieldConst>;
type ForeignField = InstanceType<ReturnType<typeof createForeignField>>;

function createForeignField(modulus: bigint, { unsafe = false } = {}) {
  const p = modulus;
  const pMl = MlForeignFieldConst.fromBigint(p);

  // TODO check that p has valid size
  if (p <= 0) {
    throw Error(`ForeignField: expected modulus to be positive, got ${p}`);
  }

  return class ForeignField {
    static modulus = p;
    value: MlForeignFieldVar;

    constructor(
      x: ForeignField | MlForeignFieldVar | bigint | number | string
    ) {
      if (x instanceof ForeignField) {
        this.value = x.value;
        return;
      }
      // ForeignFieldVar
      if (Array.isArray(x)) {
        this.value = x;
        return;
      }
      // constant
      let x0 = mod(BigInt(x), p);
      this.value = MlForeignFieldVar.fromBigint(x0);
    }

    isConstant() {
      let [, ...limbs] = this.value;
      return limbs.every(FieldVar.isConstant);
    }

    toBigInt() {
      return MlForeignFieldVar.toBigint(this.value);
    }

    // Provable<ForeignField>

    static check(x: ForeignField) {
      // if the `unsafe` flag is set, we don't add any constraints when creating a new variable
      // this means a user has to take care of proper constraining themselves
      if (x.isConstant() || unsafe) return;
      Snarky.foreignField.assertValidElement(x.value, pMl);
    }
  };
}

// helpers

let limbMax = (1n << limbBits) - 1n;

const MlForeignFieldConst = {
  fromBigint(x: bigint): MlForeignFieldConst {
    let limbs = mapTuple(to3Limbs(x), FieldConst.fromBigint);
    return [0, ...limbs];
  },
  toBigint([, ...limbs]: MlForeignFieldConst): bigint {
    return from3Limbs(mapTuple(limbs, FieldConst.toBigint));
  },
};

const MlForeignFieldVar = {
  fromBigint(x: bigint): MlForeignFieldVar {
    let limbs = mapTuple(to3Limbs(x), FieldVar.constant);
    return [0, ...limbs];
  },
  toBigint([, ...limbs]: MlForeignFieldVar): bigint {
    return from3Limbs(mapTuple(limbs, FieldVar.toBigint));
  },
};

function to3Limbs(x: bigint): [bigint, bigint, bigint] {
  let l0 = x & limbMax;
  x >>= limbBits;
  let l1 = x & limbMax;
  let l2 = x >> limbBits;
  return [l0, l1, l2];
}

function from3Limbs(limbs: [bigint, bigint, bigint]): bigint {
  let [l0, l1, l2] = limbs;
  return l0 + ((l1 + (l2 << limbBits)) << limbBits);
}

function mapTuple<A, B, T extends Tuple<A>>(
  tuple: T,
  f: (a: A) => B
): { [i in keyof T]: B } {
  return tuple.map(f) as any;
}
