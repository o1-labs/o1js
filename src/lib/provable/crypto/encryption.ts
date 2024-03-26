import { Field, Scalar, Group } from '../wrapped.js';
import { Poseidon } from './poseidon.js';
import { Provable } from '../provable.js';
import { PrivateKey, PublicKey } from './signature.js';

export { encrypt, decrypt };

type CipherText = {
  publicKey: Group;
  cipherText: Field[];
};

/**
 * Public Key Encryption, using a given array of {@link Field} elements and encrypts it using a {@link PublicKey}.
 */
function encrypt(message: Field[], otherPublicKey: PublicKey) {
  // key exchange
  let privateKey = Provable.witness(Scalar, () => Scalar.random());
  let publicKey = Group.generator.scale(privateKey);
  let sharedSecret = otherPublicKey.toGroup().scale(privateKey);

  let sponge = new Poseidon.Sponge();
  sponge.absorb(sharedSecret.x); // don't think we need y, that's enough entropy

  // encryption
  let cipherText = [];
  for (let i = 0; i < message.length; i++) {
    let keyStream = sponge.squeeze();
    let encryptedChunk = message[i].add(keyStream);
    cipherText.push(encryptedChunk);
    // absorb for the auth tag (two at a time for saving permutations)
    if (i % 2 === 1) sponge.absorb(cipherText[i - 1]);
    if (i % 2 === 1 || i === message.length - 1) sponge.absorb(cipherText[i]);
  }
  // authentication tag
  let authenticationTag = sponge.squeeze();
  cipherText.push(authenticationTag);

  return { publicKey, cipherText };
}

/**
 * Decrypts a {@link CipherText} using a {@link PrivateKey}.^
 */
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
  for (let i = 0; i < cipherText.length; i++) {
    let keyStream = sponge.squeeze();
    let messageChunk = cipherText[i].sub(keyStream);
    message.push(messageChunk);
    if (i % 2 === 1) sponge.absorb(cipherText[i - 1]);
    if (i % 2 === 1 || i === cipherText.length - 1)
      sponge.absorb(cipherText[i]);
  }
  // authentication tag
  sponge.squeeze().assertEquals(authenticationTag!);

  return message;
}
