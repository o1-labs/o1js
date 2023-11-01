import { Snarky } from '../snarky.js';
import { FieldVar, FieldConst, type Field } from './field.js';
import { MlArray } from './ml/base.js';

export { rangeCheck64, xor, zero, rotate, generic };

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

function rotate(
  field: Field,
  rotated: Field,
  excess: Field,
  limbs: [Field, Field, Field, Field],
  crumbs: [Field, Field, Field, Field, Field, Field, Field, Field],
  two_to_rot: bigint
) {
  Snarky.gates.rotate(
    field.value,
    rotated.value,
    excess.value,
    MlArray.to(limbs.map((x) => x.value)),
    MlArray.to(crumbs.map((x) => x.value)),
    FieldConst.fromBigint(two_to_rot)
  );
}

/**
 * Asserts that 16 bit limbs of input two elements are the correct XOR output
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
  out0: Field,
  out1: Field,
  out2: Field,
  out3: Field
) {
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
    out0.value,
    out1.value,
    out2.value,
    out3.value
  );
}

/**
 * [Generic gate](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=foreignfield#double-generic-gate)
 * The vanilla PLONK gate that allows us to do operations like:
 * * addition of two registers (into an output register)
 * * multiplication of two registers
 * * equality of a register with a constant
 *
 * More generally, the generic gate controls the coefficients (denoted `c_`) in the equation:
 *
 * `c_l*l + c_r*r + c_o*o + c_m*l*r + c_c === 0`
 */
function generic(
  coefficients: {
    left: bigint;
    right: bigint;
    out: bigint;
    mul: bigint;
    const: bigint;
  },
  inputs: { left: Field; right: Field; out: Field }
) {
  Snarky.gates.generic(
    FieldConst.fromBigint(coefficients.left),
    inputs.left.value,
    FieldConst.fromBigint(coefficients.right),
    inputs.right.value,
    FieldConst.fromBigint(coefficients.out),
    inputs.out.value,
    FieldConst.fromBigint(coefficients.mul),
    FieldConst.fromBigint(coefficients.const)
  );
}

function zero(a: Field, b: Field, c: Field) {
  Snarky.gates.zero(a.value, b.value, c.value);
}

function getBits(x: bigint, start: number, length: number) {
  return FieldConst.fromBigint(
    (x >> BigInt(start)) & ((1n << BigInt(length)) - 1n)
  );
}
