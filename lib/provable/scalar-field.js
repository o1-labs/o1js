"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScalarField = void 0;
const finite_field_js_1 = require("../../bindings/crypto/finite-field.js");
const foreign_field_js_1 = require("./foreign-field.js");
const native_curve_js_1 = require("./gadgets/native-curve.js");
const provable_js_1 = require("./provable.js");
const scalar_js_1 = require("./scalar.js");
/**
 * ForeignField representing the scalar field of Pallas and the base field of Vesta
 */
class ScalarField extends (0, foreign_field_js_1.createForeignField)(finite_field_js_1.Fq.modulus) {
    /**
     * Provable method to convert a {@link ScalarField} into a {@link Scalar}
     */
    toScalar() {
        return ScalarField.toScalar(this);
    }
    static toScalar(field) {
        if (field.modulus !== finite_field_js_1.Fq.modulus) {
            throw new Error('Only ForeignFields with Fq modulus are convertible into a scalar');
        }
        const field3 = field.value;
        const shiftedScalar = (0, native_curve_js_1.field3ToShiftedScalar)(field3);
        return scalar_js_1.Scalar.fromShiftedScalar(shiftedScalar);
    }
    /**
     * Converts this {@link Scalar} into a {@link ScalarField}
     */
    static fromScalar(s) {
        if (s.lowBit.isConstant() && s.high254.isConstant()) {
            return new ScalarField(s.toBigInt());
        }
        const field = provable_js_1.Provable.witness(ScalarField, () => s.toBigInt());
        const foreignField = new ScalarField(field);
        const scalar = foreignField.toScalar();
        provable_js_1.Provable.assertEqual(scalar_js_1.Scalar, s, scalar);
        return foreignField;
    }
}
exports.ScalarField = ScalarField;
