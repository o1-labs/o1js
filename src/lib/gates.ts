import { Snarky } from '../snarky.js';
import { FieldVar, FieldConst, type Field } from './field.js';

export { rangeCheck64, xor, zeroCheck };

/**
 * Asserts that x is at most 64 bits
 */
function rangeCheck64(x: Field) {
  let [, x0, x2, x4, x6, x8, x10, x12, x14] = Snarky.exists(8, () => {
    let xx = x.toBigInt();
    // crumbs (2-bit limbs)
    return [
      0,
      getBits(xx, 0, 2),
      getBits(xx, 2, 2),
      getBits(xx, 4, 2),
      getBits(xx, 6, 2),
      getBits(xx, 8, 2),
      getBits(xx, 10, 2),
      getBits(xx, 12, 2),
      getBits(xx, 14, 2),
    ];
  });
  // 12-bit limbs
  let [, x16, x28, x40, x52] = Snarky.exists(4, () => {
    let xx = x.toBigInt();
    return [
      0,
      getBits(xx, 16, 12),
      getBits(xx, 28, 12),
      getBits(xx, 40, 12),
      getBits(xx, 52, 12),
    ];
  });
  Snarky.gates.rangeCheck0(
    x.value,
    [0, FieldVar[0], FieldVar[0], x52, x40, x28, x16],
    [0, x14, x12, x10, x8, x6, x4, x2, x0],
    // not using compact mode
    FieldConst[0]
  );
}

/**
 *
 */
function xor(
  input1: Field,
  input2: Field,
  outputXor: Field,
  in1_0: Field,
  in1_1: Field,
  in1_2: Field,
  in1_3: Field,
  in2_0: Field,
  in2_1: Field,
  in2_2: Field,
  in2_3: Field,
  out_0: Field,
  out_1: Field,
  out_2: Field,
  out_3: Field
) {
  console.log('XOR');
  Snarky.gates.xor(
    input1.value,
    input2.value,
    outputXor.value,
    in1_0.value,
    in1_1.value,
    in1_2.value,
    in1_3.value,
    in2_0.value,
    in2_1.value,
    in2_2.value,
    in2_3.value,
    out_0.value,
    out_1.value,
    out_2.value,
    out_3.value
  );
}

function zeroCheck(in1: Field, in2: Field, out: Field) {
  Snarky.gates.zeroCheck(in1.value, in2.value, out.value);
}

function getBits(x: bigint, start: number, length: number) {
  return FieldConst.fromBigint(
    (x >> BigInt(start)) & ((1n << BigInt(length)) - 1n)
  );
}
