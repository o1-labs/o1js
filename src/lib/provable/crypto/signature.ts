import { Field, Bool, Group, Scalar } from '../wrapped.js';
import { AnyConstructor } from '../types/struct.js';
import { hashWithPrefix } from './poseidon.js';
import {
  deriveNonce,
  Signature as SignatureBigint,
  signaturePrefix,
} from '../../../mina-signer/src/signature.js';
import {
  PrivateKey as PrivateKeyBigint,
  PublicKey as PublicKeyBigint,
} from '../../../mina-signer/src/curve-bigint.js';
import { toConstantField } from '../field.js';
import { CircuitValue, prop } from '../types/circuit-value.js';

// external API
export { PrivateKey, PublicKey, Signature };

/**
 * A signing key. You can generate one via {@link PrivateKey.random}.
 */
class PrivateKey extends CircuitValue {
  @prop s: Scalar;

  constructor(s: Scalar) {
    super(s);
  }

  /**
   * Generate a random private key.
   *
   * You can obtain the associated public key via {@link toPublicKey}.
   * And generate signatures via {@link Signature.create}.
   *
   * Note: This uses node or browser built-in APIs to obtain cryptographically strong randomness,
   * and can be safely used to generate a real private key.
   *
   * @returns a new {@link PrivateKey}.
   */
  static random(): PrivateKey {
    return new PrivateKey(Scalar.random());
  }

  /**
   * Create a random keypair `{ privateKey: PrivateKey, publicKey: PublicKey }`.
   *
   * Note: This uses node or browser built-in APIs to obtain cryptographically strong randomness,
   * and can be safely used to generate a real keypair.
   */
  static randomKeypair() {
    let privateKey = PrivateKey.random();
    return { privateKey, publicKey: privateKey.toPublicKey() };
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
    return this.s.toBigInt();
  }

  /**
   * Create a {@link PrivateKey} from a bigint
   *
   * **Warning**: Private keys should be sampled from secure randomness with sufficient entropy.
   * Be careful that you don't use this method to create private keys that were sampled insecurely.
   */
  static fromBigInt(sk: bigint) {
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
    return PrivateKeyBigint.toBase58(privateKey.s.toBigInt());
  }

  static toValue(v: PrivateKey) {
    return v.toBigInt();
  }
  static fromValue<T extends AnyConstructor>(
    this: T,
    v: bigint | PrivateKey
  ): InstanceType<T> {
    if (v instanceof PrivateKey) return v as any;
    return PrivateKey.fromBigInt(v) as any;
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
    let { x, isOdd } = this;
    let y = x.square().mul(x).add(5).sqrt();

    // negate y if its parity is different from the public key's
    let sameParity = y.isOdd().equals(isOdd).toField();
    let sign = sameParity.mul(2).sub(1); // (2*sameParity - 1) == 1 if same parity, -1 if different parity
    y = y.mul(sign);

    return new Group({ x, y });
  }

  /**
   * Creates a {@link PublicKey} from a {@link Group} element.
   * @returns a {@link PublicKey}.
   */
  static fromGroup({ x, y }: Group): PublicKey {
    return PublicKey.fromObject({ x, isOdd: y.isOdd() });
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
  static from(g: { x: Field | bigint; isOdd: Bool | boolean }) {
    return PublicKey.fromObject({ x: Field.from(g.x), isOdd: Bool(g.isOdd) });
  }

  /**
   * Creates an empty {@link PublicKey}.
   * @returns an empty {@link PublicKey}
   */
  static empty<T extends AnyConstructor>(): InstanceType<T> {
    return PublicKey.from({ x: 0n, isOdd: false }) as any;
  }

  /**
   * Checks if a {@link PublicKey} is empty.
   * @returns a {@link Bool}
   */
  isEmpty() {
    // there are no curve points with x === 0
    return this.x.equals(0);
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
      isOdd: isOdd.toBoolean(),
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

  static toValue({ x, isOdd }: PublicKey) {
    return { x: x.toBigInt(), isOdd: isOdd.toBoolean() };
  }
  static fromValue<T extends AnyConstructor>(
    this: T,
    { x, isOdd }: { x: Field | bigint; isOdd: Bool | boolean }
  ): InstanceType<T> {
    return PublicKey.from({ x: Field.from(x), isOdd: Bool(isOdd) }) as any;
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
  static create(privKey: PrivateKey, msg: Field[]): Signature {
    let publicKey = PublicKey.fromPrivateKey(privKey).toGroup();
    let d = privKey.s;

    // we chose an arbitrary prefix for the signature, and it happened to be 'testnet'
    // there's no consequences in practice and the signatures can be used with any network
    // if there needs to be a custom nonce, include it in the message itself
    let kPrime = Scalar.from(
      deriveNonce(
        { fields: msg.map((f) => f.toBigInt()) },
        { x: publicKey.x.toBigInt(), y: publicKey.y.toBigInt() },
        d.toBigInt(),
        'testnet'
      )
    );

    let { x: r, y: ry } = Group.generator.scale(kPrime);
    let k = ry.isOdd().toBoolean() ? kPrime.neg() : kPrime;
    let h = hashWithPrefix(
      signaturePrefix('testnet'),
      msg.concat([publicKey.x, publicKey.y, r])
    );
    let e = Scalar.fromField(h);
    let s = e.mul(d).add(k);
    return new Signature(r, s);
  }

  /**
   * Verifies the {@link Signature} using a message and the corresponding {@link PublicKey}.
   * @returns a {@link Bool}
   */
  verify(publicKey: PublicKey, msg: Field[]): Bool {
    let point = publicKey.toGroup();

    // we chose an arbitrary prefix for the signature, and it happened to be 'testnet'
    // there's no consequences in practice and the signatures can be used with any network
    // if there needs to be a custom nonce, include it in the message itself
    let h = hashWithPrefix(
      signaturePrefix('testnet'),
      msg.concat([point.x, point.y, this.r])
    );

    let r = point.scale(h).neg().add(Group.generator.scale(this.s));
    return r.x.equals(this.r).and(r.y.isEven());
  }

  /**
   * Decodes a base58 encoded signature into a {@link Signature}.
   */
  static fromBase58(signatureBase58: string) {
    let { r, s } = SignatureBigint.fromBase58(signatureBase58);
    return Signature.fromObject({ r: Field(r), s: Scalar.from(s) });
  }
  /**
   * Encodes a {@link Signature} in base58 format.
   */
  toBase58() {
    let r = this.r.toBigInt();
    let s = this.s.toBigInt();
    return SignatureBigint.toBase58({ r, s });
  }
}
