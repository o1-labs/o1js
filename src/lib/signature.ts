import { Poseidon, Group, Field, Bool, Scalar } from '../snarky';
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
