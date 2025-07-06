"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fieldVar = exports.addRuntimeTableConfig = exports.KimchiGateType = exports.foreignFieldMul = exports.foreignFieldAdd = exports.lookup = exports.generic = exports.rotate = exports.zero = exports.xor = exports.rangeCheck1 = exports.rangeCheck0 = exports.Gates = void 0;
const bindings_js_1 = require("../../bindings.js");
const fieldvar_js_1 = require("./core/fieldvar.js");
const base_js_1 = require("../ml/base.js");
const exists_js_1 = require("./core/exists.js");
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
    addRuntimeTableConfig,
};
exports.Gates = Gates;
function rangeCheck0(x, xLimbs12, xLimbs2, isCompact) {
    bindings_js_1.Snarky.gates.rangeCheck0(x.value, base_js_1.MlTuple.mapTo(xLimbs12, (x) => x.value), base_js_1.MlTuple.mapTo(xLimbs2, (x) => x.value), isCompact ? fieldvar_js_1.FieldConst[1] : fieldvar_js_1.FieldConst[0]);
}
exports.rangeCheck0 = rangeCheck0;
/**
 * the rangeCheck1 gate is used in combination with the rangeCheck0,
 * for doing a 3x88-bit range check
 */
function rangeCheck1(v2, v12, vCurr, vNext) {
    bindings_js_1.Snarky.gates.rangeCheck1(v2.value, v12.value, base_js_1.MlTuple.mapTo(vCurr, (x) => x.value), base_js_1.MlTuple.mapTo(vNext, (x) => x.value));
}
exports.rangeCheck1 = rangeCheck1;
function rotate(field, rotated, excess, limbs, crumbs, two_to_rot) {
    bindings_js_1.Snarky.gates.rotate(field.value, rotated.value, excess.value, base_js_1.MlArray.to(limbs.map((x) => x.value)), base_js_1.MlArray.to(crumbs.map((x) => x.value)), fieldvar_js_1.FieldConst.fromBigint(two_to_rot));
}
exports.rotate = rotate;
/**
 * Asserts that 16 bit limbs of input two elements are the correct XOR output
 */
