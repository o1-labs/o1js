import { inverse, mod } from '../../bindings/crypto/finite_field.js';
import { exampleFields } from '../../bindings/crypto/finite-field-examples.js';
import { provablePure } from '../circuit_value.js';
import { Field } from '../field.js';
import { Provable } from '../provable.js';
import { TupleN } from '../util/types.js';
import { exists } from './common.js';
import {
  Field3,
  ForeignField,
  assertMul,
  bigint3,
  split,
  weakBound,
} from './foreign-field.js';
import { multiRangeCheck } from './range-check.js';
import { printGates } from '../testing/constraint-system.js';

type Point = { x: Field3; y: Field3 };
type point = { x: bigint3; y: bigint3; infinity: boolean };

let { sum } = ForeignField;

function add({ x: x1, y: y1 }: Point, { x: x2, y: y2 }: Point, f: bigint) {
  // witness and range-check slope, x3, y3
  let witnesses = exists(9, () => {
    let [x1_, x2_, y1_, y2_] = Field3.toBigints(x1, x2, y1, y2);
    let denom = inverse(mod(x1_ - x2_, f), f);

    let m = denom !== undefined ? mod((y1_ - y2_) * denom, f) : 0n;
    let m2 = mod(m * m, f);
    let x3 = mod(m2 - x1_ - x2_, f);
    let y3 = mod(m * (x1_ - x3) - y1_, f);

    return [...split(m), ...split(x3), ...split(y3)];
  });
  let [m0, m1, m2, x30, x31, x32, y30, y31, y32] = witnesses;
  let m: Field3 = [m0, m1, m2];
  let x3: Field3 = [x30, x31, x32];
  let y3: Field3 = [y30, y31, y32];

  multiRangeCheck(m);
  multiRangeCheck(x3);
  multiRangeCheck(y3);
  let m2Bound = weakBound(m[2], f);
  let x3Bound = weakBound(x3[2], f);
  // we dont need to bounds check y3[2] because it's never one of the inputs to a multiplication

  // (x1 - x2)*m = y1 - y2
  let deltaY = sum([y1, y2], [-1n], f, { skipRangeCheck: true });
  let deltaX = sum([x1, x2], [-1n], f, {
    skipRangeCheck: true,
    skipZeroRow: true,
  });
  let qBound1 = assertMul(deltaX, m, deltaY, f);
  multiRangeCheck(deltaX);

  // m^2 = x1 + x2 + x3
  let xSum = sum([x1, x2, x3], [1n, 1n], f, { skipRangeCheck: true });
  let qBound2 = assertMul(m, m, xSum, f);

  // (x1 - x3)*m = y1 + y3
  let ySum = sum([y1, y3], [1n], f, { skipRangeCheck: true });
  let deltaX1X3 = sum([x1, x3], [-1n], f, {
    skipRangeCheck: true,
    skipZeroRow: true,
  });
  let qBound3 = assertMul(deltaX1X3, m, ySum, f);
  multiRangeCheck(deltaX1X3);

  // bounds checks
  multiRangeCheck([m2Bound, x3Bound, qBound1]);
  multiRangeCheck([qBound2, qBound3, Field.from(0n)]);
}

let cs = Provable.constraintSystem(() => {
  let x1 = Provable.witness(Field3.provable, () => Field3.from(0n));
  let x2 = Provable.witness(Field3.provable, () => Field3.from(0n));
  let y1 = Provable.witness(Field3.provable, () => Field3.from(0n));
  let y2 = Provable.witness(Field3.provable, () => Field3.from(0n));

  let g = { x: x1, y: y1 };
  let h = { x: x2, y: y2 };

  add(g, h, exampleFields.secp256k1.modulus);
});

printGates(cs.gates);
