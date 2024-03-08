/**
 * Basic gadgets that only use generic gates
 */
import { Fp } from '../../bindings/crypto/finite-field.js';
import {
  Field,
  FieldConst,
  FieldType,
  FieldVar,
  VarField,
  VarFieldVar,
} from '../field.js';
import { assert, existsOne, toVar } from './common.js';
import { Gates, fieldVar } from '../gates.js';
import { TupleN } from '../util/types.js';

export { assertMul, assertSquare, assertBoolean, arrayGet, assertOneOf };

// internal
export {
  reduceLinearCombination,
  emptyCell,
  linear,
  bilinear,
  ScaledVar,
  Constant,
};

/**
 * Assert multiplication constraint, `x * y === z`
 */
function assertMul(
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
 * Assert square, `x^2 === z`
 */
function assertSquare(x_: Field, z_: Field) {
  let x = toVar(x_);
  let z = toVar(z_);
  assertBilinear(x, x, [1n, 0n, 0n, 0n], z);
}

/**
 * Assert that x is either 0 or 1, `x^2 === x`
 */
function assertBoolean(x_: Field) {
  let x = toVar(x_);
  assertBilinear(x, x, [1n, -1n, 0n, 0n]);
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

  // we prove a === array[j] + z[j]*(i - j) for some z[j], for all j.
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
    // prove that z[j]*(i - j) === a - array[j]
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
 * Compute linear function of x:
 * `z = a*x + b`
 */
function linear(x: VarField | VarFieldVar, [a, b]: TupleN<bigint, 2>) {
  let z = existsOne(() => {
    let x0 = new Field(x).toBigInt();
    return a * x0 + b;
  });
  // a*x - z + b === 0
  Gates.generic(
    { left: a, right: 0n, out: -1n, mul: 0n, const: b },
    { left: x, right: emptyCell(), out: z }
  );
  return z;
}

/**
 * Compute bilinear function of x and y:
 * `z = a*x*y + b*x + c*y + d`
 */
function bilinear(
  x: VarField | VarFieldVar,
  y: VarField | VarFieldVar,
  [a, b, c, d]: TupleN<bigint, 4>
) {
  let z = existsOne(() => {
    let x0 = new Field(x).toBigInt();
    let y0 = new Field(y).toBigInt();
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
  x: VarField | VarFieldVar,
  y: VarField | VarFieldVar,
  [a, b, c, d]: TupleN<bigint, 4>,
  z?: VarField | VarFieldVar
) {
  // b*x + c*y - z? + a*x*y + d === 0
  Gates.generic(
    { left: b, right: c, out: z === undefined ? 0n : -1n, mul: a, const: d },
    { left: x, right: y, out: z === undefined ? emptyCell() : z }
  );
}

function emptyCell() {
  return existsOne(() => 0n);
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
  // (to match snarky implementation)
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

// helpers for dealing with scaled vars and constants

// type Scaled = [FieldType.Scale, FieldConst, FieldVar];
type ScaledVar = [FieldType.Scale, FieldConst, VarFieldVar];
type Constant = [FieldType.Constant, FieldConst];

function isVar(x: ScaledVar | Constant): x is ScaledVar {
  return x[0] === FieldType.Scale;
}
function isConst(x: ScaledVar | Constant): x is Constant {
  return x[0] === FieldType.Constant;
}

function getVar(x: ScaledVar): [bigint, VarFieldVar] {
  return [x[1][1], x[2]];
}
function getConst(x: Constant): bigint {
  return x[1][1];
}

const ScaledVar = { isVar, getVar, isConst, getConst };
