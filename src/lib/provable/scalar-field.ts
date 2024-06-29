import { createField } from './core/field-constructor.js';
import { createForeignField } from './foreign-field.js';
import { field3ToShiftedScalar } from './gadgets/native-curve.js';
import { Provable } from './provable.js';
import { Scalar } from './scalar.js';

export { ScalarField };

/**
 * ForeignField representing the scalar field of Pallas and the base field of Vesta
 */
class ScalarField extends createForeignField(
  28948022309329048855892746252171976963363056481941647379679742748393362948097n
) {
  /**
   * Provable method to conver a {@link ScalarField} into a {@link Scalar}
   *
   * This is always possible and unambiguous, since the scalar field is larger than the base field.
   */
  public toScalar(): Scalar {
    const field3 = this.value;
    const shiftedScalar = field3ToShiftedScalar(field3);
    return Scalar.fromShiftedScalar(shiftedScalar);
  }

  /**
   * Converts this {@link Scalar} into a {@link ScalarField}
   */
  static fromScalar(s: Scalar): ScalarField {
    if (s.lowBit.isConstant() && s.high254.isConstant()) {
      return new ScalarField(
        ScalarField.fromBits(createField(s.toBigInt()).toBits())
      );
    }
    const field = Provable.witness(ScalarField.provable, () => {
      return ScalarField.fromBits(createField(s.toBigInt()).toBits())
    });
    const foreignField = new ScalarField(field);
    const scalar = foreignField.toScalar();
    Provable.assertEqual(Scalar, s, scalar);

    return foreignField;
  }
}
