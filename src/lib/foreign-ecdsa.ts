import { provableFromClass } from '../bindings/lib/provable-snarky.js';
import { CurveParams } from '../bindings/crypto/elliptic_curve.js';
import { ProvablePureExtended } from './circuit_value.js';
import {
  FlexiblePoint,
  ForeignCurve,
  createForeignCurve,
  toPoint,
} from './foreign-curve.js';
import { AlmostForeignField } from './foreign-field.js';
import { assert } from './gadgets/common.js';
import { Field3 } from './gadgets/foreign-field.js';
import { Gadgets } from './gadgets/gadgets.js';

// external API
export { createEcdsa, EcdsaSignature };

type FlexibleSignature =
  | EcdsaSignature
  | {
      r: AlmostForeignField | Field3 | bigint | number;
      s: AlmostForeignField | Field3 | bigint | number;
    };

class EcdsaSignature {
  r: AlmostForeignField;
  s: AlmostForeignField;

  /**
   * Create a new {@link EcdsaSignature} from an object containing the scalars r and s.
   * @param signature
   */
  constructor(signature: {
    r: AlmostForeignField | Field3 | bigint | number;
    s: AlmostForeignField | Field3 | bigint | number;
  }) {
    this.r = new this.Constructor.Curve.Scalar(signature.r);
    this.s = new this.Constructor.Curve.Scalar(signature.s);
  }

  /**
   * Coerce the input to a {@link EcdsaSignature}.
   */
  static from(signature: FlexibleSignature): EcdsaSignature {
    if (signature instanceof this) return signature;
    return new this(signature);
  }

  /**
   * Create an {@link EcdsaSignature} from a raw 130-char hex string as used in
   * [Ethereum transactions](https://ethereum.org/en/developers/docs/transactions/#typed-transaction-envelope).
   */
  static fromHex(rawSignature: string): EcdsaSignature {
    let s = Gadgets.Ecdsa.Signature.fromHex(rawSignature);
    return new this(s);
  }

  /**
   * Convert this signature to an object with bigint fields.
   */
  toBigInt() {
    return { r: this.r.toBigInt(), s: this.s.toBigInt() };
  }

  /**
   * Verify the ECDSA signature given the message hash (a {@link Scalar}) and public key (a {@link Curve} point).
   *
   * **Important:** This method returns a {@link Bool} which indicates whether the signature is valid.
   * So, to actually prove validity of a signature, you need to assert that the result is true.
   *
   * @throws if one of the signature scalars is zero or if the public key is not on the curve.
   *
   * @example
   * ```ts
   * // create classes for your curve
   * class Secp256k1 extends createForeignCurve(Crypto.CurveParams.Secp256k1) {}
   * class Scalar extends Secp256k1.Scalar {}
   * class Ecdsa extends createEcdsa(Secp256k1) {}
   *
   * // outside provable code: create inputs
   * let privateKey = Scalar.random();
   * let publicKey = Secp256k1.generator.scale(privateKey);
   * let messageHash = Scalar.random();
   * let signature = Ecdsa.sign(messageHash.toBigInt(), privateKey.toBigInt());
   *
   * // ...
   * // in provable code: create input witnesses (or use method inputs, or constants)
   * let pk = Provable.witness(Secp256k1.provable, () => publicKey);
   * let msgHash = Provable.witness(Scalar.Canonical.provable, () => messageHash);
   * let sig = Provable.witness(Ecdsa.provable, () => signature);
   *
   * // verify signature
   * let isValid = sig.verify(msgHash, pk);
   * isValid.assertTrue('signature verifies');
   * ```
   */
  verify(msgHash: AlmostForeignField | bigint, publicKey: FlexiblePoint) {
    let msgHash_ = this.Constructor.Curve.Scalar.from(msgHash);
    let publicKey_ = this.Constructor.Curve.from(publicKey);
    return Gadgets.Ecdsa.verify(
      this.Constructor.Curve.Bigint,
      toObject(this),
      msgHash_.value,
      toPoint(publicKey_)
    );
  }

  /**
   * Create an {@link EcdsaSignature} by signing a message hash with a private key.
   *
   * Note: This method is not provable, and only takes JS bigints as input.
   */
  static sign(msgHash: bigint, privateKey: bigint) {
    let { r, s } = Gadgets.Ecdsa.sign(this.Curve.Bigint, msgHash, privateKey);
    return new this({ r, s });
  }

  static check(signature: EcdsaSignature) {
    // more efficient than the automatic check, which would do this for each scalar separately
    this.Curve.Scalar.assertAlmostReduced(signature.r, signature.s);
  }

  // dynamic subclassing infra
  get Constructor() {
    return this.constructor as typeof EcdsaSignature;
  }
  static _Curve?: typeof ForeignCurve;
  static _provable?: ProvablePureExtended<
    EcdsaSignature,
    { r: string; s: string }
  >;

  /**
   * The {@link ForeignCurve} on which the ECDSA signature is defined.
   */
  static get Curve() {
    assert(this._Curve !== undefined, 'EcdsaSignature not initialized');
    return this._Curve;
  }
  /**
   * `Provable<EcdsaSignature>`
   */
  static get provable() {
    assert(this._provable !== undefined, 'EcdsaSignature not initialized');
    return this._provable;
  }
}

/**
 * Create a class {@link EcdsaSignature} for verifying ECDSA signatures on the given curve.
 */
function createEcdsa(
  curve: CurveParams | typeof ForeignCurve
): typeof EcdsaSignature {
  let Curve0: typeof ForeignCurve =
    'b' in curve ? createForeignCurve(curve) : curve;
  class Curve extends Curve0 {}

  class Signature extends EcdsaSignature {
    static _Curve = Curve;
    static _provable = provableFromClass(Signature, {
      r: Curve.Scalar.provable,
      s: Curve.Scalar.provable,
    });
  }

  return Signature;
}

function toObject(signature: EcdsaSignature) {
  return { r: signature.r.value, s: signature.s.value };
}
