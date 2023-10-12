import { Field, toFp } from '../field.js';
import { Provable } from '../provable.js';
import { Field as Fp } from '../../provable/field-bigint.js';
import * as Gates from '../gates.js';

export { xor };

/**
 * Bitwise XOR gadget on {@link Field} elements. Equivalent to the [bitwise XOR `^` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR).
 * A XOR gate works by comparing two bits and returning `1` if two bits differ, and `0` if two bits are equal.
 *
 * The `length` parameter lets you define how many bits should be compared. The output is not constrained to the length.
 *
 * **Note:** Specifying a larger `length` parameter adds additional constraints.
 *
 * **Note:** Both {@link Field} elements need to fit into `2^length - 1`, or the operation will fail.
 * For example, for `length = 2` ( 2² = 4), `.xor` will fail for any element that is larger than `> 3`.
 *
 * ```typescript
 * let a = Field(5);    // ... 000101
 * let b = Field(3);    // ... 000011
 *
 * let c = xor(a, b, 2);    // ... 000110
 * c.assertEquals(6);
 * ```
 */
function xor(a: Field, b: Field, length: number, lengthXor = 4) {
  // check that both input lengths are positive
  assert(
    length > 0 && lengthXor > 0,
    `Input lengths need to be positive values.`
  );

  // check that length does not exceed maximum field size in bits
  assert(
    length <= Field.sizeInBits(),
    `Length ${length} exceeds maximum of ${Field.sizeInBits()} bits.`
  );

  // check that both elements fit into length bits as prover
  fitsInBits(a, length);
  fitsInBits(b, length);

  // handle constant case
  if (a.isConstant() && b.isConstant()) {
    return new Field(Fp.xor(a.toBigInt(), b.toBigInt()));
  }

  let outputXor = Provable.witness(
    Field,
    () => new Field(Fp.xor(a.toBigInt(), b.toBigInt()))
  );

  // Obtain pad length until the length is a multiple of 4*n for n-bit length lookup table
  let padLength = length;
  if (length % (4 * lengthXor) !== 0) {
    padLength = length + 4 * lengthXor - (length % (4 * lengthXor));
  }

  // recursively build xor gadget
  buildXor(a, b, outputXor, padLength, lengthXor);

  return outputXor;
}

// builds xor chain recursively
function buildXor(
  a: Field,
  b: Field,
  outputXor: Field,
  padLength: number,
  lengthXor: number
) {
  // if inputs are zero and length is zero, add the zero check
  if (padLength === 0) {
    Gates.zeroCheck(a, b, outputXor);

    let zero = new Field(0);
    zero.assertEquals(a);
    zero.assertEquals(b);
    zero.assertEquals(outputXor);
  } else {
    // nibble offsets
    let first = lengthXor;
    let second = first + lengthXor;
    let third = second + lengthXor;
    let fourth = third + lengthXor;

    let in1_0 = sliceBits(a, 0, first);
    let in1_1 = sliceBits(a, first, second);
    let in1_2 = sliceBits(a, second, third);
    let in1_3 = sliceBits(a, third, fourth);
    let in2_0 = sliceBits(b, 0, first);
    let in2_1 = sliceBits(b, first, second);
    let in2_2 = sliceBits(b, second, third);
    let in2_3 = sliceBits(b, third, fourth);
    let out_0 = sliceBits(outputXor, 0, first);
    let out_1 = sliceBits(outputXor, first, second);
    let out_2 = sliceBits(outputXor, second, third);
    let out_3 = sliceBits(outputXor, third, fourth);

    Gates.xor(
      a,
      b,
      outputXor,
      in1_0,
      in1_1,
      in1_2,
      in1_3,
      in2_0,
      in2_1,
      in2_2,
      in2_3,
      out_0,
      out_1,
      out_2,
      out_3
    );

    let nextIn1 = witnessNextValue(a, in1_0, in1_1, in1_2, in1_3, lengthXor);
    let nextIn2 = witnessNextValue(b, in2_0, in2_1, in2_2, in2_3, lengthXor);
    let nextOut = witnessNextValue(
      outputXor,
      out_0,
      out_1,
      out_2,
      out_3,
      lengthXor
    );

    let next_length = padLength - 4 * lengthXor;
    buildXor(nextIn1, nextIn2, nextOut, next_length, lengthXor);
  }
}

function assert(stmt: boolean, message?: string) {
  if (!stmt) {
    throw Error(message ?? 'Assertion failed');
  }
}

function fitsInBits(word: Field, length: number) {
  Provable.asProver(() => {
    assert(
      word.toBigInt() < 2 ** length,
      `${word.toBigInt()} does not fit into ${length} bits`
    );
  });
}

function sliceBits(f: Field, start: number, stop = -1) {
  if (stop !== -1 && stop <= start)
    throw Error('stop offset must be greater than start offset');

  return Provable.witness(Field, () => {
    let bits = f.toBits();
    if (stop > bits.length) throw Error('stop must be less than bit-length');
    if (stop === -1) stop = bits.length;

    return Field.fromBits(bits.slice(start, stop));
  });
}

function witnessNextValue(
  current: Field,
  var0: Field,
  var1: Field,
  var2: Field,
  var3: Field,
  lenXor: number
) {
  return Provable.witness(Field, () => {
    let twoPowLen = new Field(2 ** lenXor);
    let twoPow2Len = twoPowLen.mul(twoPowLen);
    let twoPow3Len = twoPow2Len.mul(twoPowLen);
    let twoPow4Len = twoPow3Len.mul(twoPowLen);

    return current
      .sub(var0)
      .sub(var1.mul(twoPowLen))
      .sub(var2.mul(twoPow2Len))
      .sub(var3.mul(twoPow3Len))
      .div(twoPow4Len);
  });
}
