"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertEqual = exports.assertBoolean = exports.assertSquare = exports.assertMul = void 0;
/**
 * Basic gadgets that only use generic gates, and are compatible with (create the same constraints as)
 * `plonk_constraint_system.ml` / R1CS_constraint_system.
 */
const finite_field_js_1 = require("../../../bindings/crypto/finite-field.js");
const fieldvar_js_1 = require("../core/fieldvar.js");
const common_js_1 = require("./common.js");
const gates_js_1 = require("../gates.js");
const basic_js_1 = require("./basic.js");
const bindings_js_1 = require("../../../bindings.js");
const bindings_js_2 = require("../../../bindings.js");
let { isVar, getVar, isConst, getConst } = basic_js_1.ScaledVar;
/**
 * Helper function to try reading a witness value from a variable
 * Returns null if the value cannot be read (e.g., during constraint generation)
 */
function tryReadWitnessValue(varRef) {
    try {
        // Try to read the witness value using the Snarky readVar function
        const result = bindings_js_1.Snarky.field.readVar(varRef);
        // Convert FieldConst to bigint if needed
        if (Array.isArray(result) && result.length >= 2 && result[0] === 0) {
            return result[1]; // Extract bigint from [0, bigint] format
        }
        return typeof result === 'bigint' ? result : null;
    }
    catch (error) {
        // Return null if reading fails (e.g., not in prover mode, value not available)
        return null;
    }
}
/**
 * Assert multiplication constraint, `x * y === z`
 */
function assertMulCompatible(x, y, z) {
    // this faithfully implements snarky's `assert_r1cs`,
    // see `R1CS_constraint_system.add_constraint` -> `Snarky_backendless.Constraint.R1CS`
    let xv = (0, basic_js_1.reduceToScaledVar)(x);
    let yv = (0, basic_js_1.reduceToScaledVar)(y);
    let zv = (0, basic_js_1.reduceToScaledVar)(z);
    // DIVISION BY ZERO DETECTION: Check for the pattern 0 * 0 = 1 from Field.inv()
    // This catches division by zero in witness context where the constraint system
    // might not immediately detect the impossible constraint
    if (isConst(xv) && isConst(yv) && isConst(zv)) {
        let [sx, sy, sz] = [getConst(xv), getConst(yv), getConst(zv)];
        // Special case: Check for division by zero pattern 0 * 0 = 1
        if (sx === 0n && sy === 0n && sz === 1n) {
            throw Error('Field.inv(): Division by zero');
        }
    }
    // Also check mixed cases where we have variables with witness values of 0
    // During witness generation, the actual values are available for checking
    if ((0, bindings_js_2.getCurrentBackend)() === 'sparky') {
        try {
            // Try to read witness values for division by zero detection
            let xValue = isConst(xv) ? getConst(xv) : (isVar(xv) ? tryReadWitnessValue(getVar(xv)[1]) : null);
            let yValue = isConst(yv) ? getConst(yv) : (isVar(yv) ? tryReadWitnessValue(getVar(yv)[1]) : null);
            let zValue = isConst(zv) ? getConst(zv) : (isVar(zv) ? tryReadWitnessValue(getVar(zv)[1]) : null);
            // Check for division by zero pattern with witness values
            if (xValue === 0n && yValue === 0n && zValue === 1n) {
                throw Error('Field.inv(): Division by zero');
            }
        }
        catch (e) {
            // Ignore errors from reading witness values - they might not be available
            // in all contexts (e.g., during constraint generation without witnesses)
        }
    }
    // three variables
    if (isVar(xv) && isVar(yv) && isVar(zv)) {
        let [[sx, x], [sy, y], [sz, z]] = [getVar(xv), getVar(yv), getVar(zv)];
        // -sx sy * x y + sz z = 0
        return gates_js_1.Gates.generic({ left: 0n, right: 0n, out: sz, mul: -sx * sy, const: 0n }, { left: x, right: y, out: z });
    }
    // two variables, one constant
    if (isVar(xv) && isVar(yv) && isConst(zv)) {
        let [[sx, x], [sy, y], sz] = [getVar(xv), getVar(yv), getConst(zv)];
        // sx sy * x y - sz = 0
        return gates_js_1.Gates.generic({ left: 0n, right: 0n, out: 0n, mul: sx * sy, const: -sz }, { left: x, right: y, out: (0, basic_js_1.emptyCell)() });
    }
    if (isVar(xv) && isConst(yv) && isVar(zv)) {
        let [[sx, x], sy, [sz, z]] = [getVar(xv), getConst(yv), getVar(zv)];
        // sx sy * x - sz z = 0
        return gates_js_1.Gates.generic({ left: sx * sy, right: 0n, out: -sz, mul: 0n, const: 0n }, { left: x, right: (0, basic_js_1.emptyCell)(), out: z });
    }
    if (isConst(xv) && isVar(yv) && isVar(zv)) {
        let [sx, [sy, y], [sz, z]] = [getConst(xv), getVar(yv), getVar(zv)];
        // sx sy * y - sz z = 0
        return gates_js_1.Gates.generic({ left: 0n, right: sx * sy, out: -sz, mul: 0n, const: 0n }, { left: (0, basic_js_1.emptyCell)(), right: y, out: z });
    }
    // two constants, one variable
    if (isVar(xv) && isConst(yv) && isConst(zv)) {
        let [[sx, x], sy, sz] = [getVar(xv), getConst(yv), getConst(zv)];
        // sx sy * x - sz = 0
        return gates_js_1.Gates.generic({ left: sx * sy, right: 0n, out: 0n, mul: 0n, const: -sz }, { left: x, right: (0, basic_js_1.emptyCell)(), out: (0, basic_js_1.emptyCell)() });
    }
    if (isConst(xv) && isVar(yv) && isConst(zv)) {
        let [sx, [sy, y], sz] = [getConst(xv), getVar(yv), getConst(zv)];
        // sx sy * y - sz = 0
        return gates_js_1.Gates.generic({ left: 0n, right: sx * sy, out: 0n, mul: 0n, const: -sz }, { left: (0, basic_js_1.emptyCell)(), right: y, out: (0, basic_js_1.emptyCell)() });
    }
    if (isConst(xv) && isConst(yv) && isVar(zv)) {
        let [sx, sy, [sz, z]] = [getConst(xv), getConst(yv), getVar(zv)];
        // sz z - sx sy = 0
        return gates_js_1.Gates.generic({ left: 0n, right: 0n, out: sz, mul: 0n, const: -sx * sy }, { left: (0, basic_js_1.emptyCell)(), right: (0, basic_js_1.emptyCell)(), out: z });
    }
    // three constants
    if (isConst(xv) && isConst(yv) && isConst(zv)) {
        let [sx, sy, sz] = [getConst(xv), getConst(yv), getConst(zv)];
        (0, common_js_1.assert)(finite_field_js_1.Fp.equal(finite_field_js_1.Fp.mul(sx, sy), sz), `assertMul(): ${sx} * ${sy} !== ${sz}`);
        return;
    }
    // sadly TS doesn't know that this was exhaustive
    (0, common_js_1.assert)(false, `assertMul(): unreachable`);
}
exports.assertMul = assertMulCompatible;
/**
 * Assert square, `x^2 === z`
 */
