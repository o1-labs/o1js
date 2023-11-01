import { Provable } from '../provable.js';
import { Field, FieldConst } from '../field.js';
import * as Gates from '../gates.js';

export { xor, and };

function xor(a: Field, b: Field, length: number) {
  // check that both input lengths are positive
  assert(length > 0, `Input lengths need to be positive values.`);

  // check that length does not exceed maximum field size in bits
  assert(
    length <= Field.sizeInBits(),
    `Length ${length} exceeds maximum of ${Field.sizeInBits()} bits.`
  );

  // obtain pad length until the length is a multiple of 16 for n-bit length lookup table
  let l = 16;
  let padLength = Math.ceil(length / l) * l;

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

  // calculate expect xor output
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
    // slices the inputs 4 4bit-sized chunks
    // slices of a
    let in1_0 = witnessSlices(a, 0, 4);
    let in1_1 = witnessSlices(a, 4, 4);
    let in1_2 = witnessSlices(a, 8, 4);
    let in1_3 = witnessSlices(a, 12, 4);

    // slices of b
    let in2_0 = witnessSlices(b, 0, 4);
    let in2_1 = witnessSlices(b, 4, 4);
    let in2_2 = witnessSlices(b, 8, 4);
    let in2_3 = witnessSlices(b, 12, 4);

    // slice of expected output
    let out0 = witnessSlices(expectedOutput, 0, 4);
    let out1 = witnessSlices(expectedOutput, 4, 4);
    let out2 = witnessSlices(expectedOutput, 8, 4);
    let out3 = witnessSlices(expectedOutput, 12, 4);

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
  // explanation here: https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#and
  let sum = a.add(b);
  let xor_output = xor(a, b, length);
  let and_output = outputAnd;

  Gates.basic(
    FieldConst['1'],
    sum,
    FieldConst['-1'],
    xor_output,
    FieldConst.fromBigint(-2n),
    and_output,
    FieldConst['0'],
    FieldConst['0']
  );

  // return the result of the and operation
  return outputAnd;
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
