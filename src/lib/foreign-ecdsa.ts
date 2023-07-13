import { Snarky } from '../snarky.js';
import { Struct, isConstant } from './circuit_value.js';
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

/**
 * Returns a class {@link EcdsaSignature} enabling to parse and verify ECDSA signature in provable code,
 * for the given curve.
 */
function createEcdsa(curve: CurveParams | ForeignCurveClass) {
  let Curve0: ForeignCurveClass =
    'gen' in curve ? createForeignCurve(curve) : curve;
  class Curve extends Curve0 {}
  class Scalar extends Curve.Scalar {}
  class BaseField extends Curve.BaseField {}

  const Signature: Struct<Signature> = Struct({ r: Scalar, s: Scalar });

  class EcdsaSignature extends Signature {
    static Curve = Curve0;

    /**
     * Coerce the input to a {@link EcdsaSignature}.
     */
    static from(signature: {
      r: Scalar | bigint;
      s: Scalar | bigint;
    }): EcdsaSignature {
      if (signature instanceof EcdsaSignature) return signature;
      return new EcdsaSignature({
        r: Scalar.from(signature.r),
        s: Scalar.from(signature.s),
      });
    }

    /**
     * Create an {@link EcdsaSignature} from a raw 130-char hex string as used in
     * [Ethereum transactions](https://ethereum.org/en/developers/docs/transactions/#typed-transaction-envelope).
     */
    static fromHex(rawSignature: string): EcdsaSignature {
      let prefix = rawSignature.slice(0, 2);
      let signature = rawSignature.slice(2, 130);
      if (prefix !== '0x' || signature.length < 128) {
        throw Error(
          `${this.name}.fromHex(): Invalid signature, expected hex string 0x... of length at least 130.`
        );
      }
      let r = BigInt(`0x${signature.slice(0, 64)}`);
      let s = BigInt(`0x${signature.slice(64)}`);
      return new EcdsaSignature({ r: Scalar.from(r), s: Scalar.from(s) });
    }

    /**
     * Verify the ECDSA signature given the message hash (a {@link Scalar}) and public key (a {@link Curve} point).
     *
     * This method proves that the signature is valid, and throws if it isn't.
     */
    verify(
      msgHash: Scalar | bigint,
      publicKey: Curve | { x: BaseField | bigint; y: BaseField | bigint }
    ): void {
      let curve = Curve0._getParams(`${this.constructor.name}.verify`);
      let signatureMl = signatureToMl(this);
      let msgHashMl = Scalar.from(msgHash).value;
      let publicKeyMl = affineToMl(Curve.from(publicKey));
      Snarky.ecdsa.verify(signatureMl, msgHashMl, publicKeyMl, curve);
    }

    /**
     * Check that r, s are valid scalars and both are non-zero
     */
    static check(signature: { r: Scalar; s: Scalar }) {
      if (isConstant(Signature, signature)) {
        super.check(signature); // check valid scalars
        if (signature.r.toBigInt() === 0n)
          throw Error(`${this.name}.check(): r must be non-zero`);
        if (signature.s.toBigInt() === 0n)
          throw Error(`${this.name}.check(): s must be non-zero`);
      }
      let curve = Curve0._getParams(`${this.name}.check`);
      let signatureMl = signatureToMl(signature);
      Snarky.ecdsa.assertValidSignature(signatureMl, curve);
    }

    static dummy = new EcdsaSignature({ r: new Scalar(1), s: new Scalar(1) });
  }

  return EcdsaSignature;
}
