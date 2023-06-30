import { Bool } from './bool.js';
import { Struct } from './circuit_value.js';
import {
  CurveParams,
  ForeignCurveClass,
  createForeignCurve,
} from './foreign-curve.js';

// external API
export { createEcdsa };

function createEcdsa(curve: CurveParams | ForeignCurveClass) {
  let Curve0: ForeignCurveClass =
    'gen' in curve ? createForeignCurve(curve) : curve;
  class Curve extends Curve0 {}
  class Scalar extends Curve.ScalarField {}

  type Signature = { r: Scalar; s: Scalar };
  const Signature: Struct<Signature> = Struct({ r: Scalar, s: Scalar });

  return class EcdsaSignature extends Signature {
    from({ r, s }: { r: Scalar | bigint; s: Scalar | bigint }): EcdsaSignature {
      return new EcdsaSignature({ r: Scalar.from(r), s: Scalar.from(s) });
    }

    // TODO
    fromHex({ r, s }: { r: string; s: string }): EcdsaSignature {
      return new EcdsaSignature({ r: Scalar.from(r), s: Scalar.from(s) });
    }

    // TODO
    verify(msgHash: Scalar | bigint, publicKey: Curve): Bool {
      let msgHash_ = Scalar.from(msgHash);
      return new Bool(false);
    }

    static check(sig: { r: Scalar; s: Scalar }) {
      // TODO: check scalars != 0 in addition to normal check for valid scalars
      // use signature_scalar_check
      super.check(sig);
    }

    static dummy = new EcdsaSignature({ r: new Scalar(1), s: new Scalar(1) });
  };
}
