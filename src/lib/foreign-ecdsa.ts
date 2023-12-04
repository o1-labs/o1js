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
export { createEcdsa };

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
   * Verify the ECDSA signature given the message hash (a {@link Scalar}) and public key (a {@link Curve} point).
   *
   * This method proves that the signature is valid, and throws if it isn't.
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
   * Curve arithmetic on JS bigints.
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
 * Returns a class {@link EcdsaSignature} enabling to parse and verify ECDSA signature in provable code,
 * for the given curve.
 */
function createEcdsa(curve: CurveParams | typeof ForeignCurve) {
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
