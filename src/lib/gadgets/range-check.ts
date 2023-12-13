import { Field } from '../field.js';
import { Gates } from '../gates.js';
import { assert, bitSlice, exists, toVar, toVars } from './common.js';

export { rangeCheck64, rangeCheck8, multiRangeCheck, compactMultiRangeCheck };
export { l, l2, l3, lMask, l2Mask };

/**
 * Asserts that x is in the range [0, 2^64)
 */
function rangeCheck64(x: Field) {
  if (x.isConstant()) {
    if (x.toBigInt() >= 1n << 64n) {
      throw Error(`rangeCheck64: expected field to fit in 64 bits, got ${x}`);
    }
    return;
  }

  // crumbs (2-bit limbs)
  let [x0, x2, x4, x6, x8, x10, x12, x14] = exists(8, () => {
    let xx = x.toBigInt();
    return [
      bitSlice(xx, 0, 2),
      bitSlice(xx, 2, 2),
      bitSlice(xx, 4, 2),
      bitSlice(xx, 6, 2),
      bitSlice(xx, 8, 2),
      bitSlice(xx, 10, 2),
      bitSlice(xx, 12, 2),
      bitSlice(xx, 14, 2),
    ];
  });

  // 12-bit limbs
  let [x16, x28, x40, x52] = exists(4, () => {
    let xx = x.toBigInt();
    return [
      bitSlice(xx, 16, 12),
      bitSlice(xx, 28, 12),
      bitSlice(xx, 40, 12),
      bitSlice(xx, 52, 12),
    ];
  });

  Gates.rangeCheck0(
    x,
    [new Field(0), new Field(0), x52, x40, x28, x16],
    [x14, x12, x10, x8, x6, x4, x2, x0],
    false // not using compact mode
  );
}

// default bigint limb size
const l = 88n;
const l2 = 2n * l;
const l3 = 3n * l;
const lMask = (1n << l) - 1n;
const l2Mask = (1n << l2) - 1n;

/**
 * Asserts that x, y, z \in [0, 2^88)
 */
function multiRangeCheck([x, y, z]: [Field, Field, Field]) {
  if (x.isConstant() && y.isConstant() && z.isConstant()) {
    if (x.toBigInt() >> l || y.toBigInt() >> l || z.toBigInt() >> l) {
      throw Error(`Expected fields to fit in ${l} bits, got ${x}, ${y}, ${z}`);
    }
    return;
  }
  // ensure we are using pure variables
  [x, y, z] = toVars([x, y, z]);
  let zero = toVar(0n);

  let [x64, x76] = rangeCheck0Helper(x);
  let [y64, y76] = rangeCheck0Helper(y);
  rangeCheck1Helper({ x64, x76, y64, y76, z, yz: zero });
}

/**
 * Compact multi-range-check - checks
 * - xy = x + 2^88*y
 * - x, y, z \in [0, 2^88)
 *
 * Returns the full limbs x, y, z
 */
function compactMultiRangeCheck(xy: Field, z: Field): [Field, Field, Field] {
  // constant case
  if (xy.isConstant() && z.isConstant()) {
    if (xy.toBigInt() >> l2 || z.toBigInt() >> l) {
      throw Error(
        `Expected fields to fit in ${l2} and ${l} bits respectively, got ${xy}, ${z}`
      );
    }
    let [x, y] = splitCompactLimb(xy.toBigInt());
    return [new Field(x), new Field(y), z];
  }
  // ensure we are using pure variables
  [xy, z] = toVars([xy, z]);

  let [x, y] = exists(2, () => splitCompactLimb(xy.toBigInt()));

  let [z64, z76] = rangeCheck0Helper(z, false);
  let [x64, x76] = rangeCheck0Helper(x, true);
  rangeCheck1Helper({ x64: z64, x76: z76, y64: x64, y76: x76, z: y, yz: xy });

  return [x, y, z];
}

