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
  publicKey: Group;
  cipherText: Field[];
};

function encrypt(message: Field[], otherPublicKey: PublicKey) {
  // key exchange
  let privateKey = Scalar.random();
  let publicKey = Group.generator.scale(privateKey);
  let sharedSecret = otherPublicKey.g.scale(privateKey);

  let sponge = new Poseidon.Sponge();
  sponge.absorb(sharedSecret.x); // don't think we need y, that's enough entropy

  // encryption
  let cipherText = [];
  for (let messageChunk of message) {
    let keyStream = sponge.squeeze();
    let encryptedChunk = messageChunk.add(keyStream);
    sponge.absorb(encryptedChunk); // absorb for the auth tag
    cipherText.push(encryptedChunk);
  }
  // authentication tag
  let authenticationTag = sponge.squeeze();
  cipherText.push(authenticationTag);

  return { publicKey, cipherText };
}

function decrypt(
  { publicKey, cipherText }: CipherText,
  privateKey: PrivateKey
) {
  // key exchange
  let sharedSecret = publicKey.scale(privateKey.s);

  let sponge = new Poseidon.Sponge();
  sponge.absorb(sharedSecret.x);
  let authenticationTag = cipherText.pop();

  // decryption
  let message = [];
  for (let encryptedChunk of cipherText) {
    let keyStream = sponge.squeeze();
    let messageChunk = encryptedChunk.sub(keyStream);
    sponge.absorb(encryptedChunk);
    message.push(messageChunk);
  }
  // authentication tag
  sponge.squeeze().assertEquals(authenticationTag!);

  return message;
}
