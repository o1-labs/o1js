import { Provable } from '../provable.js';
import { Fp } from '../../../bindings/crypto/finite-field.js';
import { Field } from '../field.js';
import { Gates } from '../gates.js';
import { assert, divideWithRemainder, toVar, bitSlice } from './common.js';
import { rangeCheck32, rangeCheck64 } from './range-check.js';
import { divMod32 } from './arithmetic.js';
import { exists } from '../../provable/core/exists.js';

export {
  xor,
  not,
  rotate64,
  rotate32,
  and,
  or,
  rightShift64,
  leftShift64,
  leftShift32,
};

function not(a: Field, length: number, checked: boolean = false) {
  // Validate at 240 bits to ensure padLength (next multiple of 16) doesn't exceed 254 bits,
  // preventing potential underconstraint issues in the circuit
  validateBitLength(length, 240, 'not');

  // obtain pad length until the length is a multiple of 16 for n-bit length lookup table
  let padLength = Math.ceil(length / 16) * 16;

  // handle constant case
  if (a.isConstant()) {
    let max = 1n << BigInt(padLength);
    assert(
      a.toBigInt() < max,
      `${a.toBigInt()} does not fit into ${padLength} bits`
    );
    return new Field(Fp.not(a.toBigInt(), length));
  }

  // create a bitmask with all ones
  let allOnes = new Field(2n ** BigInt(length) - 1n);

  if (checked) {
    return xor(a, allOnes, length);
  } else {
    return allOnes.sub(a).seal();
  }
}

function xor(a: Field, b: Field, length: number) {
  // Validate at 240 bits to ensure padLength (next multiple of 16) doesn't exceed 254 bits,
  // preventing potential underconstraint issues in the circuit
  validateBitLength(length, 240, 'xor');

  // obtain pad length until the length is a multiple of 16 for n-bit length lookup table
  let padLength = Math.ceil(length / 16) * 16;

  // handle constant case
  if (a.isConstant() && b.isConstant()) {
    let max = 1n << BigInt(padLength);

    assert(a.toBigInt() < max, `${a} does not fit into ${padLength} bits`);
    assert(b.toBigInt() < max, `${b} does not fit into ${padLength} bits`);

    return new Field(a.toBigInt() ^ b.toBigInt());
  }

  // calculate expected xor output
  let outputXor = Provable.witness(Field, () => a.toBigInt() ^ b.toBigInt());

  // builds the xor gadget chain
  buildXor(a, b, outputXor, padLength);

  // return the result of the xor operation
  return outputXor;
}

// builds a xor chain
function buildXor(a: Field, b: Field, out: Field, padLength: number) {
  // construct the chain of XORs until padLength is 0
  while (padLength !== 0) {
    // slices the inputs into 4x 4bit-sized chunks
    let slices = exists(15, () => {
      let a0 = a.toBigInt();
      let b0 = b.toBigInt();
      let out0 = out.toBigInt();
      return [
        // slices of a
        bitSlice(a0, 0, 4),
        bitSlice(a0, 4, 4),
        bitSlice(a0, 8, 4),
        bitSlice(a0, 12, 4),

        // slices of b
        bitSlice(b0, 0, 4),
        bitSlice(b0, 4, 4),
        bitSlice(b0, 8, 4),
        bitSlice(b0, 12, 4),

        // slices of expected output
        bitSlice(out0, 0, 4),
        bitSlice(out0, 4, 4),
        bitSlice(out0, 8, 4),
        bitSlice(out0, 12, 4),

        // next values
        a0 >> 16n,
        b0 >> 16n,
        out0 >> 16n,
      ];
    });

    // prettier-ignore
    let [
      in1_0, in1_1, in1_2, in1_3,
      in2_0, in2_1, in2_2, in2_3,
      out0, out1, out2, out3,
      aNext, bNext, outNext
    ] = slices;

    // assert that the xor of the slices is correct, 16 bit at a time
    // prettier-ignore
    Gates.xor(
      a, b, out,
      in1_0, in1_1, in1_2, in1_3,
      in2_0, in2_1, in2_2, in2_3,
      out0, out1, out2, out3
    );

    // update the values for the next loop iteration
    a = aNext;
    b = bNext;
    out = outNext;
    padLength = padLength - 16;
  }

  // inputs are zero and length is zero, add the zero check - we reached the end of our chain
  Gates.zero(a, b, out);

  let zero = new Field(0);
  zero.assertEquals(a);
  zero.assertEquals(b);
  zero.assertEquals(out);
}