function splitCompactLimb(x01: bigint): [bigint, bigint] {
  return [x01 & lMask, x01 >> l];
}

function rangeCheck0Helper(x: Field, isCompact = false): [Field, Field] {
  // crumbs (2-bit limbs)
  let [x0, x2, x4, x6, x8, x10, x12, x14] = exists(8, () => {
    let xx = x.toBigInt();
    return [
      bitSlice(xx, 0, 2),
      bitSlice(xx, 2, 2),
      bitSlice(xx, 4, 2),
      bitSlice(xx, 6, 2),
      bitSlice(xx, 8, 2),
      bitSlice(xx, 10, 2),
      bitSlice(xx, 12, 2),
      bitSlice(xx, 14, 2),
    ];
  });

  // 12-bit limbs
  let [x16, x28, x40, x52, x64, x76] = exists(6, () => {
    let xx = x.toBigInt();
    return [
      bitSlice(xx, 16, 12),
      bitSlice(xx, 28, 12),
      bitSlice(xx, 40, 12),
      bitSlice(xx, 52, 12),
      bitSlice(xx, 64, 12),
      bitSlice(xx, 76, 12),
    ];
  });

  Gates.rangeCheck0(
    x,
    [x76, x64, x52, x40, x28, x16],
    [x14, x12, x10, x8, x6, x4, x2, x0],
    isCompact
  );

  // the two highest 12-bit limbs are returned because another gate
  // is needed to add lookups for them
  return [x64, x76];
}

function rangeCheck1Helper(inputs: {
  x64: Field;
  x76: Field;
  y64: Field;
  y76: Field;
  z: Field;
  yz: Field;
}) {
  let { x64, x76, y64, y76, z, yz } = inputs;

  // create limbs for current row
  let [z22, z24, z26, z28, z30, z32, z34, z36, z38, z50, z62, z74, z86] =
    exists(13, () => {
      let zz = z.toBigInt();
      return [
        bitSlice(zz, 22, 2),
        bitSlice(zz, 24, 2),
        bitSlice(zz, 26, 2),
        bitSlice(zz, 28, 2),
        bitSlice(zz, 30, 2),
        bitSlice(zz, 32, 2),
        bitSlice(zz, 34, 2),
        bitSlice(zz, 36, 2),
        bitSlice(zz, 38, 12),
        bitSlice(zz, 50, 12),
        bitSlice(zz, 62, 12),
        bitSlice(zz, 74, 12),
        bitSlice(zz, 86, 2),
      ];
    });

  // create limbs for next row
  let [z0, z2, z4, z6, z8, z10, z12, z14, z16, z18, z20] = exists(11, () => {
    let zz = z.toBigInt();
    return [
      bitSlice(zz, 0, 2),
      bitSlice(zz, 2, 2),
      bitSlice(zz, 4, 2),
      bitSlice(zz, 6, 2),
      bitSlice(zz, 8, 2),
      bitSlice(zz, 10, 2),
      bitSlice(zz, 12, 2),
      bitSlice(zz, 14, 2),
      bitSlice(zz, 16, 2),
      bitSlice(zz, 18, 2),
      bitSlice(zz, 20, 2),
    ];
  });

  Gates.rangeCheck1(
    z,
    yz,
    [z86, z74, z62, z50, z38, z36, z34, z32, z30, z28, z26, z24, z22],
    [z20, z18, z16, x76, x64, y76, y64, z14, z12, z10, z8, z6, z4, z2, z0]
  );
}

function rangeCheck8(x: Field) {
  if (x.isConstant()) {
    assert(
      x.toBigInt() < 1n << 8n,
      `rangeCheck8: expected field to fit in 8 bits, got ${x}`
    );
    return;
  }

  // check that x fits in 16 bits
  x.rangeCheckHelper(16).assertEquals(x);
  // check that 2^8 x fits in 16 bits
  let x256 = x.mul(1 << 8).seal();
  x256.rangeCheckHelper(16).assertEquals(x256);
}
