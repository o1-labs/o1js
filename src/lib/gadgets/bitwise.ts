import { Provable } from '../provable.js';
import { Field as Fp } from '../../provable/field-bigint.js';
import { Field } from '../field.js';
import * as Gates from '../gates.js';

export { xor };

const LENGTH_XOR = 4;

function xor(a: Field, b: Field, length: number) {
  // check that both input lengths are positive
  assert(length > 0, `Input lengths need to be positive values.`);

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
  let l = 4 * LENGTH_XOR;
  let padLength = Math.ceil(length / l) * l;

  // recursively build xor gadget chain
  buildXor(a, b, outputXor, padLength);

  // return the result of the xor operation
  return outputXor;
}

// builds xor chain recursively
function buildXor(
  a: Field,
  b: Field,
  expectedOutput: Field,
  padLength: number
) {
  // 4 bit sized offsets
  let first = LENGTH_XOR;
  let second = first + LENGTH_XOR;
  let third = second + LENGTH_XOR;

  // construct the chain of XORs until padLength is 0
  while (padLength !== 0) {
    // slices the inputs into LENGTH_XOR-sized chunks
    // slices of a
    let in1_0 = witnessSlices(a, 0, LENGTH_XOR);
    let in1_1 = witnessSlices(a, first, LENGTH_XOR);
    let in1_2 = witnessSlices(a, second, LENGTH_XOR);
    let in1_3 = witnessSlices(a, third, LENGTH_XOR);

    // slices of b
    let in2_0 = witnessSlices(b, 0, LENGTH_XOR);
    let in2_1 = witnessSlices(b, first, LENGTH_XOR);
    let in2_2 = witnessSlices(b, second, LENGTH_XOR);
    let in2_3 = witnessSlices(b, third, LENGTH_XOR);

    // slice of expected output
    let out0 = witnessSlices(expectedOutput, 0, LENGTH_XOR);
    let out1 = witnessSlices(expectedOutput, first, LENGTH_XOR);
    let out2 = witnessSlices(expectedOutput, second, LENGTH_XOR);
    let out3 = witnessSlices(expectedOutput, third, LENGTH_XOR);

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
    padLength = padLength - 4 * LENGTH_XOR;
  }

  // inputs are zero and length is zero, add the zero check - we reached the end of our chain
  Gates.zero(a, b, expectedOutput);

  let zero = new Field(0);
  zero.assertEquals(a);
  zero.assertEquals(b);
  zero.assertEquals(expectedOutput);
}

function assert(stmt: boolean, message?: string) {
  if (!stmt) {
    throw Error(message ?? 'Assertion failed');
  }
}

function witnessSlices(f: Field, start: number, length: number) {
  if (length <= 0) throw Error('Length must be a positive number');

  return Provable.witness(Field, () => {
    let n = f.toBigInt();
    return new Field((n >> BigInt(start)) & ((1n << BigInt(length)) - 1n));
  });
}

function witnessNextValue(current: Field) {
  return Provable.witness(Field, () => new Field(current.toBigInt() >> 16n));
}
