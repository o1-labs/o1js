import { Snarky } from '../snarky.js';
import { FieldConst, type Field } from './field.js';
import { exists } from './gadgets/common.js';
import { MlArray, MlTuple } from './ml/base.js';
import { TupleN } from './util/types.js';

export {
  Gates,
  rangeCheck0,
  rangeCheck1,
  xor,
  zero,
  rotate,
  generic,
  foreignFieldAdd,
  foreignFieldMul,
  KimchiGateType,
  KimchiGateTypeString,
  gateTypeToString,
};

const Gates = {
  rangeCheck0,
  rangeCheck1,
  xor,
  zero,
  rotate,
  generic,
  foreignFieldAdd,
  foreignFieldMul,
  raw,
};

function rangeCheck0(
  x: Field,
  xLimbs12: TupleN<Field, 6>,
  xLimbs2: TupleN<Field, 8>,
  isCompact: boolean
) {
  Snarky.gates.rangeCheck0(
    x.value,
    MlTuple.mapTo(xLimbs12, (x) => x.value),
    MlTuple.mapTo(xLimbs2, (x) => x.value),
    isCompact ? FieldConst[1] : FieldConst[0]
  );
}

/**
 * the rangeCheck1 gate is used in combination with the rangeCheck0,
 * for doing a 3x88-bit range check
 */
function rangeCheck1(
  v2: Field,
  v12: Field,
  vCurr: TupleN<Field, 13>,
  vNext: TupleN<Field, 15>
) {
  Snarky.gates.rangeCheck1(
    v2.value,
    v12.value,
    MlTuple.mapTo(vCurr, (x) => x.value),
    MlTuple.mapTo(vNext, (x) => x.value)
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
  raw(KimchiGateType.Zero, [a, b, c], []);
}

/**
 * bigint addition which allows for field overflow and carry
 *
 * - `l01 + sign*r01 - overflow*f01 - carry*2^2l === r01`
 * - `l2  + sign*r2  - overflow*f2  + carry      === r2`
 * - overflow is 0 or sign
 * - carry is 0, 1 or -1
 *
 * assumes that the result is placed in the first 3 cells of the next row!
 */
function foreignFieldAdd({
  left,
  right,
  overflow,
  carry,
  modulus,
  sign,
}: {
  left: TupleN<Field, 3>;
  right: TupleN<Field, 3>;
  overflow: Field;
  carry: Field;
  modulus: TupleN<bigint, 3>;
  sign: 1n | -1n;
}) {
  Snarky.gates.foreignFieldAdd(
    MlTuple.mapTo(left, (x) => x.value),
    MlTuple.mapTo(right, (x) => x.value),
    overflow.value,
    carry.value,
    MlTuple.mapTo(modulus, FieldConst.fromBigint),
    FieldConst.fromBigint(sign)
  );
}

/**
 * Foreign field multiplication
 */
function foreignFieldMul(inputs: {
  left: TupleN<Field, 3>;
  right: TupleN<Field, 3>;
  remainder: TupleN<Field, 2>;
  quotient: TupleN<Field, 3>;
  quotientHiBound: Field;
  product1: TupleN<Field, 3>;
  carry0: Field;
  carry1p: TupleN<Field, 7>;
  carry1c: TupleN<Field, 4>;
  foreignFieldModulus2: bigint;
  negForeignFieldModulus: TupleN<bigint, 3>;
}) {
  let {
    left,
    right,
    remainder,
    quotient,
    quotientHiBound,
    product1,
    carry0,
    carry1p,
    carry1c,
    foreignFieldModulus2,
    negForeignFieldModulus,
  } = inputs;

  Snarky.gates.foreignFieldMul(
    MlTuple.mapTo(left, (x) => x.value),
    MlTuple.mapTo(right, (x) => x.value),
    MlTuple.mapTo(remainder, (x) => x.value),
    MlTuple.mapTo(quotient, (x) => x.value),
    quotientHiBound.value,
    MlTuple.mapTo(product1, (x) => x.value),
    carry0.value,
    MlTuple.mapTo(carry1p, (x) => x.value),
    MlTuple.mapTo(carry1c, (x) => x.value),
    FieldConst.fromBigint(foreignFieldModulus2),
    MlTuple.mapTo(negForeignFieldModulus, FieldConst.fromBigint)
  );
}

function raw(kind: KimchiGateType, values: Field[], coefficients: bigint[]) {
  let n = values.length;
  let padding = exists(15 - n, () => Array(15 - n).fill(0n));
  Snarky.gates.raw(
    kind,
    MlArray.to(values.concat(padding).map((x) => x.value)),
    MlArray.to(coefficients.map(FieldConst.fromBigint))
  );
}

enum KimchiGateType {
  Zero,
  Generic,
  Poseidon,
  CompleteAdd,
  VarBaseMul,
  EndoMul,
  EndoMulScalar,
  Lookup,
  CairoClaim,
  CairoInstruction,
  CairoFlags,
  CairoTransition,
  RangeCheck0,
  RangeCheck1,
  ForeignFieldAdd,
  ForeignFieldMul,
  Xor16,
  Rot64,
}

function gateTypeToString(gate: KimchiGateType) {
  return KimchiGateTypeToString[gate];
}

type KimchiGateTypeString =
  (typeof KimchiGateTypeToString)[keyof typeof KimchiGateTypeToString];

const KimchiGateTypeToString = {
  [KimchiGateType.Zero]: 'Zero',
  [KimchiGateType.Generic]: 'Generic',
  [KimchiGateType.Poseidon]: 'Poseidon',
  [KimchiGateType.CompleteAdd]: 'CompleteAdd',
  [KimchiGateType.VarBaseMul]: 'VarBaseMul',
  [KimchiGateType.EndoMul]: 'EndoMul',
  [KimchiGateType.EndoMulScalar]: 'EndoMulScalar',
  [KimchiGateType.Lookup]: 'Lookup',
  [KimchiGateType.CairoClaim]: 'CairoClaim',
  [KimchiGateType.CairoInstruction]: 'CairoInstruction',
  [KimchiGateType.CairoFlags]: 'CairoFlags',
  [KimchiGateType.CairoTransition]: 'CairoTransition',
  [KimchiGateType.RangeCheck0]: 'RangeCheck0',
  [KimchiGateType.RangeCheck1]: 'RangeCheck1',
  [KimchiGateType.ForeignFieldAdd]: 'ForeignFieldAdd',
  [KimchiGateType.ForeignFieldMul]: 'ForeignFieldMul',
  [KimchiGateType.Xor16]: 'Xor16',
  [KimchiGateType.Rot64]: 'Rot64',
} as const;
