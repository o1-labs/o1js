import { Field } from '../field.js';
import { Provable } from '../provable.js';
import * as Gates from '../gates.js';

export { rot, rotate };

const MAX_BITS = 64 as const;

function rot(word: Field, bits: number, direction: 'left' | 'right' = 'left') {
  // Check that the rotation bits are in range
  if (bits < 0 || bits > MAX_BITS) {
    throw Error(`rot64: expected bits to be between 0 and 64, got ${bits}`);
  }

  // Check that the input word is at most 64 bits.
  Provable.asProver(() => {
    if (word.toBigInt() > 2 ** MAX_BITS) {
      throw Error(
        `rot: expected word to be at most 64 bits, got ${word.toBigInt()}`
      );
    }
  });

  // Compute rotated word
  const [rotated, excess, shifted, bound] = rotate(word, bits, direction);

  // Compute current row
  Gates.rot(
    word,
    rotated,
    excess,
    [
      witnessSlices(bound, 52, 64),
      witnessSlices(bound, 40, 52),
      witnessSlices(bound, 28, 40),
      witnessSlices(bound, 16, 28),
    ],
    [
      witnessSlices(bound, 14, 16),
      witnessSlices(bound, 12, 14),
      witnessSlices(bound, 10, 12),
      witnessSlices(bound, 8, 10),
      witnessSlices(bound, 6, 8),
      witnessSlices(bound, 4, 6),
      witnessSlices(bound, 2, 4),
      witnessSlices(bound, 0, 2),
    ],
    Field.from(2n ** 64n)
  );
  // Compute next row
  Gates.rangeCheck64(shifted);
  // Compute following row
  Gates.rangeCheck64(excess);
  return rotated;
}

function rotate(
  word: Field,
  bits: number,
  direction: 'left' | 'right' = 'left'
) {
  // Compute actual length depending on whether the rotation mode is "left" or "right"
  let rotationBits = bits;
  if (direction === 'right') {
    rotationBits = MAX_BITS - bits;
  }

  return Provable.witness(Provable.Array(Field, 4), () => {
    const wordBigInt = word.toBigInt();

    // Auxiliary BigInt values
    const big2Power64 = 2n ** 64n;
    const big2PowerRot = 2n ** BigInt(rotationBits);

    // Assert that the word is at most 64 bits.
    if (wordBigInt > big2Power64) {
      throw Error(
        `rot: expected word to be at most 64 bits, got ${word.toBigInt()}`
      );
    }

    // Obtain rotated output, excess, and shifted for the equation
    // word * 2^rot = excess * 2^64 + shifted
    const { quotient: excessBigInt, remainder: shiftedBigInt } = divRem(
      wordBigInt * big2PowerRot,
      big2Power64
    );

    // Compute rotated value as
    // rotated = excess + shifted
    const rotatedBig = shiftedBigInt + excessBigInt;

    // Compute bound that is the right input of FFAdd equation
    const boundBig = excessBigInt + big2Power64 - big2PowerRot;

    // Convert back to field
    const shifted = Field.from(shiftedBigInt);
    const excess = Field.from(excessBigInt);
    const rotated = Field.from(rotatedBig);
    const bound = Field.from(boundBig);

    return [rotated, excess, shifted, bound];
  });
}

function witnessSlices(f: Field, start: number, stop = -1) {
  if (stop !== -1 && stop <= start) {
    throw Error('stop must be greater than start');
  }

  return Provable.witness(Field, () => {
    let bits = f.toBits();
    if (stop > bits.length) {
      throw Error('stop must be less than bit-length');
    }
    if (stop === -1) {
      stop = bits.length;
    }

    return Field.fromBits(bits.slice(start, stop));
  });
}

function divRem(numerator: bigint, denominator: bigint) {
  const quotient = numerator / denominator;
  const remainder = numerator - denominator * quotient;
  return { quotient, remainder };
}
