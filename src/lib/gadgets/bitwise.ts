import { Provable } from '../provable.js';
import { Field as Fp } from '../../provable/field-bigint.js';
import { Field } from '../field.js';
import * as Gates from '../gates.js';

export { xor };

// XOR specific constants
const LENGTH_XOR = 4;

const twoPowLen = new Field(2 ** LENGTH_XOR);
const twoPow2Len = twoPowLen.mul(twoPowLen);
const twoPow3Len = twoPow2Len.mul(twoPowLen);
const twoPow4Len = twoPow3Len.mul(twoPowLen);

// 4 bit sized offsets
const firstOffset = LENGTH_XOR;
const secondOffset = firstOffset + LENGTH_XOR;
const thirdOffset = secondOffset + LENGTH_XOR;

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
  let iterations = Math.ceil(padLength / (4 * LENGTH_XOR));

  // pre compute all inputs for the xor chain
  let precomputed = computeChainInputs(iterations, a, b, expectedOutput);

  // for each iteration of the xor chain, take the precomputed inputs and assert that the xor operation of the slices is correct
  precomputed.inputs.forEach(
    (
      {
        a,
        b,
        expectedOutput,
        in1: [in1_0, in1_1, in1_2, in1_3],
        in2: [in2_0, in2_1, in2_2, in2_3],
        out: [out0, out1, out2, out3],
      },
      n
    ) => {
      // assert that xor of the slices is correct, 16 bit at a time
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

      // if we reached the end of our chain, assert that the final inputs are zero and add a zero gate
      if (n === iterations - 1) {
        // final values for a, b and output - the end of the XOR chain - which should be zero
        let { finalA, finalB, finalOutput } = precomputed;

        Gates.zero(finalA, finalB, finalOutput);
        let zero = new Field(0);
        zero.assertEquals(finalA);
        zero.assertEquals(finalB);
        zero.assertEquals(finalOutput);
      }
    }
  );
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

function computeChainInputs(
  iterations: number,
  a: Field,
  b: Field,
  expectedOutput: Field
) {
  let inputs = [];

  for (let i = 0; i < iterations; i++) {
    // slices the inputs into LENGTH_XOR-sized chunks
    // slices of a
    let in1_0 = witnessSlices(a, 0, LENGTH_XOR);
    let in1_1 = witnessSlices(a, firstOffset, LENGTH_XOR);
    let in1_2 = witnessSlices(a, secondOffset, LENGTH_XOR);
    let in1_3 = witnessSlices(a, thirdOffset, LENGTH_XOR);

    // slices of b
    let in2_0 = witnessSlices(b, 0, LENGTH_XOR);
    let in2_1 = witnessSlices(b, firstOffset, LENGTH_XOR);
    let in2_2 = witnessSlices(b, secondOffset, LENGTH_XOR);
    let in2_3 = witnessSlices(b, thirdOffset, LENGTH_XOR);

    // slice of expected output
    let out0 = witnessSlices(expectedOutput, 0, LENGTH_XOR);
    let out1 = witnessSlices(expectedOutput, firstOffset, LENGTH_XOR);
    let out2 = witnessSlices(expectedOutput, secondOffset, LENGTH_XOR);
    let out3 = witnessSlices(expectedOutput, thirdOffset, LENGTH_XOR);

    // store all inputs for the current iteration of the XOR chain
    inputs[i] = {
      a,
      b,
      expectedOutput,
      in1: [in1_0, in1_1, in1_2, in1_3],
      in2: [in2_0, in2_1, in2_2, in2_3],
      out: [out0, out1, out2, out3],
    };

    // update the values for the next loop iteration - seal them to force snarky to compute the constraints directly
    a = calculateNextValue(a, in1_0, in1_1, in1_2, in1_3).seal();
    b = calculateNextValue(b, in2_0, in2_1, in2_2, in2_3).seal();
    expectedOutput = calculateNextValue(
      expectedOutput,
      out0,
      out1,
      out2,
      out3
    ).seal();
  }

  // we return the precomputed inputs to the XOR chain and the final values of a, b and output for the final zero gate and zero assertion check
  return { inputs, finalA: a, finalB: b, finalOutput: expectedOutput };
}

function calculateNextValue(
  current: Field,
  var0: Field,
  var1: Field,
  var2: Field,
  var3: Field
) {
  return current
    .sub(var0)
    .sub(var1.mul(twoPowLen))
    .sub(var2.mul(twoPow2Len))
    .sub(var3.mul(twoPow3Len))
    .div(twoPow4Len);
}