function assertSquareCompatible(x, z) {
    let xv = (0, basic_js_1.reduceToScaledVar)(x);
    let zv = (0, basic_js_1.reduceToScaledVar)(z);
    if (isVar(xv) && isVar(zv)) {
        let [[sx, x], [sz, z]] = [getVar(xv), getVar(zv)];
        // -sz * z + (sx)^2 * x*x = 0
        return gates_js_1.Gates.generic({ left: 0n, right: 0n, out: -sz, mul: sx ** 2n, const: 0n }, { left: x, right: x, out: z });
    }
    if (isVar(xv) && isConst(zv)) {
        let [[sx, x], sz] = [getVar(xv), getConst(zv)];
        // (sx)^2 * x*x - sz = 0
        return gates_js_1.Gates.generic({ left: 0n, right: 0n, out: 0n, mul: sx ** 2n, const: -sz }, { left: x, right: x, out: (0, basic_js_1.emptyCell)() });
    }
    if (isConst(xv) && isVar(zv)) {
        let [sx, [sz, z]] = [getConst(xv), getVar(zv)];
        // sz * z - (sx)^2 = 0
        return gates_js_1.Gates.generic({ left: 0n, right: 0n, out: sz, mul: 0n, const: -(sx ** 2n) }, { left: (0, basic_js_1.emptyCell)(), right: (0, basic_js_1.emptyCell)(), out: z });
    }
    if (isConst(xv) && isConst(zv)) {
        let [sx, sz] = [getConst(xv), getConst(zv)];
        (0, common_js_1.assert)(finite_field_js_1.Fp.equal(finite_field_js_1.Fp.square(sx), sz), `assertSquare(): ${sx}^2 !== ${sz}`);
        return;
    }
    // sadly TS doesn't know that this was exhaustive
    (0, common_js_1.assert)(false, `assertSquare(): unreachable`);
}
exports.assertSquare = assertSquareCompatible;
/**
 * Assert that x is either 0 or 1, `x^2 === x`
 */
