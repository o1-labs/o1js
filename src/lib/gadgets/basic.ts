/**
 * Basic gadgets that only use generic gates
 */
import { Fp } from '../../bindings/crypto/finite_field.js';
import type { Field, VarField } from '../field.js';
import { existsOne, toVar } from './common.js';
import { Gates } from '../gates.js';
import { TupleN } from '../util/types.js';
import { Snarky } from '../../snarky.js';

export { assertBoolean, arrayGet, assertOneOf };

/**
 * Assert that x is either 0 or 1.
 */
function assertBoolean(x: VarField) {
  Snarky.field.assertBoolean(x.value);
}

// TODO: create constant versions of these and expose on Gadgets

/**
 * Get value from array in O(n) rows.
 *
 * Assumes that index is in [0, n), returns an unconstrained result otherwise.
 *
 * Note: This saves 0.5*n constraints compared to equals() + switch()
 */
function arrayGet(array: Field[], index: Field) {
  let i = toVar(index);

  // witness result
  let a = existsOne(() => array[Number(i.toBigInt())].toBigInt());

  // we prove a === array[j] + zj*(i - j) for some zj, for all j.
  // setting j = i, this implies a === array[i]
  // thanks to our assumption that the index i is within bounds, we know that j = i for some j
  let n = array.length;
  for (let j = 0; j < n; j++) {
    let zj = existsOne(() => {
      let zj = Fp.div(
        Fp.sub(a.toBigInt(), array[j].toBigInt()),
        Fp.sub(i.toBigInt(), Fp.fromNumber(j))
      );
      return zj ?? 0n;
    });
    // prove that zj*(i - j) === a - array[j]
    // TODO abstract this logic into a general-purpose assertMul() gadget,
    // which is able to use the constant coefficient
    // (snarky's assert_r1cs somehow leads to much more constraints than this)
    if (array[j].isConstant()) {
      // zj*i + (-j)*zj + 0*i + array[j] === a
      assertBilinear(zj, i, [1n, -BigInt(j), 0n, array[j].toBigInt()], a);
    } else {
      let aMinusAj = toVar(a.sub(array[j]));
      // zj*i + (-j)*zj + 0*i + 0 === (a - array[j])
      assertBilinear(zj, i, [1n, -BigInt(j), 0n, 0n], aMinusAj);
    }
  }

  return a;
}

/**
 * Assert that a value equals one of a finite list of constants:
 * `(x - c1)*(x - c2)*...*(x - cn) === 0`
 *
 * TODO: what prevents us from getting the same efficiency with snarky DSL code?
 */
function assertOneOf(x: Field, allowed: [bigint, bigint, ...bigint[]]) {
  let xv = toVar(x);
  let [c1, c2, ...c] = allowed;
  let n = c.length;
  if (n === 0) {
    // (x - c1)*(x - c2) === 0
    assertBilinear(xv, xv, [1n, -(c1 + c2), 0n, c1 * c2]);
    return;
  }
  // z = (x - c1)*(x - c2)
  let z = bilinear(xv, xv, [1n, -(c1 + c2), 0n, c1 * c2]);

  for (let i = 0; i < n; i++) {
    if (i < n - 1) {
      // z = z*(x - c)
      z = bilinear(z, xv, [1n, -c[i], 0n, 0n]);
    } else {
      // z*(x - c) === 0
      assertBilinear(z, xv, [1n, -c[i], 0n, 0n]);
    }
  }
}

// low-level helpers to create generic gates

/**
 * Compute bilinear function of x and y:
 * `z = a*x*y + b*x + c*y + d`
 */
function bilinear(x: VarField, y: VarField, [a, b, c, d]: TupleN<bigint, 4>) {
  let z = existsOne(() => {
    let x0 = x.toBigInt();
    let y0 = y.toBigInt();
    return a * x0 * y0 + b * x0 + c * y0 + d;
  });
  // b*x + c*y - z + a*x*y + d === 0
  Gates.generic(
    { left: b, right: c, out: -1n, mul: a, const: d },
    { left: x, right: y, out: z }
  );
  return z;
}

/**
 * Assert bilinear equation on x, y and z:
 * `a*x*y + b*x + c*y + d === z`
 *
 * The default for z is 0.
 */
function assertBilinear(
  x: VarField,
  y: VarField,
  [a, b, c, d]: TupleN<bigint, 4>,
  z?: VarField
) {
  // b*x + c*y - z? + a*x*y + d === 0
  Gates.generic(
    { left: b, right: c, out: z === undefined ? 0n : -1n, mul: a, const: d },
    { left: x, right: y, out: z === undefined ? x : z }
  );
}