function xor(input1, input2, outputXor, in1_0, in1_1, in1_2, in1_3, in2_0, in2_1, in2_2, in2_3, out0, out1, out2, out3) {
    bindings_js_1.Snarky.gates.xor(input1.value, input2.value, outputXor.value, in1_0.value, in1_1.value, in1_2.value, in1_3.value, in2_0.value, in2_1.value, in2_2.value, in2_3.value, out0.value, out1.value, out2.value, out3.value);
}
exports.xor = xor;
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
function generic(coefficients, inputs) {
    bindings_js_1.Snarky.gates.generic(fieldConst(coefficients.left), fieldVar(inputs.left), fieldConst(coefficients.right), fieldVar(inputs.right), fieldConst(coefficients.out), fieldVar(inputs.out), fieldConst(coefficients.mul), fieldConst(coefficients.const));
}
exports.generic = generic;
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
function lookup(tableId, index0, value0, index1, value1, index2, value2) {
    bindings_js_1.Snarky.gates.lookup([
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
exports.lookup = lookup;
function zero(a, b, c) {
    raw(KimchiGateType.Zero, [a, b, c], []);
}
exports.zero = zero;
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
function foreignFieldAdd({ left, right, overflow, carry, modulus, sign, }) {
    bindings_js_1.Snarky.gates.foreignFieldAdd(base_js_1.MlTuple.mapTo(left, (x) => x.value), base_js_1.MlTuple.mapTo(right, (x) => x.value), overflow.value, carry.value, base_js_1.MlTuple.mapTo(modulus, fieldvar_js_1.FieldConst.fromBigint), fieldvar_js_1.FieldConst.fromBigint(sign));
}
exports.foreignFieldAdd = foreignFieldAdd;
/**
 * Foreign field multiplication
 */
function foreignFieldMul(inputs) {
    let { left, right, remainder, quotient, quotientHiBound, product1, carry0, carry1p, carry1c, foreignFieldModulus2, negForeignFieldModulus, } = inputs;
    bindings_js_1.Snarky.gates.foreignFieldMul(base_js_1.MlTuple.mapTo(left, (x) => x.value), base_js_1.MlTuple.mapTo(right, (x) => x.value), base_js_1.MlTuple.mapTo(remainder, (x) => x.value), base_js_1.MlTuple.mapTo(quotient, (x) => x.value), quotientHiBound.value, base_js_1.MlTuple.mapTo(product1, (x) => x.value), carry0.value, base_js_1.MlTuple.mapTo(carry1p, (x) => x.value), base_js_1.MlTuple.mapTo(carry1c, (x) => x.value), fieldvar_js_1.FieldConst.fromBigint(foreignFieldModulus2), base_js_1.MlTuple.mapTo(negForeignFieldModulus, fieldvar_js_1.FieldConst.fromBigint));
}
exports.foreignFieldMul = foreignFieldMul;
function raw(kind, values, coefficients) {
    let n = values.length;
    let padding = (0, exists_js_1.exists)(15 - n, () => Array(15 - n).fill(0n));
    bindings_js_1.Snarky.gates.raw(kind, base_js_1.MlArray.to(values.concat(padding).map((x) => x.value)), base_js_1.MlArray.to(coefficients.map(fieldvar_js_1.FieldConst.fromBigint)));
}
/**
 * Configures a runtime table with identifier `id` and indices `firstColumn`.
 *
 * **Note**: id 0 and 1 are reserved values, do not use them.
 *
 * @param id
 * @param firstColumn
 */
function addRuntimeTableConfig(id, firstColumn) {
    bindings_js_1.Snarky.gates.addRuntimeTableConfig(id, base_js_1.MlArray.to(firstColumn.map((x) => fieldvar_js_1.FieldConst.fromBigint(x))));
}
exports.addRuntimeTableConfig = addRuntimeTableConfig;
var KimchiGateType;
(function (KimchiGateType) {
    KimchiGateType[KimchiGateType["Zero"] = 0] = "Zero";
    KimchiGateType[KimchiGateType["Generic"] = 1] = "Generic";
    KimchiGateType[KimchiGateType["Poseidon"] = 2] = "Poseidon";
    KimchiGateType[KimchiGateType["CompleteAdd"] = 3] = "CompleteAdd";
    KimchiGateType[KimchiGateType["VarBaseMul"] = 4] = "VarBaseMul";
    KimchiGateType[KimchiGateType["EndoMul"] = 5] = "EndoMul";
    KimchiGateType[KimchiGateType["EndoMulScalar"] = 6] = "EndoMulScalar";
    KimchiGateType[KimchiGateType["Lookup"] = 7] = "Lookup";
    KimchiGateType[KimchiGateType["CairoClaim"] = 8] = "CairoClaim";
    KimchiGateType[KimchiGateType["CairoInstruction"] = 9] = "CairoInstruction";
    KimchiGateType[KimchiGateType["CairoFlags"] = 10] = "CairoFlags";
    KimchiGateType[KimchiGateType["CairoTransition"] = 11] = "CairoTransition";
    KimchiGateType[KimchiGateType["RangeCheck0"] = 12] = "RangeCheck0";
    KimchiGateType[KimchiGateType["RangeCheck1"] = 13] = "RangeCheck1";
    KimchiGateType[KimchiGateType["ForeignFieldAdd"] = 14] = "ForeignFieldAdd";
    KimchiGateType[KimchiGateType["ForeignFieldMul"] = 15] = "ForeignFieldMul";
    KimchiGateType[KimchiGateType["Xor16"] = 16] = "Xor16";
    KimchiGateType[KimchiGateType["Rot64"] = 17] = "Rot64";
})(KimchiGateType || (exports.KimchiGateType = KimchiGateType = {}));
// helper
function fieldVar(x) {
    if (typeof x === 'bigint')
        return fieldvar_js_1.FieldVar.constant(x);
    return Array.isArray(x) ? x : x.value;
}
exports.fieldVar = fieldVar;
function fieldConst(x) {
    return typeof x === 'bigint' ? fieldvar_js_1.FieldConst.fromBigint(x) : x;
}
