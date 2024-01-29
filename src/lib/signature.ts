import { Field, Bool, Group, Scalar } from './core.js';
import { prop, CircuitValue, AnyConstructor } from './circuit_value.js';
import { hashWithPrefix } from './hash.js';
import {
  deriveNonce,
  Signature as SignatureBigint,
} from '../mina-signer/src/signature.js';
import { Bool as BoolBigint } from '../provable/field-bigint.js';
import {
  Scalar as ScalarBigint,
  PrivateKey as PrivateKeyBigint,
  PublicKey as PublicKeyBigint,
} from '../provable/curve-bigint.js';
import { prefixes } from '../bindings/crypto/constants.js';
import { constantScalarToBigint } from './scalar.js';
import { toConstantField } from './field.js';
import { NetworkId } from 'src/mina-signer/src/TSTypes.js';

// external API
export { PrivateKey, PublicKey, Signature };

// internal API
export { scaleShifted };

/**
 * A signing key. You can generate one via {@link PrivateKey.random}.
 */
class PrivateKey extends CircuitValue {
  @prop s: Scalar;

  constructor(s: Scalar) {
    super(s);
  }

  /**
   * You can use this method to generate a private key. You can then obtain
   * the associated public key via {@link toPublicKey}. And generate signatures
   * via {@link Signature.create}.
   *
   * @returns a new {@link PrivateKey}.
   */
  static random(): PrivateKey {
    return new PrivateKey(Scalar.random());
  }

  /**
   * Deserializes a list of bits into a {@link PrivateKey}.
   *
   * @param bs a list of {@link Bool}.
   * @returns a {@link PrivateKey}.
   */
  static fromBits(bs: Bool[]): PrivateKey {
    return new PrivateKey(Scalar.fromBits(bs));
  }

  /**
   * Convert this {@link PrivateKey} to a bigint
   */
  toBigInt() {
    return constantScalarToBigint(this.s, 'PrivateKey.toBigInt');
  }

  /**
   * Create a {@link PrivateKey} from a bigint
   *
   * **Warning**: Private keys should be sampled from secure randomness with sufficient entropy.
   * Be careful that you don't use this method to create private keys that were sampled insecurely.
   */
  static fromBigInt(sk: PrivateKeyBigint) {
    return new PrivateKey(Scalar.from(sk));
  }

  /**
   * Derives the associated public key.
   *
   * @returns a {@link PublicKey}.
   */
  toPublicKey(): PublicKey {
    return PublicKey.fromPrivateKey(this);
  }

  /**
   * Decodes a base58 string into a {@link PrivateKey}.
   *
   * @returns a {@link PrivateKey}.
   */
  static fromBase58(privateKeyBase58: string) {
    let scalar = PrivateKeyBigint.fromBase58(privateKeyBase58);
    return new PrivateKey(Scalar.from(scalar));
  }

  /**
   * Encodes a {@link PrivateKey} into a base58 string.
   * @returns a base58 encoded string
   */
  toBase58() {
    return PrivateKey.toBase58(this);
  }

  // static version, to operate on non-class versions of this type
  /**
   * Static method to encode a {@link PrivateKey} into a base58 string.
   * @returns a base58 encoded string
   */
  static toBase58(privateKey: { s: Scalar }) {
    return PrivateKeyBigint.toBase58(
      constantScalarToBigint(privateKey.s, 'PrivateKey.toBase58')
    );
  }
}

// TODO: this doesn't have a non-default check method yet. does it need one?
/**
 * A public key, which is also an address on the Mina network.
 * You can derive a {@link PublicKey} directly from a {@link PrivateKey}.
 */
class PublicKey extends CircuitValue {
  // compressed representation of a curve point, where `isOdd` is the least significant bit of `y`
  @prop x: Field;
  @prop isOdd: Bool;

  /**
   * Returns the {@link Group} representation of this {@link PublicKey}.
   * @returns A {@link Group}
   */
  toGroup(): Group {
    // compute y from elliptic curve equation y^2 = x^3 + 5
    // TODO: we have to improve constraint efficiency by using range checks
    let { x, isOdd } = this;
    let ySquared = x.mul(x).mul(x).add(5);
    let someY = ySquared.sqrt();
    let isTheRightY = isOdd.equals(someY.toBits()[0]);
    let y = isTheRightY
      .toField()
      .mul(someY)
      .add(isTheRightY.not().toField().mul(someY.neg()));
    return new Group({ x, y });
  }

  /**
   * Creates a {@link PublicKey} from a {@link Group} element.
   * @returns a {@link PublicKey}.
   */
  static fromGroup({ x, y }: Group): PublicKey {
    let isOdd = y.toBits()[0];
    return PublicKey.fromObject({ x, isOdd });
  }

  /**
   * Derives a {@link PublicKey} from a {@link PrivateKey}.
   * @returns a {@link PublicKey}.
   */
  static fromPrivateKey({ s }: PrivateKey): PublicKey {
    return PublicKey.fromGroup(Group.generator.scale(s));
  }

  /**
   * Creates a {@link PublicKey} from a JSON structure element.
   * @returns a {@link PublicKey}.
   */
  static from(g: { x: Field; isOdd: Bool }) {
    return PublicKey.fromObject(g);
  }

  /**
   * Creates an empty {@link PublicKey}.
   * @returns an empty {@link PublicKey}
   */
  static empty<T extends AnyConstructor>(): InstanceType<T> {
    return PublicKey.from({ x: Field(0), isOdd: Bool(false) }) as any;
  }

