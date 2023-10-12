import { Field, toFp } from '../field.js';
import { Provable } from '../provable.js';
import { Field as Fp } from '../../provable/field-bigint.js';
import * as Gates from '../gates.js';

export { xor };

/**
 * Bitwise XOR gadget on {@link Field} elements. Equivalent to the [bitwise XOR `^` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR).
 * A XOR gate works by comparing two bits and returning `1` if two bits differ, and `0` if two bits are equal.
 *
 * The `length` parameter lets you define how many bits should be compared. By default it is set to `32`. The output is not constrained to the length.
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
 * let c = a.xor(b);    // ... 000110
 * c.assertEquals(6);
 * ```
 */
function xor(a: Field, b: Field, length: number, len_xor = 4) {
  // check that both input lengths are positive
  assert(
    length > 0 && len_xor > 0,
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
  if (length % (4 * len_xor) !== 0) {
    padLength = length + 4 * len_xor - (length % (4 * len_xor));
  }

  // recurisvely build xor gadget

  xorRec(a, b, outputXor, padLength, len_xor);
  // convert back to field
  return outputXor;
}

// builds xor chain recurisvely
function xorRec(
  a: Field,
  b: Field,
  outputXor: Field,
  padLength: number,
  len_xor: number
) {
  // if inputs are zero and length is zero, add the zero check
  if (padLength === 0) {
    Gates.zeroCheck(a, b, outputXor);

    let zero = new Field(0);
    zero.assertEquals(a);
    zero.assertEquals(b);
    zero.assertEquals(outputXor);
  } else {
    function ofBits(f: Field, start: number, stop: number) {
      if (stop !== -1 && stop <= start)
        throw Error('Stop offste must be greater than start offset');

      return Provable.witness(Field, () => fieldBitsToFieldLE(f, start, stop));
    }

    // nibble offsets
    let first = len_xor;
    let second = first + len_xor;
    let third = second + len_xor;
    let fourth = third + len_xor;

    let in1_0 = ofBits(a, 0, first);
    let in1_1 = ofBits(a, first, second);
    let in1_2 = ofBits(a, second, third);
    let in1_3 = ofBits(a, third, fourth);
    let in2_0 = ofBits(b, 0, first);
    let in2_1 = ofBits(b, first, second);
    let in2_2 = ofBits(b, second, third);
    let in2_3 = ofBits(b, third, fourth);
    let out_0 = ofBits(outputXor, 0, first);
    let out_1 = ofBits(outputXor, first, second);
    let out_2 = ofBits(outputXor, second, third);
    let out_3 = ofBits(outputXor, third, fourth);

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

    let next_in1 = asProverNextVar(a, in1_0, in1_1, in1_2, in1_3, len_xor);

    let next_in2 = asProverNextVar(b, in2_0, in2_1, in2_2, in2_3, len_xor);

    let next_out = asProverNextVar(
      outputXor,
      out_0,
      out_1,
      out_2,
      out_3,
      len_xor
    );

    let next_length = padLength - 4 * len_xor;
    xorRec(next_in1, next_in2, next_out, next_length, len_xor);
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

function fieldBitsToFieldLE(f: Field, start: number, stop: number) {
  if (stop !== -1 && stop <= start)
    throw Error('stop offset must be greater than start offset');

  let bits = f.toBits();

  if (stop > bits.length) throw Error('stop must be less than bit-length');

  if (stop === -1) stop = bits.length;

  return Field.fromBits(bits.slice(start, stop));
}

function asProverNextVar(
  current: Field,
  var0: Field,
  var1: Field,
  var2: Field,
  var3: Field,
  len_xor: number
) {
  let twoPowLen = new Field(2 ** len_xor);

  let twoPow2Len = twoPowLen.mul(twoPowLen);
  let twoPow3Len = twoPow2Len.mul(twoPowLen);
  let twoPow4Len = twoPow3Len.mul(twoPowLen);

  let nextVar = Provable.witness(Field, () => {
    return current
      .sub(var0)
      .sub(var1.mul(twoPowLen))
      .sub(var2.mul(twoPow2Len))
      .sub(var3.mul(twoPow3Len))
      .div(twoPow4Len);
  });

  return nextVar;
}
