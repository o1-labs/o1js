import { Provable } from '../provable.js';
import { Field as Fp } from '../../provable/field-bigint.js';
import { Field } from '../field.js';
import * as Gates from '../gates.js';

export { xor };

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

  // handle constant case
  if (a.isConstant() && b.isConstant()) {
    assert(
      a.toBigInt() < 2 ** length,
      `${a.toBigInt()} does not fit into ${length} bits`
    );

    assert(
      b.toBigInt() < 2 ** length,
      `${b.toBigInt()} does not fit into ${length} bits`
    );

    return new Field(Fp.xor(a.toBigInt(), b.toBigInt()));
  }

  // calculate expect xor output
  let outputXor = Provable.witness(
    Field,
    () => new Field(Fp.xor(a.toBigInt(), b.toBigInt()))
  );

  // obtain pad length until the length is a multiple of 4*n for n-bit length lookup table
  let l = 4 * lengthXor;
  let padLength = Math.ceil(length / l) * l;

  // recursively build xor gadget chain
  buildXor(a, b, outputXor, padLength, lengthXor);

  // return the result of the xor operation
  return outputXor;
}

// builds xor chain recursively
function buildXor(
  a: Field,
  b: Field,
  expectedOutput: Field,
  padLength: number,
  lengthXor: number
) {
  // if inputs are zero and length is zero, add the zero check
  if (padLength === 0) {
    Gates.zero(a, b, expectedOutput);

    let zero = new Field(0);
    zero.assertEquals(a);
    zero.assertEquals(b);
    zero.assertEquals(expectedOutput);
  } else {
    // lengthXor-sized offsets
    let first = lengthXor;
    let second = first + lengthXor;
    let third = second + lengthXor;
    let fourth = third + lengthXor;

    // slices of a
    let in1_0 = witnessSlices(a, 0, first);
    let in1_1 = witnessSlices(a, first, second);
    let in1_2 = witnessSlices(a, second, third);
    let in1_3 = witnessSlices(a, third, fourth);

    // slices of b
    let in2_0 = witnessSlices(b, 0, first);
    let in2_1 = witnessSlices(b, first, second);
    let in2_2 = witnessSlices(b, second, third);
    let in2_3 = witnessSlices(b, third, fourth);

    // slice of expected output
    let out0 = witnessSlices(expectedOutput, 0, first);
    let out1 = witnessSlices(expectedOutput, first, second);
    let out2 = witnessSlices(expectedOutput, second, third);
    let out3 = witnessSlices(expectedOutput, third, fourth);

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

    let nextIn1 = witnessNextValue(a, in1_0, in1_1, in1_2, in1_3, lengthXor);
    let nextIn2 = witnessNextValue(b, in2_0, in2_1, in2_2, in2_3, lengthXor);
    let nextExpectedOutput = witnessNextValue(
      expectedOutput,
      out0,
      out1,
      out2,
      out3,
      lengthXor
    );

    let next_length = padLength - 4 * lengthXor;
    buildXor(nextIn1, nextIn2, nextExpectedOutput, next_length, lengthXor);
  }
}

function assert(stmt: boolean, message?: string) {
  if (!stmt) {
    throw Error(message ?? 'Assertion failed');
  }
}

function witnessSlices(f: Field, start: number, stop = -1) {
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