function and(a: Field, b: Field, length: number) {
  // Validate at 240 bits to ensure padLength (next multiple of 16) doesn't exceed 254 bits,
  // preventing potential underconstraint issues in the circuit
  validateBitLength(length, 240, 'and');

  // obtain pad length until the length is a multiple of 16 for n-bit length lookup table
  let padLength = Math.ceil(length / 16) * 16;

  // handle constant case
  if (a.isConstant() && b.isConstant()) {
    let max = 1n << BigInt(padLength);

    assert(a.toBigInt() < max, `${a} does not fit into ${padLength} bits`);
    assert(b.toBigInt() < max, `${b} does not fit into ${padLength} bits`);

    return new Field(a.toBigInt() & b.toBigInt());
  }

  // calculate expect and output
  let outputAnd = Provable.witness(Field, () => a.toBigInt() & b.toBigInt());

  // compute values for gate
  // explanation: https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#and
  let sum = a.add(b);
  let xorOutput = xor(a, b, length);
  outputAnd.mul(2).add(xorOutput).assertEquals(sum);

  // return the result of the and operation
  return outputAnd;
}

function or(a: Field, b: Field, length: number) {
  return not(and(not(a, length), not(b, length), length), length);
}

function rotate64(
  field: Field,
  bits: number,
  direction: 'left' | 'right' = 'left'
) {
  // Check that the rotation bits are in range
  assert(
    bits >= 0 && bits <= 64,
    `rotation: expected bits to be between 0 and 64, got ${bits}`
  );

  if (field.isConstant()) {
    assert(
      field.toBigInt() < 1n << 64n,
      `rotation: expected field to be at most 64 bits, got ${field.toBigInt()}`
    );
    return new Field(Fp.rot(field.toBigInt(), BigInt(bits), direction));
  }
  const [rotated] = rot64(field, bits, direction);
  return rotated;
}

function rotate32(
  field: Field,
  bits: number,
  direction: 'left' | 'right' = 'left'
) {
  assert(bits <= 32 && bits > 0, 'bits must be between 0 and 32');

  if (field.isConstant()) {
    assert(
      field.toBigInt() < 1n << 32n,
      `rotation: expected field to be at most 32 bits, got ${field.toBigInt()}`
    );
    return new Field(Fp.rot(field.toBigInt(), BigInt(bits), direction, 32n));
  }

  let { quotient: excess, remainder: shifted } = divMod32(
    field.mul(1n << BigInt(direction === 'left' ? bits : 32 - bits))
  );

  let rotated = shifted.add(excess);

  rangeCheck32(rotated);

  return rotated;
}

