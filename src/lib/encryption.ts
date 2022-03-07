import { Poseidon, Group, Field, Scalar } from '../snarky';
import { PrivateKey, PublicKey } from './signature';

export { encrypt, decrypt };

class Sponge {
  sponge: unknown;

  constructor() {
    this.sponge = (Poseidon as any).spongeCreate()();
  }

  absorb(x: Field) {
    // console.log(this.sponge, x);
    (Poseidon as any).spongeAbsorb(this.sponge, x);
  }

  squeeze() {
    return (Poseidon as any).spongeSqueeze(this.sponge);
  }
}

Poseidon.Sponge = Sponge;

type CipherText = {
  c1: Group;
  c2: Group;
  cipherText: Field[];
};

function encrypt(message: Field[], otherPublicKey: PublicKey) {
  const r = Group.generator.scale(Scalar.random()); // inefficient Group.random
  const y = Scalar.random();

  const c1 = Group.generator.scale(y);
  // c2 is a "blinded" version of r. r can be recovered from [c1, c2]
  // if you have the private key corresponding to h
  const c2 = r.add(otherPublicKey.g.scale(y));

  // Now, r is a secret known only to the posessor of h's private key,
  // so, we can use it to initialize a Poseidon sponge expand r out into
  // a stream of field elements known only to the posessor of h's private key.
  //
  // We then use that stream of field elements to mask the message by adding
  // them together.
  let sponge = new Poseidon.Sponge();
  sponge.absorb(r.x);
  sponge.absorb(r.y);

  let cipherText = [];
  for (let i = 0; i < message.length; ++i) {
    let x = sponge.squeeze();
    cipherText.push(message[i].add(x));
  }

  return { c1, c2, cipherText };
}

function decrypt({ c1, c2, cipherText }: CipherText, privateKey: PrivateKey) {
  // recover r from c1, c2
  let r = c2.sub(c1.scale(privateKey.s));

  // We can now compute the same stream of field elements used in encryption
  let sponge = new Poseidon.Sponge();
  sponge.absorb(r.x);
  sponge.absorb(r.y);

  // Unmask m to get msg
  let msg = [];
  for (let i = 0; i < cipherText.length; ++i) {
    let x = sponge.squeeze();
    msg.push(cipherText[i].sub(x));
  }

  return msg;
}
