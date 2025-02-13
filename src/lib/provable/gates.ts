import { Snarky } from '../../snarky.js';
import type { Field } from './field.js';
import { FieldVar, FieldConst } from './core/fieldvar.js';
import { MlArray, MlTuple } from '../ml/base.js';
import { exists } from './core/exists.js';
import { TupleN } from '../util/types.js';

export {
  Gates,
  rangeCheck0,
  rangeCheck1,
  xor,
  zero,
  rotate,
  generic,
  lookup,
  foreignFieldAdd,
  foreignFieldMul,
  KimchiGateType,
};

export { fieldVar };

const Gates = {
  rangeCheck0,
  rangeCheck1,
  xor,
  zero,
  rotate,
  generic,
  lookup,
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
function rangeCheck1(v2: Field, v12: Field, vCurr: TupleN<Field, 13>, vNext: TupleN<Field, 15>) {
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
    left: bigint | FieldConst;
    right: bigint | FieldConst;
    out: bigint | FieldConst;
    mul: bigint | FieldConst;
    const: bigint | FieldConst;
  },
  inputs: {
    left: Field | FieldVar;
    right: Field | FieldVar;
    out: Field | FieldVar;
  }
) {
  Snarky.gates.generic(
    fieldConst(coefficients.left),
    fieldVar(inputs.left),
    fieldConst(coefficients.right),
    fieldVar(inputs.right),
    fieldConst(coefficients.out),
    fieldVar(inputs.out),
    fieldConst(coefficients.mul),
    fieldConst(coefficients.const)
  );
}

/**
 * **[lookup constraint](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=lookup%20gate#lookup)**
 *
 * Lookups allow you to check if a single value, or a series of values, are part of a table. The first case is useful to check for checking if a value belongs to a range (from 0 to 1,000, for example), whereas the second case is useful to check truth tables (for example, checking that three values can be found in the rows of an XOR table) or write and read from a memory vector (where one column is an index, and the other is the value stored at that index).
 *
 * @param tableId the [id](https://github.com/o1-labs/proof-systems/blob/master/kimchi/src/circuits/lookup/tables/mod.rs) of the lookup table.
 * @param index0 the index of the first value to lookup.
 * @param value0 the first value to lookup.
 * @param index1 the index of the second value to lookup.
 * @param value1 the second value to lookup.
 * @param index2 the index of the third value to lookup.
 * @param value2 the third value to lookup.
 *
 */
function lookup(
  tableId: Field,
  index0: Field,
  value0: Field,
  index1: Field,
  value1: Field,
  index2: Field,
  value2: Field
) {
  Snarky.gates.lookup([
    0,
    tableId.value,
    index0.value,
    value0.value,
    index1.value,
    value1.value,
    index2.value,
    value2.value,
  ]);
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

// helper

function fieldVar(x: Field | FieldVar | bigint): FieldVar {
  if (typeof x === 'bigint') return FieldVar.constant(x);
  return Array.isArray(x) ? x : x.value;
}
function fieldConst(x: bigint | FieldConst): FieldConst {
  return typeof x === 'bigint' ? FieldConst.fromBigint(x) : x;
}
