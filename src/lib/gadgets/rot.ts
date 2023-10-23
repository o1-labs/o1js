import { Field } from '../field.js';
import { Provable } from '../provable.js';
import { Fp } from '../../bindings/crypto/finite_field.js';
import * as Gates from '../gates.js';

export { rot, rotate };

const MAX_BITS = 64 as const;

function rot(field: Field, bits: number, direction: 'left' | 'right' = 'left') {
  // Check that the rotation bits are in range
  if (bits < 0 || bits > MAX_BITS) {
    throw Error(`rot: expected bits to be between 0 and 64, got ${bits}`);
  }

  if (direction !== 'left' && direction !== 'right') {
    throw Error(
      `rot: expected direction to be 'left' or 'right', got ${direction}`
    );
  }

  if (field.isConstant()) {
    checkMaxBits(field);
    return new Field(Fp.rot(field.toBigInt(), bits, direction));
  }
  const [rotated] = rotate(field, bits, direction);
  return rotated;
}

function rotate(
  field: Field,
  bits: number,
  direction: 'left' | 'right' = 'left'
): [Field, Field, Field] {
  // Check as the prover, that the input is at most 64 bits.
  Provable.asProver(() => {
    checkMaxBits(field);
  });

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

      // Compute rotated value as:
      // rotated = excess + shifted
      const rotated = shifted + excess;
      // Compute bound that is the right input of FFAdd equation
      const bound = excess + big2Power64 - big2PowerRot;
      return [rotated, excess, shifted, bound].map(Field.from);
    }
  );

  // Compute current row
  Gates.rot(
    field,
    rotated,
    excess,
    [
      witnessSlices(bound, 52, 12), // bits 52-64
      witnessSlices(bound, 40, 12), // bits 40-52
      witnessSlices(bound, 28, 12), // bits 28-40
      witnessSlices(bound, 16, 12), // bits 16-28
    ],
    [
      witnessSlices(bound, 14, 2), // bits 14-16
      witnessSlices(bound, 12, 2), // bits 12-14
      witnessSlices(bound, 10, 2), // bits 10-12
      witnessSlices(bound, 8, 2), // bits 8-10
      witnessSlices(bound, 6, 2), // bits 6-8
      witnessSlices(bound, 4, 2), // bits 4-6
      witnessSlices(bound, 2, 2), // bits 2-4
      witnessSlices(bound, 0, 2), // bits 0-2
    ],
    Field.from(big2PowerRot)
  );
  // Compute next row
  Gates.rangeCheck64(shifted);
  // Compute following row
  Gates.rangeCheck64(excess);
  Gates.rangeCheck64(field);
  return [rotated, excess, shifted];
}

function checkMaxBits(x: Field) {
  if (x.toBigInt() > BigInt(2 ** MAX_BITS)) {
    throw Error(
      `rot: expected field to be at most 64 bits, got ${x.toBigInt()}`
    );
  }
}

// TODO: move to utils once https://github.com/o1-labs/o1js/pull/1177 is merged
function witnessSlices(f: Field, start: number, length: number) {
  if (length <= 0) throw Error('Length must be a positive number');
  return Provable.witness(Field, () => {
    let mask = (1n << BigInt(length)) - 1n;
    let n = f.toBigInt();
    return new Field((n >> BigInt(start)) & mask);
  });
}

function divideWithRemainder(numerator: bigint, denominator: bigint) {
  const quotient = numerator / denominator;
  const remainder = numerator - denominator * quotient;
  return { quotient, remainder };
}
