/**
 * Basic gadgets that only use generic gates, and are compatible with (create the same constraints as)
 * `plonk_constraint_system.ml` / R!CS_constraint_system.
 */
import { Fp } from '../../bindings/crypto/finite-field.js';
import { Field, FieldVar } from '../field.js';
import { assert } from './common.js';
import { Gates } from '../gates.js';
import { ScaledVar, emptyCell, reduceToScaledVar } from './basic.js';

export {
  assertMulCompatible as assertMul,
  assertSquareCompatible as assertSquare,
  assertBooleanCompatible as assertBoolean,
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
    let [_sx, x] = getVar(xv);

    // FIXME: it's wrong that the scaling factor is ignored here, means it can't be different than 1
    // this needs to be compatible, so need to change `plonk_constraint_system.ml`
    // x^2 - x = 0
    return Gates.generic(
      { left: -1n, right: 0n, out: 0n, mul: 1n, const: 0n },
      { left: x, right: x, out: emptyCell() }
    );
  }

  let x0 = getConst(xv);
  assert(Fp.equal(Fp.square(x0), x0), `assertBoolean(): ${x} is not 0 or 1`);
}
