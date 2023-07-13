import { inverse, mod } from '../bindings/crypto/finite_field.js';
import { CurveAffine } from '../bindings/crypto/elliptic_curve.js';
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
      let msgHash_ = Scalar.from(msgHash);
      let publicKey_ = Curve.from(publicKey);

      if (isConstant(Signature, this)) {
        let signature = { r: this.r.toBigInt(), s: this.s.toBigInt() };
        let isValid = verifyEcdsa(
          Curve.Bigint,
          signature,
          msgHash_.toBigInt(),
          publicKey_.toBigint()
        );
        if (!isValid) {
          throw Error(`${this.constructor.name}.verify(): Invalid signature.`);
        }
        return;
      }
      let curve = Curve0._getParams(`${this.constructor.name}.verify`);
      let signatureMl = signatureToMl(this);
      let msgHashMl = msgHash_.value;
      let publicKeyMl = affineToMl(publicKey_);
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
        return;
      }
      let curve = Curve0._getParams(`${this.name}.check`);
      let signatureMl = signatureToMl(signature);
      Snarky.ecdsa.assertValidSignature(signatureMl, curve);
    }

    static dummy = new EcdsaSignature({ r: new Scalar(1), s: new Scalar(1) });
  }

  return EcdsaSignature;
}

/**
 * Bigint implementation of ECDSA verify
 */
function verifyEcdsa(
  Curve: CurveAffine,
  { r, s }: { r: bigint; s: bigint },
  msgHash: bigint,
  publicKey: { x: bigint; y: bigint }
) {
  let q = Curve.order;
  let QA = Curve.fromNonzero(publicKey);
  if (!Curve.isOnCurve(QA)) return false;
  // TODO subgroup check conditional on whether there is a cofactor
  if (r < 1n || r >= Curve.order) return false;
  if (s < 1n || s >= Curve.order) return false;

  let sInv = inverse(s, q);
  if (sInv === undefined) throw Error('impossible');
  let u1 = mod(msgHash * sInv, q);
  let u2 = mod(r * sInv, q);

  let X = Curve.add(Curve.scale(Curve.one, u1), Curve.scale(QA, u2));
  if (Curve.equal(X, Curve.zero)) return false;

  return mod(X.x, q) === r;
}
