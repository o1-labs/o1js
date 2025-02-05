import { Snarky } from '../../../snarky.js';
import { Fp } from '../../../bindings/crypto/finite-field.js';
import { BinableFp } from '../../../mina-signer/src/field-bigint.js';
import type { Field } from '../field.js';
import { Gates } from '../gates.js';
import { assert, bitSlice, toVar, toVars } from './common.js';
import { exists } from '../core/exists.js';
import { createBool, createField } from '../core/field-constructor.js';
import { TupleN } from '../../util/types.js';

export {
  rangeCheck64,
  rangeCheck32,
  multiRangeCheck,
  compactMultiRangeCheck,
  rangeCheckN,
  isDefinitelyInRangeN,
  rangeCheck8,
  rangeCheck16,
  rangeCheckLessThan16,
  rangeCheckLessThan64,
};
export { l, l2, l3, lMask, l2Mask };

/**
 * Asserts that x is in the range [0, 2^32)
 */
function rangeCheck32(x: Field) {
  if (x.isConstant()) {
    if (x.toBigInt() >= 1n << 32n) {
      throw Error(`rangeCheck32: expected field to fit in 32 bits, got ${x}`);
    }
    return;
  }

  let actual = rangeCheckHelper(32, x);
  actual.assertEquals(x);
}

/**
 * Asserts that x is in the range [0, 2^64).
 *
 * Returns the 4 highest 12-bit limbs of x in reverse order: [x52, x40, x28, x16].
 */
function rangeCheck64(x: Field): TupleN<Field, 4> {
  if (x.isConstant()) {
    let xx = x.toBigInt();
    if (xx >= 1n << 64n) {
      throw Error(`rangeCheck64: expected field to fit in 64 bits, got ${x}`);
    }
    // returned for consistency with the provable case
    return [
      createField(bitSlice(xx, 52, 12)),
      createField(bitSlice(xx, 40, 12)),
      createField(bitSlice(xx, 28, 12)),
      createField(bitSlice(xx, 16, 12)),
    ];
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
    [createField(0), createField(0), x52, x40, x28, x16],
    [x14, x12, x10, x8, x6, x4, x2, x0],
    false // not using compact mode
  );

  return [x52, x40, x28, x16];
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
    return [createField(x), createField(y), z];
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

/**
 * Helper function that creates a new {@link Field} element from the first `length` bits of this {@link Field} element.
 *
 * This returns the `x` truncated to `length` bits. However, it does **not** prove this truncation or any
 * other relation of the output with `x`.
 *
 * This only proves that the output value is in the range [0, 2^length), and so can be combined
 * with the initial value to prove a range check.
 */
function rangeCheckHelper(length: number, x: Field) {
  assert(
    length <= Fp.sizeInBits,
    `bit length must be ${Fp.sizeInBits} or less, got ${length}`
  );
  assert(length > 0, `bit length must be positive, got ${length}`);
  assert(length % 16 === 0, '`length` has to be a multiple of 16.');

  let lengthDiv16 = length / 16;
  if (x.isConstant()) {
    let bits = BinableFp.toBits(x.toBigInt())
      .slice(0, length)
      .concat(Array(Fp.sizeInBits - length).fill(false));
    return createField(BinableFp.fromBits(bits));
  }
  let y = Snarky.field.truncateToBits16(lengthDiv16, x.value);
  return createField(y);
}

/**
 * Asserts that x is in the range [0, 2^n)
 */
function rangeCheckN(n: number, x: Field, message: string = '') {
  assert(
    n <= Fp.sizeInBits,
    `bit length must be ${Fp.sizeInBits} or less, got ${n}`
  );
  assert(n > 0, `bit length must be positive, got ${n}`);
  assert(n % 16 === 0, '`length` has to be a multiple of 16.');

  if (x.isConstant()) {
    if (x.toBigInt() >= 1n << BigInt(n)) {
      throw Error(
        `rangeCheckN: expected field to fit in ${n} bits, got ${x}.\n${message}`
      );
    }
    return;
  }

  let actual = rangeCheckHelper(n, x);
  actual.assertEquals(x, message);
}

/**
 * Returns a boolean which, being true, proves that x is in the range [0, 2^n).
 *
 * **Beware**: The output being false does **not** prove that x is not in the range [0, 2^n).
 * In other words, it can happen that this returns false even if x is in the range [0, 2^n).
 *
 * This should not be viewed as a standalone provable method but as an advanced helper function
 * for gadgets which need a weakened form of range check.
 */
function isDefinitelyInRangeN(n: number, x: Field) {
  assert(
    n <= Fp.sizeInBits,
    `bit length must be ${Fp.sizeInBits} or less, got ${n}`
  );
  assert(n > 0, `bit length must be positive, got ${n}`);
  assert(n % 16 === 0, '`length` has to be a multiple of 16.');

  if (x.isConstant()) {
    return createBool(x.toBigInt() < 1n << BigInt(n));
  }

  let actual = rangeCheckHelper(n, x);
  return actual.equals(x);
}

function rangeCheck16(x: Field) {
  if (x.isConstant()) {
    assert(
      x.toBigInt() < 1n << 16n,
      `rangeCheck16: expected field to fit in 16 bits, got ${x}`
    );
    return;
  }
  // check that x fits in 16 bits
  rangeCheckHelper(16, x).assertEquals(x);
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
  rangeCheckHelper(16, x).assertEquals(x);
  // check that 2^8 x fits in 16 bits
  let x256 = x.mul(1 << 8).seal();
  rangeCheckHelper(16, x256).assertEquals(x256);
}

function rangeCheckLessThan16(bits: number, x: Field) {
  assert(bits < 16, `bits must be less than 16, got ${bits}`);

  if (x.isConstant()) {
    assert(
      x.toBigInt() < 1n << BigInt(bits),
      `rangeCheckLessThan16: expected field to fit in ${bits} bits, got ${x}`
    );
    return;
  }

  // check that x fits in 16 bits
  rangeCheckHelper(16, x).assertEquals(x);
  // check that 2^(16 - bits)*x < 2^16, i.e. x < 2^bits
  let xM = x.mul(1 << (16 - bits)).seal();
  rangeCheckHelper(16, xM).assertEquals(xM);
}

function rangeCheckLessThan64(bits: number, x: Field) {
  assert(bits < 64, `bits must be less than 64, got ${bits}`);

  if (x.isConstant()) {
    assert(
      x.toBigInt() < 1n << BigInt(bits),
      `rangeCheckLessThan16: expected field to fit in ${bits} bits, got ${x}`
    );
    return;
  }

  // check that x fits in 64 bits
  rangeCheck64(x);
  // check that 2^(64 - bits)*x < 2^64, i.e. x < 2^bits
  let xM = x.mul(1 << (64 - bits)).seal();
  rangeCheck64(xM);
}
