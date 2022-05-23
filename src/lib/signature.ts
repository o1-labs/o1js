import { Poseidon, Group, Field, Bool, Scalar, Ledger, Types } from '../snarky';
import { prop, CircuitValue } from './circuit_value';

/**
 * A signing key. You can generate one via [[random]].
 */
export class PrivateKey extends CircuitValue {
  @prop s: Scalar;

  constructor(s: Scalar) {
    super();
    this.s = s;
  }

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
    return new PublicKey(Group.generator.scale(this.s));
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

export class PublicKey extends CircuitValue {
  @prop g: Group;

  constructor(g: Group) {
    super();
    this.g = g;
  }

  static fromPrivateKey(p: PrivateKey): PublicKey {
    return p.toPublicKey();
  }

  static empty() {
    return new PublicKey(new Group(Field.zero, Field.zero));
  }

  isEmpty() {
    // there are no curve points with x === 0
    return this.g.x.isZero();
  }

  static fromBase58(publicKeyBase58: string) {
    let group = Ledger.publicKeyOfString(publicKeyBase58);
    return new PublicKey(group);
  }
  toBase58() {
    return PublicKey.toBase58(this);
  }
  // static version, to operate on non-class versions of this type
  static toBase58(publicKey: Types.PublicKey) {
    return Ledger.publicKeyToString(publicKey);
  }
}

export class Signature extends CircuitValue {
  @prop r: Field;
  @prop s: Scalar;

  constructor(r: Field, s: Scalar) {
    super();
    this.r = r;
    this.s = s;
  }

  static create(privKey: PrivateKey, msg: Field[]): Signature {
    const { g: publicKey } = PublicKey.fromPrivateKey(privKey);
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
    const pubKey = publicKey.g;
    let e = Scalar.ofBits(
      Poseidon.hash(msg.concat([pubKey.x, pubKey.y, this.r])).toBits()
    );
    let r = pubKey.scale(e).neg().add(Group.generator.scale(this.s));
    return Bool.and(r.x.equals(this.r), r.y.toBits()[0].equals(false));
  }
}
