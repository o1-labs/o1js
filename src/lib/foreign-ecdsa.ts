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
import { assert, witnessSlice } from './gadgets/common.js';
import { Field3 } from './gadgets/foreign-field.js';
import { Ecdsa } from './gadgets/elliptic-curve.js';
import { Field } from './field.js';
import { TupleN } from './util/types.js';
import { rangeCheck64 } from './gadgets/range-check.js';

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
    let s = Ecdsa.Signature.fromHex(rawSignature);
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
   * let isValid = sig.verifySignedHash(msgHash, pk);
   * isValid.assertTrue('signature verifies');
   * ```
   */
  verifySignedHash(
    msgHash: AlmostForeignField | bigint,
    publicKey: FlexiblePoint
  ) {
    let msgHash_ = this.Constructor.Curve.Scalar.from(msgHash);
    let publicKey_ = this.Constructor.Curve.from(publicKey);
    return Ecdsa.verify(
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
    let { r, s } = Ecdsa.sign(this.Curve.Bigint, msgHash, privateKey);
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

/**
 * Provable method to convert keccak256 hash output to ECDSA scalar = "message hash"
 *
 * Spec from [Wikipedia](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm):
 *
 * > Let z be the L_n leftmost bits of e, where L_{n} is the bit length of the group order n.
 * > (Note that z can be greater than n but not longer.)
 *
 * The output z is used as input to a multiplication:
 *
 * > Calculate u_1 = z s^(-1) mod n ...
 *
 * That means we don't need to reduce z mod n: The fact that it has bitlength <= n makes it
 * almost reduced which is enough for the multiplication to be correct.
 * (using a weaker notion of "almost reduced" than what we usually prove, but sufficient for all uses of it: `z < 2^ceil(log(n))`)
 *
 * In summary, this method:
 * - takes 256 bits in 4x64 form
 * - converts them to 3 limbs which collectively have L_n <= 256 bits,
 *    by dropping the higher bits.
 */
function keccakOutputToLimbs(
  hash: TupleN<Field, 4>,
  Curve: typeof ForeignCurve
) {
  const L_n = Curve.Scalar.sizeInBits;
  // keep it simple, avoid dealing with bits dropped from words other than the highest
  assert(L_n > 3 * 64, `Scalar sizes ${L_n} <= ${3 * 64} not supported`);

  // TODO confirm endianness
  let [w0, w1, w2, w3] = hash;

  // split w1 and w2 along the 88 bit boundaries
  let [w10, w11] = split64(w1, 24); // 24 = 88 - 64; 40 = 64 - 24
  let [w20, w21] = split64(w2, 48); // 48 = 88 - 40; 16 = 64 - 48

  // if L_n < 256, drop higher part of w3 so that the total length is L_n
  if (L_n < 256) {
    let [w30] = split64(w3, L_n - 3 * 64);
    w3 = w30;
  }

  // piece together into limbs
  let x0 = w0.add(w10.mul(1n << 64n));
  let x1 = w11.add(w20.mul(1n << 40n));
  let x2 = w21.add(w3.mul(1n << 16n));

  return new Curve.Scalar.AlmostReduced([x0, x1, x2]);
}

// split 64-bit field into two pieces of lengths n and 64-n
function split64(x: Field, n: number) {
  let x0 = witnessSlice(x, 0, n);
  let x1 = witnessSlice(x, n, 64);

  // prove decomposition
  let nn = BigInt(n);
  x0.add(x1.mul(1n << nn)).assertEquals(x);

  // prove ranges: x0 in [0, 2^n), x1 in [0, 2^(64-n))
  rangeCheck64(x0);
  rangeCheck64(x0.mul(1n << (64n - nn)));
  rangeCheck64(x1);
  // note: x1 < 2^(64-n) is implied by x0 + x1 * 2^n = x < 2^64

  return [x0, x1];
}
