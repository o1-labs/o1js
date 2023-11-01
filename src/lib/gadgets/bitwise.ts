import { Provable } from '../provable.js';
import { Field as Fp } from '../../provable/field-bigint.js';
import { Field } from '../field.js';
import * as Gates from '../gates.js';
import {
  MAX_BITS,
  assert,
  witnessSlice,
  witnessNextValue,
  divideWithRemainder,
} from './common.js';
import { rangeCheck64 } from './range-check.js';

export { xor, not, and, rotate };

function not(a: Field, length: number, checked: boolean = false) {
  // check that input length is positive
  assert(length > 0, `Input length needs to be positive values.`);

  // Check that length does not exceed maximum field size in bits
  assert(
    length <= Field.sizeInBits(),
    `Length ${length} exceeds maximum of ${Field.sizeInBits()} bits.`
  );

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
  let allOnesF = new Field(2n ** BigInt(length) - 1n);

  let allOnes = Provable.witness(Field, () => {
    return allOnesF;
  });

  allOnesF.assertEquals(allOnes);

  let notOutput = xor(a, allOnes, length);

  return notOutput;
}

function xor(a: Field, b: Field, length: number) {
  // check that both input lengths are positive
  assert(length > 0, `Input lengths need to be positive values.`);

  // check that length does not exceed maximum field size in bits
  assert(
    length <= Field.sizeInBits(),
    `Length ${length} exceeds maximum of ${Field.sizeInBits()} bits.`
  );

  // obtain pad length until the length is a multiple of 16 for n-bit length lookup table
  let padLength = Math.ceil(length / 16) * 16;

  // handle constant case
  if (a.isConstant() && b.isConstant()) {
    let max = 1n << BigInt(padLength);

    assert(
      a.toBigInt() < max,
      `${a.toBigInt()} does not fit into ${padLength} bits`
    );

    assert(
      b.toBigInt() < max,
      `${b.toBigInt()} does not fit into ${padLength} bits`
    );

    return new Field(a.toBigInt() ^ b.toBigInt());
  }

  // calculate expected xor output
  let outputXor = Provable.witness(
    Field,
    () => new Field(a.toBigInt() ^ b.toBigInt())
  );

  // builds the xor gadget chain
  buildXor(a, b, outputXor, padLength);

  // return the result of the xor operation
  return outputXor;
}

// builds a xor chain
function buildXor(
  a: Field,
  b: Field,
  expectedOutput: Field,
  padLength: number
) {
  // construct the chain of XORs until padLength is 0
  while (padLength !== 0) {
    // slices the inputs into 4x 4bit-sized chunks
    // slices of a
    let in1_0 = witnessSlice(a, 0, 4);
    let in1_1 = witnessSlice(a, 4, 4);
    let in1_2 = witnessSlice(a, 8, 4);
    let in1_3 = witnessSlice(a, 12, 4);

    // slices of b
    let in2_0 = witnessSlice(b, 0, 4);
    let in2_1 = witnessSlice(b, 4, 4);
    let in2_2 = witnessSlice(b, 8, 4);
    let in2_3 = witnessSlice(b, 12, 4);

    // slices of expected output
    let out0 = witnessSlice(expectedOutput, 0, 4);
    let out1 = witnessSlice(expectedOutput, 4, 4);
    let out2 = witnessSlice(expectedOutput, 8, 4);
    let out3 = witnessSlice(expectedOutput, 12, 4);

    // assert that the xor of the slices is correct, 16 bit at a time
    Gates.xor(
      a,
      b,
      expectedOutput,
      in1_0,
      in1_1,
      in1_2,
      in1_3,
      in2_0,
      in2_1,
      in2_2,
      in2_3,
      out0,
      out1,
      out2,
      out3
    );

    // update the values for the next loop iteration
    a = witnessNextValue(a);
    b = witnessNextValue(b);
    expectedOutput = witnessNextValue(expectedOutput);
    padLength = padLength - 16;
  }

  // inputs are zero and length is zero, add the zero check - we reached the end of our chain
  Gates.zero(a, b, expectedOutput);

  let zero = new Field(0);
  zero.assertEquals(a);
  zero.assertEquals(b);
  zero.assertEquals(expectedOutput);
}

function and(a: Field, b: Field, length: number) {
  // check that both input lengths are positive
  assert(length > 0, `Input lengths need to be positive values.`);

  // check that length does not exceed maximum field size in bits
  assert(
    length <= Field.sizeInBits(),
    `Length ${length} exceeds maximum of ${Field.sizeInBits()} bits.`
  );

  // obtain pad length until the length is a multiple of 16 for n-bit length lookup table
  let padLength = Math.ceil(length / 16) * 16;

  // handle constant case
  if (a.isConstant() && b.isConstant()) {
    let max = 1n << BigInt(padLength);

    assert(
      a.toBigInt() < max,
      `${a.toBigInt()} does not fit into ${padLength} bits`
    );

    assert(
      b.toBigInt() < max,
      `${b.toBigInt()} does not fit into ${padLength} bits`
    );

    return new Field(a.toBigInt() & b.toBigInt());
  }

  // calculate expect and output
  let outputAnd = Provable.witness(
    Field,
    () => new Field(a.toBigInt() & b.toBigInt())
  );

  // compute values for gate
  // explanation: https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#and
  let sum = a.add(b);
  let xorOutput = xor(a, b, length);
  outputAnd.mul(2).add(xorOutput).assertEquals(sum);

  // return the result of the and operation
  return outputAnd;
}

function rotate(
  field: Field,
  bits: number,
  direction: 'left' | 'right' = 'left'
) {
  // Check that the rotation bits are in range
  assert(
    bits >= 0 && bits <= MAX_BITS,
    `rotation: expected bits to be between 0 and 64, got ${bits}`
  );

  if (field.isConstant()) {
    assert(
      field.toBigInt() < 2n ** BigInt(MAX_BITS),
      `rotation: expected field to be at most 64 bits, got ${field.toBigInt()}`
    );
    return new Field(Fp.rot(field.toBigInt(), bits, direction));
  }
  const [rotated] = rot(field, bits, direction);
  return rotated;
}

function rot(
  field: Field,
  bits: number,
  direction: 'left' | 'right' = 'left'
): [Field, Field, Field] {
  const rotationBits = direction === 'right' ? MAX_BITS - bits : bits;
  const big2Power64 = 2n ** BigInt(MAX_BITS);
  const big2PowerRot = 2n ** BigInt(rotationBits);

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
      return [rotated, excess, shifted, bound].map(Field.from);
    }
  );

  // Compute current row
  Gates.rotate(
    field,
    rotated,
    excess,
    [
      witnessSlice(bound, 52, 12), // bits 52-64
      witnessSlice(bound, 40, 12), // bits 40-52
      witnessSlice(bound, 28, 12), // bits 28-40
      witnessSlice(bound, 16, 12), // bits 16-28
    ],
    [
      witnessSlice(bound, 14, 2), // bits 14-16
      witnessSlice(bound, 12, 2), // bits 12-14
      witnessSlice(bound, 10, 2), // bits 10-12
      witnessSlice(bound, 8, 2), // bits 8-10
      witnessSlice(bound, 6, 2), // bits 6-8
      witnessSlice(bound, 4, 2), // bits 4-6
      witnessSlice(bound, 2, 2), // bits 2-4
      witnessSlice(bound, 0, 2), // bits 0-2
    ],
    big2PowerRot
  );
  // Compute next row
  rangeCheck64(shifted);
  // Compute following row
  rangeCheck64(excess);
  return [rotated, excess, shifted];
}
