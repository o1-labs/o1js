import {
  FiniteField,
  inverse,
  mod,
} from '../../bindings/crypto/finite_field.js';
import { exampleFields } from '../../bindings/crypto/finite-field-examples.js';
import { Field } from '../field.js';
import { Provable } from '../provable.js';
import { assert, exists } from './common.js';
import {
  Field3,
  ForeignField,
  Sum,
  assertRank1,
  bigint3,
  split,
  weakBound,
} from './foreign-field.js';
import { multiRangeCheck } from './range-check.js';
import { printGates } from '../testing/constraint-system.js';
import { sha256 } from 'js-sha256';
import { bytesToBigInt } from '../../bindings/crypto/bigint-helpers.js';
import { Pallas } from '../../bindings/crypto/elliptic_curve.js';

type Point = { x: Field3; y: Field3 };
type point = { x: bigint3; y: bigint3; infinity: boolean };

function add({ x: x1, y: y1 }: Point, { x: x2, y: y2 }: Point, f: bigint) {
  // TODO constant case

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
  let mBound = weakBound(m[2], f);
  let x3Bound = weakBound(x3[2], f);
  // we dont need to bound y3[2] because it's never one of the inputs to a multiplication

  // (x1 - x2)*m = y1 - y2
  let deltaX = new Sum(x1).sub(x2);
  let deltaY = new Sum(y1).sub(y2);
  let qBound1 = assertRank1(deltaX, m, deltaY, f);

  // m^2 = x1 + x2 + x3
  let xSum = new Sum(x1).add(x2).add(x3);
  let qBound2 = assertRank1(m, m, xSum, f);

  // (x1 - x3)*m = y1 + y3
  let deltaX1X3 = new Sum(x1).sub(x3);
  let ySum = new Sum(y1).add(y3);
  let qBound3 = assertRank1(deltaX1X3, m, ySum, f);

  // bounds checks
  multiRangeCheck([mBound, x3Bound, qBound1]);
  multiRangeCheck([qBound2, qBound3, Field.from(0n)]);
}

function double({ x: x1, y: y1 }: Point, f: bigint) {
  // TODO constant case

  // witness and range-check slope, x3, y3
  let witnesses = exists(9, () => {
    let [x1_, y1_] = Field3.toBigints(x1, y1);
    let denom = inverse(mod(2n * y1_, f), f);

    let m = denom !== undefined ? mod(3n * mod(x1_ ** 2n, f) * denom, f) : 0n;
    let m2 = mod(m * m, f);
    let x3 = mod(m2 - 2n * x1_, f);
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
  let mBound = weakBound(m[2], f);
  let x3Bound = weakBound(x3[2], f);
  // we dont need to bound y3[2] because it's never one of the inputs to a multiplication

  // x1^2 = x1x1
  let x1x1 = ForeignField.mul(x1, x1, f);

  // 2*y1*m = 3*x1x1
  // TODO this assumes the curve has a == 0
  let y1Times2 = new Sum(y1).add(y1);
  let x1x1Times3 = new Sum(x1x1).add(x1x1).add(x1x1);
  let qBound1 = assertRank1(y1Times2, m, x1x1Times3, f);

  // m^2 = 2*x1 + x3
  let xSum = new Sum(x1).add(x1).add(x3);
  let qBound2 = assertRank1(m, m, xSum, f);

  // (x1 - x3)*m = y1 + y3
  let deltaX1X3 = new Sum(x1).sub(x3);
  let ySum = new Sum(y1).add(y3);
  let qBound3 = assertRank1(deltaX1X3, m, ySum, f);

  // bounds checks
  multiRangeCheck([mBound, x3Bound, qBound1]);
  multiRangeCheck([qBound2, qBound3, Field.from(0n)]);
}

/**
 * For EC scalar multiplication we use an initial point which is subtracted
 * at the end, to avoid encountering the point at infinity.
 *
 * This is a simple hash-to-group algorithm which finds that initial point.
 * It's important that this point has no known discrete logarithm so that nobody
 * can create an invalid proof of EC scaling.
 */
function initialAggregator(F: FiniteField, { a, b }: { a: bigint; b: bigint }) {
  let h = sha256.create();
  h.update('o1js:ecdsa');
  let bytes = h.array();

  // bytes represent a 256-bit number
  // use that as x coordinate
  let x = F.mod(bytesToBigInt(bytes));
  let y: bigint | undefined = undefined;

  // increment x until we find a y coordinate
  while (y === undefined) {
    // solve y^2 = x^3 + ax + b
    let x3 = F.mul(F.square(x), x);
    let y2 = F.add(x3, F.mul(a, x) + b);
    y = F.sqrt(y2);
  }
  return { x: F.mod(x), y, infinity: false };
}

let csAdd = Provable.constraintSystem(() => {
  let x1 = Provable.witness(Field3.provable, () => Field3.from(0n));
  let x2 = Provable.witness(Field3.provable, () => Field3.from(0n));
  let y1 = Provable.witness(Field3.provable, () => Field3.from(0n));
  let y2 = Provable.witness(Field3.provable, () => Field3.from(0n));

  let g = { x: x1, y: y1 };
  let h = { x: x2, y: y2 };

  add(g, h, exampleFields.secp256k1.modulus);
});

let csDouble = Provable.constraintSystem(() => {
  let x1 = Provable.witness(Field3.provable, () => Field3.from(0n));
  let y1 = Provable.witness(Field3.provable, () => Field3.from(0n));

  let g = { x: x1, y: y1 };

  double(g, exampleFields.secp256k1.modulus);
});

printGates(csAdd.gates);
console.log({ digest: csAdd.digest, rows: csAdd.rows });

printGates(csDouble.gates);
console.log({ digest: csDouble.digest, rows: csDouble.rows });

let point = initialAggregator(exampleFields.Fp, { a: 0n, b: 5n });
console.log({ point });
assert(Pallas.isOnCurve(Pallas.fromAffine(point)));
