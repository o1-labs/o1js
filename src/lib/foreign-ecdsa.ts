import { CurveParams } from '../bindings/crypto/elliptic_curve.js';
import { Struct } from './circuit_value.js';
import { ForeignCurve, createForeignCurve, toPoint } from './foreign-curve.js';
import { AlmostForeignField } from './foreign-field.js';
import { Field3 } from './gadgets/foreign-field.js';
import { Gadgets } from './gadgets/gadgets.js';

// external API
export { createEcdsa };

type Signature = { r: AlmostForeignField; s: AlmostForeignField };

/**
 * Returns a class {@link EcdsaSignature} enabling to parse and verify ECDSA signature in provable code,
 * for the given curve.
 */
function createEcdsa(curve: CurveParams | typeof ForeignCurve) {
  let Curve0: typeof ForeignCurve =
    'b' in curve ? createForeignCurve(curve) : curve;
  class Curve extends Curve0 {}
  class Scalar extends Curve.Scalar {}
  class BaseField extends Curve.Field {}

  const Signature: Struct<Signature> = Struct({
    r: Scalar.provable,
    s: Scalar.provable,
  });

  class EcdsaSignature extends Signature {
    static Curve = Curve0;

    constructor(signature: {
      r: Scalar | Field3 | bigint;
      s: Scalar | Field3 | bigint;
    }) {
      super({ r: new Scalar(signature.r), s: new Scalar(signature.s) });
    }

    /**
     * Coerce the input to a {@link EcdsaSignature}.
     */
    static from(signature: {
      r: Scalar | Field3 | bigint;
      s: Scalar | Field3 | bigint;
    }): EcdsaSignature {
      if (signature instanceof this) return signature;
      return new EcdsaSignature(signature);
    }

    /**
     * Create an {@link EcdsaSignature} from a raw 130-char hex string as used in
     * [Ethereum transactions](https://ethereum.org/en/developers/docs/transactions/#typed-transaction-envelope).
     */
    static fromHex(rawSignature: string): EcdsaSignature {
      let s = Gadgets.Ecdsa.Signature.fromHex(rawSignature);
      return new EcdsaSignature(s);
    }

    /**
     * Verify the ECDSA signature given the message hash (a {@link Scalar}) and public key (a {@link Curve} point).
     *
     * This method proves that the signature is valid, and throws if it isn't.
     */
    verify(
      msgHash: Scalar | bigint,
      publicKey: Curve | { x: BaseField | bigint; y: BaseField | bigint }
    ) {
      let msgHash_ = Scalar.from(msgHash);
      let publicKey_ = Curve.from(publicKey);
      return Gadgets.Ecdsa.verify(
        Curve.Bigint,
        toObject(this),
        msgHash_.value,
        toPoint(publicKey_)
      );
    }

    static dummy = new EcdsaSignature({ r: new Scalar(1), s: new Scalar(1) });
  }

  return EcdsaSignature;
}

function toObject(signature: Signature) {
  return { r: signature.r.value, s: signature.s.value };
}
