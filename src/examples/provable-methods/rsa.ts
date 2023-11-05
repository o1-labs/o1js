/**
 * RSA signature verification with o1js
 */
import { Field, Gadgets, Provable, Struct, provable } from 'o1js';

const mask = (1n << 116n) - 1n;

/**
 * We use 116-bit limbs, which means 18 limbs for a 2048-bit numbers as used in RSA.
 */
const Field18 = Provable.Array(Field, 18);

class Bigint2048 extends Struct({ values: Field18 }) {
  toBigInt() {
    let result = 0n;
    let bitPosition = 0n;
    for (let i = 0; i < 18; i++) {
      result += this.values[i].toBigInt() << bitPosition;
      bitPosition += 116n;
    }
    return result;
  }

  static from(x: bigint) {
    let values = [];
    for (let i = 0; i < 18; i++) {
      values.push(Field(x & mask));
      x >>= 116n;
    }
    return new Bigint2048({ values });
  }

  static check(x: { values: Field[] }) {
    for (let i = 0; i < 18; i++) {
      rangeCheck116(x.values[i]);
    }
  }
}

/**
 * x*y mod p
 */
function multiply(x: Bigint2048, y: Bigint2048, p: bigint) {
  // witness q, r so that x*y = q*p + r
  // this also adds the range checks in `check()`
  let { q, r } = Provable.witness(
    provable({ q: Bigint2048, r: Bigint2048 }),
    () => {
      let xy = x.toBigInt() * y.toBigInt();
      let q = xy / p;
      let r = xy - q * p;
      return { q: Bigint2048.from(q), r: Bigint2048.from(r) };
    }
  );

  let res: Field[] = Array.from({ length: 2 * 18 - 1 }, () => Field(0));
  let [X, Y, Q, R] = [x.values, y.values, q.values, r.values];

  const P = Bigint2048.from(p).values;

  for (let i = 0; i < 18; i++) {
    for (let j = 0; j < 18; j++) {
      let xy = X[i].mul(Y[j]);
      let qp = Q[i].mul(P[j]);
      res[i + j] = res[i + j].add(xy).sub(qp);
    }
  }
  for (let i = 0; i < 18; i++) {
    res[i] = res[i].sub(R[i]);
  }

  // (xy - qp - r)_i + c_(i-1) === c_i * 2^116

  let carry = Field(0);

  for (let i = 0; i < 2 * 18 - 2; i++) {
    let res_i = res[i].add(carry);

    [carry] = Provable.witnessFields(1, () => [res_i.toBigInt() >> 116n]);
    rangeCheck128(carry);

    res_i.assertEquals(carry.mul(1n << 116n));
  }

  // last carry is 0 ==> xy - qp - r is 0
  let res_i = res[2 * 18 - 1].add(carry);
  res_i.assertEquals(0n);

  return r;
}

/**
 * Custom range check for a single limb
 */
function rangeCheck116(x: Field) {
  let [x0, x1] = Provable.witnessFields(2, () => [
    x.toBigInt() & mask,
    x.toBigInt() >> 116n,
  ]);

  Gadgets.rangeCheck64(x0);
  let [x52] = Gadgets.rangeCheck64(x1);
  x52.assertEquals(0n);

  x0.add(x1.mul(1n << 116n)).assertEquals(x);
}

/**
 * Custom range check for carries
 */
function rangeCheck128(x: Field) {
  let [x0, x1] = Provable.witnessFields(2, () => [
    x.toBigInt() & mask,
    x.toBigInt() >> 116n,
  ]);

  Gadgets.rangeCheck64(x0);
  Gadgets.rangeCheck64(x1);

  x0.add(x1.mul(1n << 116n)).assertEquals(x);
}