function rot64(
  field: Field,
  bits: number,
  direction: 'left' | 'right' = 'left'
): [Field, Field, Field] {
  const rotationBits = direction === 'right' ? 64 - bits : bits;
  const big2Power64 = 1n << 64n;
  const big2PowerRot = 1n << BigInt(rotationBits);

  const [rotated, excess, shifted, bound] = Provable.witness(
    Provable.Array(Field, 4),
    () => {
      const f = field.toBigInt();

      // Obtain rotated output, excess, and shifted for the equation:
      // f * 2^rot = excess * 2^64 + shifted
      const { quotient: excess, remainder: shifted } = divideWithRemainder(
        f * big2PowerRot,
        big2Power64
      );

      // Compute rotated value as: rotated = excess + shifted
      const rotated = shifted + excess;
      // Compute bound to check excess < 2^rot
      const bound = excess + big2Power64 - big2PowerRot;
      return [rotated, excess, shifted, bound];
    }
  );

  // flush zero var to prevent broken gate chain (zero is used in rangeCheck64)
  // TODO this is an abstraction leak, but not clear to me how to improve
  toVar(0n);

  // slice the bound into chunks
  let boundSlices = exists(12, () => {
    let bound0 = bound.toBigInt();
    return [
      bitSlice(bound0, 52, 12), // bits 52-64
      bitSlice(bound0, 40, 12), // bits 40-52
      bitSlice(bound0, 28, 12), // bits 28-40
      bitSlice(bound0, 16, 12), // bits 16-28

      bitSlice(bound0, 14, 2), // bits 14-16
      bitSlice(bound0, 12, 2), // bits 12-14
      bitSlice(bound0, 10, 2), // bits 10-12
      bitSlice(bound0, 8, 2), // bits 8-10
      bitSlice(bound0, 6, 2), // bits 6-8
      bitSlice(bound0, 4, 2), // bits 4-6
      bitSlice(bound0, 2, 2), // bits 2-4
      bitSlice(bound0, 0, 2), // bits 0-2
    ];
  });
  let [b52, b40, b28, b16, b14, b12, b10, b8, b6, b4, b2, b0] = boundSlices;

  // Compute current row
  Gates.rotate(
    field,
    rotated,
    excess,
    [b52, b40, b28, b16],
    [b14, b12, b10, b8, b6, b4, b2, b0],
    big2PowerRot
  );
  // Compute next row
  rangeCheck64(shifted);
  // note: range-checking `shifted` and `field` is enough.
  // * excess < 2^rot follows from the bound check and the rotation equation in the gate
  // * rotated < 2^64 follows from rotated = excess + shifted (because shifted has to be a multiple of 2^rot)
  // for a proof, see https://github.com/o1-labs/o1js/pull/1201
  return [rotated, excess, shifted];
}

function rightShift64(field: Field, bits: number) {
  assert(
    bits >= 0 && bits <= 64,
    `rightShift: expected bits to be between 0 and 64, got ${bits}`
  );

  if (field.isConstant()) {
    assert(
      field.toBigInt() < 1n << 64n,
      `rightShift: expected field to be at most 64 bits, got ${field.toBigInt()}`
    );
    return new Field(Fp.rightShift(field.toBigInt(), bits));
  }
  const [, excess] = rot64(field, bits, 'right');
  return excess;
}

function leftShift64(field: Field, bits: number) {
  assert(
    bits >= 0 && bits <= 64,
    `rightShift: expected bits to be between 0 and 64, got ${bits}`
  );

  if (field.isConstant()) {
    assert(
      field.toBigInt() < 1n << 64n,
      `rightShift: expected field to be at most 64 bits, got ${field.toBigInt()}`
    );
    return new Field(Fp.leftShift(field.toBigInt(), bits));
  }
  const [, , shifted] = rot64(field, bits, 'left');
  return shifted;
}

function leftShift32(field: Field, bits: number) {
  let { remainder: shifted } = divMod32(field.mul(1n << BigInt(bits)));
  return shifted;
}

/**
 * Validates the bit length for bitwise operations.
 *
 * @param length - The input length to validate.
 * @param maxLength - The maximum allowed length.
 * @param functionName - The name of the calling function for error messages.
 *
 * @throws {Error} If the input length is not positive or exceeds the maximum length.
 */
function validateBitLength(
  length: number,
  maxLength: number,
  functionName: string
) {
  // check that both input lengths are positive
  assert(length > 0, `${functionName}: Input length must be a positive value.`);
  // check that length does not exceed maximum `maxLength` size in bits
  assert(
    length <= maxLength,
    `${functionName}: Length ${length} exceeds maximum of ${maxLength} bits.`
  );
}
