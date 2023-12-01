/**
 * Basic gadgets that only use generic gates
 */
import type { Field, VarField } from '../field.js';
import { existsOne, toVar } from './common.js';
import { Gates } from '../gates.js';
import { TupleN } from '../util/types.js';

export { assertOneOf };

// TODO: create constant versions of these and expose on Gadgets

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
