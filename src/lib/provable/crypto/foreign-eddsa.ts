import { provableFromClass } from '../types/provable-derivers.js';
import { TwistedCurveParams } from '../../../bindings/crypto/elliptic-curve.js';
import { ProvablePureExtended } from '../types/struct.js';
import {
  FlexiblePoint,
  ForeignTwisted,
  createForeignTwisted,
  toPoint,
} from './foreign-twisted.js';
import { AlmostForeignField } from '../foreign-field.js';
import { assert } from '../gadgets/common.js';
import { Field3 } from '../gadgets/foreign-field.js';
import { Eddsa, encode } from '../gadgets/twisted-curve.js';
import { l, multiRangeCheck } from '../gadgets/range-check.js';
import { SHA2 } from '../gadgets/sha2.js';
import { Bytes } from '../wrapped-classes.js';
import { UInt8 } from '../int.js';
import type { Bool } from '../bool.js';

// external API
export { createEddsa, EddsaSignature };

type FlexibleSignature =
  | EddsaSignature
  | {
      R: AlmostForeignField | Field3 | bigint | number;
      s: AlmostForeignField | Field3 | bigint | number;
    };

class EddsaSignature {
  R: AlmostForeignField;
  s: AlmostForeignField;

  /**
   * Create a new {@link EddsaSignature} from an object containing the scalars R and s.
   *
   * Note: Inputs must be range checked if they originate from a different field
   * with a different modulus or if they are not constants. Please refer to the
   * {@link ForeignField} constructor comments for more details.
   */
  constructor(signature: {
    R: AlmostForeignField | Field3 | bigint | number;
    s: AlmostForeignField | Field3 | bigint | number;
  }) {
    this.R = new this.Constructor.Curve.Scalar(signature.R);
    this.s = new this.Constructor.Curve.Scalar(signature.s);
  }

  /**
   * Coerce the input to a {@link EddsaSignature}.
   */
  static from(signature: FlexibleSignature): EddsaSignature {
    if (signature instanceof this) return signature;
    return new this(signature);
  }

  /**
   * Create an {@link EddsaSignature} from a raw 130-char hex string
   */
  static fromHex(rawSignature: string): EddsaSignature {
    let S = Eddsa.Signature.fromHex(rawSignature);
    return new this(S);
  }

  /**
   * Convert this signature to an object with bigint fields.
   */
  toBigInt() {
    return { R: this.R.toBigInt(), s: this.s.toBigInt() };
  }

  /**
   * Verify the EdDSA signature given the message (an array of bytes) and public
   * key (a {@link Curve} point).
   *
   * **Important:** This method returns a {@link Bool} which indicates whether
   * the signature is valid. So, to actually prove validity of a signature, you
   * need to assert that the result is true.
   *
   * @throws if one of the signature scalars is zero or if the public key is not
   * on the curve.
   *
   * @example
   * ```ts
   * // create classes for your curve
   * class Edwards25519 extends createForeignCurve(Crypto.TwistedCurveParams.Edwards25519) {}
   * class Scalar extends Edwards25519.Scalar {}
   * class Ed25519 extends createEddsa(Edwards25519) {}
   *
   * let message = 'my message';
   * let messageBytes = new TextEncoder().encode(message);
   *
   * // outside provable code: create inputs
   * let privateKey = Scalar.random();
   * let publicKey = Edwards25519.generator.scale(privateKey);
   * let signature = Ed25519.sign(messageBytes, privateKey.toBigInt());
   *
   * // ...
   * // in provable code: create input witnesses (or use method inputs, or constants)
   * let pk = Provable.witness(Edwards25519, () => publicKey);
   * let msg = Provable.witness(Provable.Array(Field, 9), () => messageBytes.map(Field));
   * let sig = Provable.witness(Eddsa, () => signature);
   *
   * // verify signature
   * let isValid = sig.verify(msg, pk);
   * isValid.assertTrue('signature verifies');
   * ```
   */
  verify(message: Bytes, publicKey: FlexiblePoint): Bool {
    let publicKey_ = this.Constructor.Curve.from(publicKey);
    return Eddsa.verify(
      toObject(this),
      message.bytes,
      encode(toPoint(publicKey_))
    );
  }

  /**
   * Create an {@link EddsaSignature} by signing a message with a private key.
   *
   * Note: This method is not provable, and only takes JS bigints as input.
   */
  static sign(message: bigint, privateKey: bigint): EddsaSignature {
    let { R, s } = Eddsa.sign(privateKey, message);
    return new this({ R, s });
  }

  static check(signature: EddsaSignature) {
    multiRangeCheck(signature.R.value);
    multiRangeCheck(signature.s.value);
    // more efficient than the automatic check, which would do this for each scalar separately
    this.Curve.Scalar.assertAlmostReduced(signature.R, signature.s);
  }

  // dynamic subclassing infra
  get Constructor() {
    return this.constructor as typeof EddsaSignature;
  }
  static _Curve?: typeof ForeignTwisted;
  static _provable?: ProvablePureExtended<
    EddsaSignature,
    { R: bigint; s: bigint },
    { R: string; s: string }
  >;

  /**
   * The {@link ForeignTwisted} on which the EdDSA signature is defined.
   */
  static get Curve() {
    assert(this._Curve !== undefined, 'EddsaSignature not initialized');
    return this._Curve;
  }
  /**
   * `Provable<EddsaSignature>`
   */
  static get provable() {
    assert(this._provable !== undefined, 'EddsaSignature not initialized');
    return this._provable;
  }
}

/**
 * Create a class {@link EddsaSignature} for verifying EdDSA signatures on the given curve.
 */
function createEddsa(
  curve: TwistedCurveParams | typeof ForeignTwisted
): typeof EddsaSignature {
  let Curve0: typeof ForeignTwisted =
    'd' in curve ? createForeignTwisted(curve) : curve;
  class Curve extends Curve0 {}

  class Signature extends EddsaSignature {
    static _Curve = Curve;
    static _provable = provableFromClass(Signature, {
      R: Curve.Scalar,
      s: Curve.Scalar,
    });
  }

  return Signature;
}

function toObject(signature: EddsaSignature) {
  return { R: signature.R.value, s: signature.s.value };
}