  /**
   * Checks if a {@link PublicKey} is empty.
   * @returns a {@link Bool}
   */
  isEmpty() {
    // there are no curve points with x === 0
    return this.x.isZero();
  }

  /**
   * Decodes a base58 encoded {@link PublicKey} into a {@link PublicKey}.
   * @returns a {@link PublicKey}
   */
  static fromBase58(publicKeyBase58: string) {
    let { x, isOdd } = PublicKeyBigint.fromBase58(publicKeyBase58);
    return PublicKey.from({ x: Field(x), isOdd: Bool(!!isOdd) });
  }

  /**
   * Encodes a {@link PublicKey} in base58 format.
   * @returns a base58 encoded {@link PublicKey}
   */
  toBase58() {
    return PublicKey.toBase58(this);
  }

  /**
   * Static method to encode a {@link PublicKey} into base58 format.
   * @returns a base58 encoded {@link PublicKey}
   */
  static toBase58({ x, isOdd }: PublicKey) {
    x = toConstantField(x, 'toBase58', 'pk', 'public key');
    return PublicKeyBigint.toBase58({
      x: x.toBigInt(),
      isOdd: BoolBigint(isOdd.toBoolean()),
    });
  }

  /**
   * Serializes a {@link PublicKey} into its JSON representation.
   * @returns a JSON string
   */
  static toJSON(publicKey: PublicKey) {
    return publicKey.toBase58();
  }

  /**
   * Deserializes a JSON string into a {@link PublicKey}.
   * @returns a JSON string
   */
  static fromJSON<T extends AnyConstructor>(this: T, publicKey: string) {
    return PublicKey.fromBase58(publicKey) as InstanceType<T>;
  }
}

/**
 * A Schnorr {@link Signature} over the Pasta Curves.
 */
class Signature extends CircuitValue {
  @prop r: Field;
  @prop s: Scalar;

  /**
   * Signs a message using a {@link PrivateKey}.
   * @returns a {@link Signature}
   */
  static create(privKey: PrivateKey, msg: Field[], networkId: NetworkId = 'testnet'): Signature {
    const publicKey = PublicKey.fromPrivateKey(privKey).toGroup();
    const d = privKey.s;
    const kPrime = Scalar.fromBigInt(
      deriveNonce(
        { fields: msg.map((f) => f.toBigInt()) },
        { x: publicKey.x.toBigInt(), y: publicKey.y.toBigInt() },
        BigInt(d.toJSON()),
        networkId
      )
    );
    let { x: r, y: ry } = Group.generator.scale(kPrime);
    const k = ry.toBits()[0].toBoolean() ? kPrime.neg() : kPrime;
    let h = hashWithPrefix(
      networkId === 'mainnet'
        ? prefixes.signatureMainnet
        : prefixes.signatureTestnet,
      msg.concat([publicKey.x, publicKey.y, r])
    );
    // TODO: Scalar.fromBits interprets the input as a "shifted scalar"
    // therefore we have to unshift e before using it
    let e = unshift(Scalar.fromBits(h.toBits()));
    const s = e.mul(d).add(k);
    return new Signature(r, s);
  }

  /**
   * Verifies the {@link Signature} using a message and the corresponding {@link PublicKey}.
   * @returns a {@link Bool}
   */
  verify(publicKey: PublicKey, msg: Field[], networkId: NetworkId = 'testnet'): Bool {
    const point = publicKey.toGroup();
    let h = hashWithPrefix(
      networkId === 'mainnet'
        ? prefixes.signatureMainnet
        : prefixes.signatureTestnet,
      msg.concat([point.x, point.y, this.r])
    );
    // TODO: Scalar.fromBits interprets the input as a "shifted scalar"
    // therefore we have to use scaleShifted which is very inefficient
    let e = Scalar.fromBits(h.toBits());
    let r = scaleShifted(point, e).neg().add(Group.generator.scale(this.s));
    return Bool.and(r.x.equals(this.r), r.y.toBits()[0].equals(false));
  }

  /**
   * Decodes a base58 encoded signature into a {@link Signature}.
   */
  static fromBase58(signatureBase58: string) {
    let { r, s } = SignatureBigint.fromBase58(signatureBase58);
    return Signature.fromObject({
      r: Field(r),
      s: Scalar.fromJSON(s.toString()),
    });
  }
  /**
   * Encodes a {@link Signature} in base58 format.
   */
  toBase58() {
    let r = this.r.toBigInt();
    let s = BigInt(this.s.toJSON());
    return SignatureBigint.toBase58({ r, s });
  }
}

// performs scalar multiplication s*G assuming that instead of s, we got s' = 2s + 1 + 2^255
// cost: 2x scale by constant, 1x scale by variable
function scaleShifted(point: Group, shiftedScalar: Scalar) {
  let oneHalfGroup = point.scale(Scalar.fromBigInt(oneHalf));
  let shiftGroup = oneHalfGroup.scale(Scalar.fromBigInt(shift));
  return oneHalfGroup.scale(shiftedScalar).sub(shiftGroup);
}
// returns s, assuming that instead of s, we got s' = 2s + 1 + 2^255
// (only works out of snark)
function unshift(shiftedScalar: Scalar) {
  return shiftedScalar
    .sub(Scalar.fromBigInt(shift))
    .mul(Scalar.fromBigInt(oneHalf));
}

let shift = ScalarBigint(1n + 2n ** 255n);
let oneHalf = ScalarBigint.inverse(2n)!;
