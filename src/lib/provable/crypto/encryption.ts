import { Field, Scalar, Group } from '../wrapped.js';
import { Poseidon } from './poseidon.js';
import { Provable } from '../provable.js';
import { PrivateKey, PublicKey } from './signature.js';

export { encrypt, decrypt, encryptV2, decryptV2 };

type CipherText = {
  publicKey: Group;
  cipherText: Field[];
};

/**
 * Public Key Encryption, using a given array of {@link Field} elements and encrypts it using a {@link PublicKey}.
 */
function encryptV2(message: Field[], otherPublicKey: PublicKey) {
  return encryptInternal(message, otherPublicKey);
}

/**
 * Decrypts a {@link CipherText} using a {@link PrivateKey}.
 */
function decryptV2(cipherText: CipherText, privateKey: PrivateKey) {
  return decryptInternal(cipherText, privateKey);
}

/**
 * @deprecated Use {@link encryptV2} instead. The private key used with this method should _never_ be reused again!
 *
 * Public Key Encryption, using a given array of {@link Field} elements and encrypts it using a {@link PublicKey}.
 */
function encrypt(message: Field[], otherPublicKey: PublicKey) {
  return encryptInternal(message, otherPublicKey, false);
}

/**
 * @deprecated Use {@link decryptV2} instead.
 *
 * Decrypts a {@link CipherText} using a {@link PrivateKey}.
 */
function decrypt(cipherText: CipherText, privateKey: PrivateKey) {
  return decryptInternal(cipherText, privateKey, false);
}

function encryptInternal(
  message: Field[],
  otherPublicKey: PublicKey,
  frameBit = true
) {
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
    if (message.length - 1 === i && frameBit)
      encryptedChunk = encryptedChunk.add(1);
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

function decryptInternal(
  { publicKey, cipherText }: CipherText,
  privateKey: PrivateKey,
  frameBit = true
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
    if (cipherText.length - 1 === i && frameBit)
      messageChunk = messageChunk.sub(1);
    message.push(messageChunk);
    if (i % 2 === 1) sponge.absorb(cipherText[i - 1]);
    if (i % 2 === 1 || i === cipherText.length - 1)
      sponge.absorb(cipherText[i]);
  }
  // authentication tag
  sponge.squeeze().assertEquals(authenticationTag!);

  return message;
}
