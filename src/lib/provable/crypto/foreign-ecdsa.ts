import { provableFromClass } from '../types/provable-derivers.js';
import { CurveParams } from '../../../bindings/crypto/elliptic-curve.js';
import { ProvablePureExtended } from '../types/struct.js';
import {
  FlexiblePoint,
  ForeignCurve,
  createForeignCurve,
  toPoint,
} from './foreign-curve.js';
import { AlmostForeignField } from '../foreign-field.js';
import { assert } from '../gadgets/common.js';
import { Field3 } from '../gadgets/foreign-field.js';
import { Ecdsa } from '../gadgets/elliptic-curve.js';
import { l } from '../gadgets/range-check.js';
import { Keccak } from './keccak.js';
import { Bytes } from '../wrapped-classes.js';
import { UInt8 } from '../int.js';

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
   * Verify the ECDSA signature given the message (an array of bytes) and public key (a {@link Curve} point).
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
   * let message = 'my message';
   * let messageBytes = new TextEncoder().encode(message);
   *
   * // outside provable code: create inputs
   * let privateKey = Scalar.random();
   * let publicKey = Secp256k1.generator.scale(privateKey);
   * let signature = Ecdsa.sign(messageBytes, privateKey.toBigInt());
   *
   * // ...
   * // in provable code: create input witnesses (or use method inputs, or constants)
   * let pk = Provable.witness(Secp256k1.provable, () => publicKey);
   * let msg = Provable.witness(Provable.Array(Field, 9), () => messageBytes.map(Field));
   * let sig = Provable.witness(Ecdsa.provable, () => signature);
   *
   * // verify signature
   * let isValid = sig.verify(msg, pk);
   * isValid.assertTrue('signature verifies');
   * ```
   */
  verify(message: Bytes, publicKey: FlexiblePoint) {
    let msgHashBytes = Keccak.ethereum(message);
    let msgHash = keccakOutputToScalar(msgHashBytes, this.Constructor.Curve);
    return this.verifySignedHash(msgHash, publicKey);
  }

  /**
   * Verify the ECDSA signature given the message hash (a {@link Scalar}) and public key (a {@link Curve} point).
   *
   * This is a building block of {@link EcdsaSignature.verify}, where the input message is also hashed.
   * In contrast, this method just takes the message hash (a curve scalar) as input, giving you flexibility in
   * choosing the hashing algorithm.
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
   * Create an {@link EcdsaSignature} by signing a message with a private key.
   *
   * Note: This method is not provable, and only takes JS bigints as input.
   */
  static sign(message: (bigint | number)[] | Uint8Array, privateKey: bigint) {
    let msgHashBytes = Keccak.ethereum(message);
    let msgHash = keccakOutputToScalar(msgHashBytes, this.Curve);
    return this.signHash(msgHash.toBigInt(), privateKey);
  }

  /**
   * Create an {@link EcdsaSignature} by signing a message hash with a private key.
   *
   * This is a building block of {@link EcdsaSignature.sign}, where the input message is also hashed.
   * In contrast, this method just takes the message hash (a curve scalar) as input, giving you flexibility in
   * choosing the hashing algorithm.
   *
   * Note: This method is not provable, and only takes JS bigints as input.
   */
  static signHash(msgHash: bigint, privateKey: bigint) {
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
 * In summary, this method just:
 * - takes a 32 bytes hash
 * - converts them to 3 limbs which collectively have L_n <= 256 bits
 */
function keccakOutputToScalar(hash: Bytes, Curve: typeof ForeignCurve) {
  const L_n = Curve.Scalar.sizeInBits;
  // keep it simple for now, avoid dealing with dropping bits
  // TODO: what does "leftmost bits" mean? big-endian or little-endian?
  // @noble/curves uses a right shift, dropping the least significant bits:
  // https://github.com/paulmillr/noble-curves/blob/4007ee975bcc6410c2e7b504febc1d5d625ed1a4/src/abstract/weierstrass.ts#L933
  assert(L_n === 256, `Scalar sizes ${L_n} !== 256 not supported`);
  assert(hash.length === 32, `hash length ${hash.length} !== 32 not supported`);

  // piece together into limbs
  // bytes are big-endian, so the first byte is the most significant
  assert(l === 88n);
  let x2 = bytesToLimbBE(hash.bytes.slice(0, 10));
  let x1 = bytesToLimbBE(hash.bytes.slice(10, 21));
  let x0 = bytesToLimbBE(hash.bytes.slice(21, 32));

  return new Curve.Scalar.AlmostReduced([x0, x1, x2]);
}

function bytesToLimbBE(bytes_: UInt8[]) {
  let bytes = bytes_.map((x) => x.value);
  let n = bytes.length;
  let limb = bytes[0];
  for (let i = 1; i < n; i++) {
    limb = limb.mul(1n << 8n).add(bytes[i]);
  }
  return limb.seal();
}
