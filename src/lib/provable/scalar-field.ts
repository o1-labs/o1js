import { Fq } from '../../bindings/crypto/finite-field.js';
import { ForeignField, createForeignField } from './foreign-field.js';
import { field3ToShiftedScalar } from './gadgets/native-curve.js';
import { Provable } from './provable.js';
import { Scalar } from './scalar.js';

export { ScalarField };

/**
 * ForeignField representing the scalar field of Pallas and the base field of Vesta
 */
class ScalarField extends createForeignField(Fq.modulus) {
  /**
   * Provable method to convert a {@link ScalarField} into a {@link Scalar}
   */
  public toScalar(): Scalar {
    return ScalarField.toScalar(this);
  }

  public static toScalar(field: ForeignField) {
    if (field.modulus !== Fq.modulus) {
      throw new Error(
        'Only ForeignFields with Fq modulus are convertable into a scalar'
      );
    }
    const field3 = field.value;
    const shiftedScalar = field3ToShiftedScalar(field3);
    return Scalar.fromShiftedScalar(shiftedScalar);
  }

  /**
   * Converts this {@link Scalar} into a {@link ScalarField}
   */
  static fromScalar(s: Scalar): ScalarField {
    if (s.lowBit.isConstant() && s.high254.isConstant()) {
      return new ScalarField(s.toBigInt());
    }
    const field = Provable.witness(ScalarField, () => s.toBigInt());
    const foreignField = new ScalarField(field);
    const scalar = foreignField.toScalar();
    Provable.assertEqual(Scalar, s, scalar);

    return foreignField;
  }
}
