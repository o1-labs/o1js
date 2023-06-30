import { Snarky } from 'src/snarky.js';
import { Bool } from './bool.js';
import { Struct } from './circuit_value.js';
import {
  CurveParams,
  ForeignCurveClass,
  affineToMl,
  createForeignCurve,
} from './foreign-curve.js';
import { ForeignField, ForeignFieldVar } from './foreign-field.js';

// external API
export { createEcdsa };

// internal API
export { ForeignSignatureVar };

type MlSignature<F> = [_: 0, x: F, y: F];
type ForeignSignatureVar = MlSignature<ForeignFieldVar>;

type Signature = { r: ForeignField; s: ForeignField };

function signatureToMl({ r, s }: Signature): ForeignSignatureVar {
  return [0, r.value, s.value];
}

function createEcdsa(
  curve: CurveParams | ForeignCurveClass,
  signatureName = 'EcdsaSignature'
) {
  let Curve0: ForeignCurveClass =
    'gen' in curve ? createForeignCurve(curve) : curve;
  class Curve extends Curve0 {}
  class Scalar extends Curve.ScalarField {}
  class BaseField extends Curve.BaseField {}

  const Signature: Struct<Signature> & (new (value: Signature) => Signature) =
    Struct({ r: Scalar, s: Scalar });

  class EcdsaSignature extends Signature {
    from({ r, s }: { r: Scalar | bigint; s: Scalar | bigint }): EcdsaSignature {
      return new EcdsaSignature({ r: Scalar.from(r), s: Scalar.from(s) });
    }

    fromHex(rawSignature: string): EcdsaSignature {
      let prefix = rawSignature.slice(0, 2);
      let signature = rawSignature.slice(2, 130);
      if (prefix !== '0x' || signature.length < 128) {
        throw Error(
          `${signatureName}.fromHex(): Invalid signature, expected hex string 0x... of length at least 130.`
        );
      }
      let r = BigInt(`0x${signature.slice(0, 64)}`);
      let s = BigInt(`0x${signature.slice(64)}`);
      return new EcdsaSignature({ r: Scalar.from(r), s: Scalar.from(s) });
    }

    verify(
      msgHash: Scalar | bigint,
      publicKey: Curve | { x: BaseField | bigint; y: BaseField | bigint }
    ): void {
      let curve = Curve._getParams(`${signatureName}.verify`);
      let signatureMl = signatureToMl(this);
      let msgHashMl = Scalar.from(msgHash).value;
      let publicKeyMl = affineToMl(Curve.from(publicKey));
      Snarky.ecdsa.verify(signatureMl, msgHashMl, publicKeyMl, curve);
    }

    static check(signature: { r: Scalar; s: Scalar }) {
      let curve = Curve._getParams(`${signatureName}.check`);
      let signatureMl = signatureToMl(signature);
      Snarky.ecdsa.assertValidSignature(signatureMl, curve);
    }

    static dummy = new EcdsaSignature({ r: new Scalar(1), s: new Scalar(1) });
  }

  return EcdsaSignature;
}
