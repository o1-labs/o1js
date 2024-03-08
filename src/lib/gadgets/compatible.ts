/**
 * Basic gadgets that only use generic gates, and are compatible with (create the same constraints as)
 * `plonk_constraint_system.ml` / R!CS_constraint_system.
 */
import { Fp } from '../../bindings/crypto/finite-field.js';
import {
  Field,
  FieldConst,
  FieldType,
  FieldVar,
  VarFieldVar,
} from '../field.js';
import { assert } from './common.js';
import { Gates, fieldVar } from '../gates.js';
import {
  Constant,
  ScaledVar,
  bilinear,
  emptyCell,
  linear,
  assertMul,
} from './basic.js';

export { assertMulCompatible as assertMul };

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

  let xv = reduceLinearCombination(x);
  let yv = reduceLinearCombination(y);
  let zv = reduceLinearCombination(z);

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

    assert(sx * sy === sz, `assertMul(): ${sx} * ${sy} !== ${sz}`);
  }

  // sadly TS doesn't know that this was exhaustive
  assert(false, `assertMul(): unreachable`);
}

/**
 * Converts a `FieldVar` into a set of constraints, returns the remainder as a ScaledVar | Constant
 *
 * Handles duplicated variables optimally.
 *
 * This is better than fully reducing to a Var, because it allows callers to fold the scaling factor into the next operation,
 * instead of wasting a constraint on `c * x === y` before using `c * x`.
 */
function reduceLinearCombination(x: Field | FieldVar): ScaledVar | Constant {
  let { constant: c, terms } = toLinearCombination(fieldVar(x));

  // sort terms alphabetically by variable index
  terms.sort(([, [, i]], [, [, j]]) => i - j);

  if (terms.length === 0) {
    // constant
    return [FieldType.Constant, FieldConst.fromBigint(c)];
  }

  if (terms.length === 1) {
    let [s, x] = terms[0];
    if (c === 0n) {
      // s*x
      return [FieldType.Scale, FieldConst.fromBigint(s), x];
    } else {
      // res = s*x + c
      let res = linear(x, [s, c]);
      return [FieldType.Scale, FieldConst[1], res.value];
    }
  }

  // res = s0*x0 + s1*x1 + ... + sn*xn + c
  let [[s0, x0], ...rest] = terms;

  let [s1, x1] = rest.pop()!;

  for (let [si, xi] of rest.reverse()) {
    // x1 = s1*x1 + si*xi
    x1 = bilinear(xi, x1, [0n, si, s1, 0n]).value;
    s1 = 1n;
  }

  // res = s0*x0 + s1*x1 + c
  let res = bilinear(x0, x1, [0n, s0, s1, c]);
  return [FieldType.Scale, FieldConst[1], res.value];
}

/**
 * Flatten the AST of a `FieldVar` to a linear combination of the form
 *
 * `c + s1*x1 + s2*x2 + ... + sn*xn`
 *
 * where no vars are duplicated.
 */
function toLinearCombination(
  x: FieldVar,
  sx = 1n,
  lincom: { constant: bigint; terms: [bigint, VarFieldVar][] } = {
    constant: 0n,
    terms: [],
  }
): { constant: bigint; terms: [bigint, VarFieldVar][] } {
  let { constant, terms } = lincom;
  // the recursive logic here adds a new term sx*x to an existing linear combination
  // but x itself is an AST

  switch (x[0]) {
    case FieldType.Constant: {
      // a constant is added to the constant term
      let [, [, c]] = x;
      return { constant: Fp.add(constant, Fp.mul(sx, c)), terms };
    }
    case FieldType.Var: {
      // a variable as added to the terms or included in an existing one
      let [, i] = x;

      // we search for an existing term with the same var
      let y = terms.find((t) => t[1][1] === i);

      // if there is none, we just add a new term
      if (y === undefined) return { constant, terms: [[sx, x], ...terms] };

      // if there is one, we add the scales
      let [sy] = y;
      y[0] = Fp.add(sy, sx);

      if (y[0] === 0n) {
        // if the sum is 0, we remove the term
        terms = terms.filter((t) => t[1][1] !== i);
      }

      return { constant, terms };
    }
    case FieldType.Scale: {
      // sx * (s * x) + ... = (sx * s) * x + ...
      let [, [, s], v] = x;
      return toLinearCombination(v, Fp.mul(sx, s), lincom);
    }
    case FieldType.Add: {
      // sx * (x1 + x2) + ... = sx * x2 + (sx * x1 + ...)
      let [, x1, x2] = x;
      lincom = toLinearCombination(x1, sx, lincom);
      return toLinearCombination(x2, sx, lincom);
    }
  }
}
