import { Snarky } from '../snarky.js';
import { FieldConst, type Field } from './field.js';
import { MlArray, MlTuple } from './ml/base.js';
import { TupleN } from './util/types.js';

export { rangeCheck0, rangeCheck1, xor, zero, rotate, generic };

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
  Snarky.gates.zero(a.value, b.value, c.value);
}

function lookup(id: Field, index: Field, value: Field) {
  Snarky.gates.lookup([id.value, index.value, value.value, index.value, value.value, index.value, value.value]);
}

function addFixedLookupTable(id: number, data: [[Field], [Field]]) {
  Snarky.gates.addFixedLookupTable(id, [data[0].map((x) => x.value), data[1].map((x) => x.value)]);
}

function addDynamicLookupTable(id: number, data: [Field]) {
  Snarky.gates.addRuntimeTableConfig(id, data.map((x) => x.value));
}
