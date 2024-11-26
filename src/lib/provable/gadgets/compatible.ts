/**
 * Basic gadgets that only use generic gates, and are compatible with (create the same constraints as)
 * `plonk_constraint_system.ml` / R1CS_constraint_system.
 */
import { Fp } from '../../../bindings/crypto/finite-field.js';
import { Field } from '../field.js';
import { FieldVar } from '../core/fieldvar.js';
import { assert } from './common.js';
import { Gates } from '../gates.js';
import { ScaledVar, emptyCell, reduceToScaledVar } from './basic.js';
import { Snarky } from '../../../snarky.js';

export {
  assertMulCompatible as assertMul,
  assertSquareCompatible as assertSquare,
  assertBooleanCompatible as assertBoolean,
  assertEqualCompatible as assertEqual,
};

let { isVar, getVar, isConst, getConst } = ScaledVar;

/**
 * Assert multiplication constraint, `x * y === z`
 */
function assertMulCompatible(
  x: Field | FieldVar,
  y: Field | FieldVar,
  z: Field | FieldVar
) {
  // this faithfully implements snarky's `assert_r1cs`,
  // see `R1CS_constraint_system.add_constraint` -> `Snarky_backendless.Constraint.R1CS`

  let xv = reduceToScaledVar(x);
  let yv = reduceToScaledVar(y);
  let zv = reduceToScaledVar(z);

  // three variables

  if (isVar(xv) && isVar(yv) && isVar(zv)) {
    let [[sx, x], [sy, y], [sz, z]] = [getVar(xv), getVar(yv), getVar(zv)];

    // -sx sy * x y + sz z = 0
    return Gates.generic(
      { left: 0n, right: 0n, out: sz, mul: -sx * sy, const: 0n },
      { left: x, right: y, out: z }
    );
  }

  // two variables, one constant

  if (isVar(xv) && isVar(yv) && isConst(zv)) {
    let [[sx, x], [sy, y], sz] = [getVar(xv), getVar(yv), getConst(zv)];

    // sx sy * x y - sz = 0
    return Gates.generic(
      { left: 0n, right: 0n, out: 0n, mul: sx * sy, const: -sz },
      { left: x, right: y, out: emptyCell() }
    );
  }

  if (isVar(xv) && isConst(yv) && isVar(zv)) {
    let [[sx, x], sy, [sz, z]] = [getVar(xv), getConst(yv), getVar(zv)];

    // sx sy * x - sz z = 0
    return Gates.generic(
      { left: sx * sy, right: 0n, out: -sz, mul: 0n, const: 0n },
      { left: x, right: emptyCell(), out: z }
    );
  }

  if (isConst(xv) && isVar(yv) && isVar(zv)) {
    let [sx, [sy, y], [sz, z]] = [getConst(xv), getVar(yv), getVar(zv)];

    // sx sy * y - sz z = 0
    return Gates.generic(
      { left: 0n, right: sx * sy, out: -sz, mul: 0n, const: 0n },
      { left: emptyCell(), right: y, out: z }
    );
  }

  // two constants, one variable

  if (isVar(xv) && isConst(yv) && isConst(zv)) {
    let [[sx, x], sy, sz] = [getVar(xv), getConst(yv), getConst(zv)];

    // sx sy * x - sz = 0
    return Gates.generic(
      { left: sx * sy, right: 0n, out: 0n, mul: 0n, const: -sz },
      { left: x, right: emptyCell(), out: emptyCell() }
    );
  }

  if (isConst(xv) && isVar(yv) && isConst(zv)) {
    let [sx, [sy, y], sz] = [getConst(xv), getVar(yv), getConst(zv)];

    // sx sy * y - sz = 0
    return Gates.generic(
      { left: 0n, right: sx * sy, out: 0n, mul: 0n, const: -sz },
      { left: emptyCell(), right: y, out: emptyCell() }
    );
  }

  if (isConst(xv) && isConst(yv) && isVar(zv)) {
    let [sx, sy, [sz, z]] = [getConst(xv), getConst(yv), getVar(zv)];

    // sz z - sx sy = 0
    return Gates.generic(
      { left: 0n, right: 0n, out: sz, mul: 0n, const: -sx * sy },
      { left: emptyCell(), right: emptyCell(), out: z }
    );
  }

  // three constants

  if (isConst(xv) && isConst(yv) && isConst(zv)) {
    let [sx, sy, sz] = [getConst(xv), getConst(yv), getConst(zv)];

    assert(
      Fp.equal(Fp.mul(sx, sy), sz),
      `assertMul(): ${sx} * ${sy} !== ${sz}`
    );
    return;
  }

  // sadly TS doesn't know that this was exhaustive
  assert(false, `assertMul(): unreachable`);
}