function assertBooleanCompatible(x) {
    let xv = (0, basic_js_1.reduceToScaledVar)(x);
    if (isVar(xv)) {
        let [s, x] = getVar(xv);
        // -s*x + s^2 * x^2 = 0
        return gates_js_1.Gates.generic({ left: -s, right: 0n, out: 0n, mul: s ** 2n, const: 0n }, { left: x, right: x, out: (0, basic_js_1.emptyCell)() });
    }
    let x0 = getConst(xv);
    (0, common_js_1.assert)(finite_field_js_1.Fp.equal(finite_field_js_1.Fp.square(x0), x0), `assertBoolean(): ${x} is not 0 or 1`);
}
exports.assertBoolean = assertBooleanCompatible;
/**
 * Assert equality, `x === y`
 */
function assertEqualCompatible(x, y) {
    // Handle multi-term linear combinations for Sparky optimization
    if ((0, bindings_js_2.getCurrentBackend)() === 'sparky') {
        let yv = (0, basic_js_1.reduceToScaledVarSparky)(y);
        let xv = (0, basic_js_1.reduceToScaledVarSparky)(x);
        if (isMultiTerm(xv) || isMultiTerm(yv)) {
            return assertEqualMultiTerm(xv, yv);
        }
        // Convert back to standard types for normal processing
        if (!isMultiTerm(xv) && !isMultiTerm(yv)) {
            return assertEqualStandard(xv, yv);
        }
    }
    // Standard path for Snarky
    let yv = (0, basic_js_1.reduceToScaledVar)(y);
    let xv = (0, basic_js_1.reduceToScaledVar)(x);
    return assertEqualStandard(xv, yv);
}
exports.assertEqual = assertEqualCompatible;
function assertEqualStandard(xv, yv) {
    if (isVar(xv) && isVar(yv)) {
        let [[sx, x], [sy, y]] = [getVar(xv), getVar(yv)];
        if (sx === sy) {
            // x === y, so use a wire
            return bindings_js_1.Snarky.field.assertEqual(x, y);
        }
        // sx * x - sy * y = 0
        return gates_js_1.Gates.generic({ left: sx, right: -sy, out: 0n, mul: 0n, const: 0n }, { left: x, right: y, out: (0, basic_js_1.emptyCell)() });
    }
    if (isVar(xv) && isConst(yv)) {
        let [[sx, x], sy] = [getVar(xv), getConst(yv)];
        // x === sy / sx, call into snarky to use its constants table
        return bindings_js_1.Snarky.field.assertEqual(fieldvar_js_1.FieldVar.scale(sx, x), fieldvar_js_1.FieldVar.constant(sy));
    }
    if (isConst(xv) && isVar(yv)) {
        let [sx, [sy, y]] = [getConst(xv), getVar(yv)];
        // sx / sy === y, call into snarky to use its constants table
        return bindings_js_1.Snarky.field.assertEqual(fieldvar_js_1.FieldVar.constant(sx), fieldvar_js_1.FieldVar.scale(sy, y));
    }
    if (isConst(xv) && isConst(yv)) {
        let [sx, sy] = [getConst(xv), getConst(yv)];
        (0, common_js_1.assert)(finite_field_js_1.Fp.equal(sx, sy), `assertEqual(): ${sx} !== ${sy}`);
        return;
    }
    // sadly TS doesn't know that this was exhaustive
    (0, common_js_1.assert)(false, `assertEqual(): unreachable`);
}
// Helper functions for multi-term linear combinations
function isMultiTerm(x) {
    return x && typeof x === 'object' && x.type === 'multiterm';
}
function assertEqualMultiTerm(xv, yv) {
    // Convert both sides to linear combination format
    let xLincom = toLinearCombinationFormat(xv);
    let yLincom = toLinearCombinationFormat(yv);
    // Create the difference: x - y = 0
    let diffConstant = xLincom.constant - yLincom.constant;
    let diffTerms = [...xLincom.terms];
    // Subtract y terms from x terms
    for (let [coeff, varId] of yLincom.terms) {
        diffTerms.push([-coeff, varId]);
    }
    // Build the linear combination using FieldVar methods and assert it equals zero
    // This bypasses intermediate variable creation and uses Sparky's reduce_lincom optimization
    let result = diffConstant === 0n ? null : fieldvar_js_1.FieldVar.constant(diffConstant);
    for (let [coeff, varId] of diffTerms) {
        const scaledVar = fieldvar_js_1.FieldVar.scale(coeff, varId);
        result = result ? fieldvar_js_1.FieldVar.add(result, scaledVar) : scaledVar;
    }
    if (result) {
        const zero = fieldvar_js_1.FieldVar.constant(0n);
        return bindings_js_1.Snarky.field.assertEqual(result, zero);
    }
}
function toLinearCombinationFormat(x) {
    if (isMultiTerm(x)) {
        return { constant: x.constant, terms: x.terms };
    }
    else if (isVar(x)) {
        let [coeff, varId] = getVar(x);
        return { constant: 0n, terms: [[coeff, varId]] };
    }
    else if (isConst(x)) {
        return { constant: getConst(x), terms: [] };
    }
    else {
        throw new Error('Invalid linear combination format');
    }
}
