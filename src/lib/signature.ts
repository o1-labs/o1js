import { Group, Field, Bool, Scalar, Ledger, Circuit } from '../snarky.js';
import { prop, CircuitValue, AnyConstructor } from './circuit_value.js';
import { Poseidon } from './hash.js';

// external API
export { PrivateKey, PublicKey, Signature };

/**
 * A signing key. You can generate one via [[random]].
 */
class PrivateKey extends CircuitValue {
  @prop s: Scalar;

  /**
   * You can use this method to generate a private key. You can then obtain
   * the associated public key via [[toPublicKey]]. And generate signatures
   * via [[Signature.create]].
   *
   * @returns a new [[PrivateKey]].
   */
  static random(): PrivateKey {
    return new PrivateKey(Scalar.random());
  }

  /**
   * Deserializes a list of bits into a [[PrivateKey]].
   *
   * @param bs a list of [[Bool]]s.
   * @returns a [[PrivateKey]].
   */
  static ofBits(bs: Bool[]): PrivateKey {
    return new PrivateKey(Scalar.ofBits(bs));
  }

  /**
   * Derives the associated public key.
   *
   * @returns a [[PublicKey]].
   */
  toPublicKey(): PublicKey {
    return PublicKey.fromPrivateKey(this);
  }

  static fromBase58(privateKeyBase58: string) {
    let scalar = Ledger.privateKeyOfString(privateKeyBase58);
    return new PrivateKey(scalar);
  }
  toBase58() {
    return PrivateKey.toBase58(this);
  }
  // static version, to operate on non-class versions of this type
  static toBase58(privateKey: { s: Scalar }) {
    return Ledger.privateKeyToString(privateKey);
  }
}

// TODO: this doesn't have a non-default check method yet. does it need one?
class PublicKey extends CircuitValue {
  // compressed representation of a curve point, where `isOdd` is the least significant bit of `y`
  @prop x: Field;
  @prop isOdd: Bool;

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
    return new Group(x, y);
  }

  static fromGroup({ x, y }: Group): PublicKey {
    let isOdd = y.toBits()[0];
    return PublicKey.fromObject({ x, isOdd });
  }

  static fromPrivateKey({ s }: PrivateKey): PublicKey {
    return PublicKey.fromGroup(Group.generator.scale(s));
  }

  static from(g: { x: Field; isOdd: Bool }) {
    return PublicKey.fromObject(g);
  }

  static empty() {
    return PublicKey.from({ x: Field.zero, isOdd: Bool(false) });
  }

  isEmpty() {
    // there are no curve points with x === 0
    return this.x.isZero();
  }

  static fromBase58(publicKeyBase58: string) {
    let pk = Ledger.publicKeyOfString(publicKeyBase58);
    return PublicKey.from(pk);
  }
  toBase58() {
    return PublicKey.toBase58(this);
  }
  // static version, to operate on non-class versions of this type
  static toBase58(publicKey: PublicKey) {
    return Ledger.publicKeyToString(publicKey);
  }
  static toJSON(publicKey: PublicKey) {
    return publicKey.toBase58();
  }
  static fromJSON<T extends AnyConstructor>(this: T, publicKey: string) {
    return PublicKey.fromBase58(publicKey) as InstanceType<T>;
  }
}

class Signature extends CircuitValue {
  @prop r: Field;
  @prop s: Scalar;

  static create(privKey: PrivateKey, msg: Field[]): Signature {
    const publicKey = PublicKey.fromPrivateKey(privKey).toGroup();
    const d = privKey.s;
    const kPrime = Scalar.random();
    let { x: r, y: ry } = Group.generator.scale(kPrime);
    const k = ry.toBits()[0].toBoolean() ? kPrime.neg() : kPrime;
    const e = Scalar.ofBits(
      Poseidon.hash(msg.concat([publicKey.x, publicKey.y, r])).toBits()
    );
    const s = e.mul(d).add(k);
    return new Signature(r, s);
  }

  verify(publicKey: PublicKey, msg: Field[]): Bool {
    const point = publicKey.toGroup();
    let e = Scalar.ofBits(
      Poseidon.hash(msg.concat([point.x, point.y, this.r])).toBits()
    );
    let r = point.scale(e).neg().add(Group.generator.scale(this.s));
    return Bool.and(r.x.equals(this.r), r.y.toBits()[0].equals(false));
  }
}