/**
 * Assert square, `x^2 === z`
 */
function assertSquareCompatible(x: Field, z: Field) {
  let xv = reduceToScaledVar(x);
  let zv = reduceToScaledVar(z);

  if (isVar(xv) && isVar(zv)) {
    let [[sx, x], [sz, z]] = [getVar(xv), getVar(zv)];

    // -sz * z + (sx)^2 * x*x = 0
    return Gates.generic(
      { left: 0n, right: 0n, out: -sz, mul: sx ** 2n, const: 0n },
      { left: x, right: x, out: z }
    );
  }

  if (isVar(xv) && isConst(zv)) {
    let [[sx, x], sz] = [getVar(xv), getConst(zv)];

    // (sx)^2 * x*x - sz = 0
    return Gates.generic(
      { left: 0n, right: 0n, out: 0n, mul: sx ** 2n, const: -sz },
      { left: x, right: x, out: emptyCell() }
    );
  }

  if (isConst(xv) && isVar(zv)) {
    let [sx, [sz, z]] = [getConst(xv), getVar(zv)];

    // sz * z - (sx)^2 = 0
    return Gates.generic(
      { left: 0n, right: 0n, out: sz, mul: 0n, const: -(sx ** 2n) },
      { left: emptyCell(), right: emptyCell(), out: z }
    );
  }

  if (isConst(xv) && isConst(zv)) {
    let [sx, sz] = [getConst(xv), getConst(zv)];

    assert(Fp.equal(Fp.square(sx), sz), `assertSquare(): ${sx}^2 !== ${sz}`);
    return;
  }

  // sadly TS doesn't know that this was exhaustive
  assert(false, `assertSquare(): unreachable`);
}

/**
 * Assert that x is either 0 or 1, `x^2 === x`
 */
function assertBooleanCompatible(x: Field) {
  let xv = reduceToScaledVar(x);

  if (isVar(xv)) {
    let [s, x] = getVar(xv);

    // -s*x + s^2 * x^2 = 0
    return Gates.generic(
      { left: -s, right: 0n, out: 0n, mul: s ** 2n, const: 0n },
      { left: x, right: x, out: emptyCell() }
    );
  }

  let x0 = getConst(xv);
  assert(Fp.equal(Fp.square(x0), x0), `assertBoolean(): ${x} is not 0 or 1`);
}

/**
 * Assert equality, `x === y`
 */
function assertEqualCompatible(x: Field | FieldVar, y: Field | FieldVar) {
  // TODO not optimal for a case like `x + y === c*z`,
  // where this reduces x + y and then is still not able to just use a wire
  let yv = reduceToScaledVar(y);
  let xv = reduceToScaledVar(x);

  if (isVar(xv) && isVar(yv)) {
    let [[sx, x], [sy, y]] = [getVar(xv), getVar(yv)];

    if (sx === sy) {
      // x === y, so use a wire
      return Snarky.field.assertEqual(x, y);
    }

    // sx * x - sy * y = 0
    return Gates.generic(
      { left: sx, right: -sy, out: 0n, mul: 0n, const: 0n },
      { left: x, right: y, out: emptyCell() }
    );
  }

  if (isVar(xv) && isConst(yv)) {
    let [[sx, x], sy] = [getVar(xv), getConst(yv)];

    // x === sy / sx, call into snarky to use its constants table
    return Snarky.field.assertEqual(
      FieldVar.scale(sx, x),
      FieldVar.constant(sy)
    );
  }

  if (isConst(xv) && isVar(yv)) {
    let [sx, [sy, y]] = [getConst(xv), getVar(yv)];

    // sx / sy === y, call into snarky to use its constants table
    return Snarky.field.assertEqual(
      FieldVar.constant(sx),
      FieldVar.scale(sy, y)
    );
  }

  if (isConst(xv) && isConst(yv)) {
    let [sx, sy] = [getConst(xv), getConst(yv)];

    assert(Fp.equal(sx, sy), `assertEqual(): ${sx} !== ${sy}`);
    return;
  }

  // sadly TS doesn't know that this was exhaustive
  assert(false, `assertEqual(): unreachable`);
}
