import { Field, Scalar, Group } from '../wrapped.js';
import { Poseidon } from './poseidon.js';
import { Provable } from '../provable.js';
import { PrivateKey, PublicKey } from './signature.js';
import { bytesToWord, wordToBytes } from '../gadgets/bit-slices.js';
import { Bytes } from '../bytes.js';
import { UInt8 } from '../int.js';

export { encrypt, decrypt, encryptV2, decryptV2 };

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

// v2

function decryptV2(
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

    const withFrameBit = wordToBytes(messageChunk, 32);
    const frameBit = withFrameBit.pop()!;

    if (i === cipherText.length - 1) frameBit.assertEquals(1);
    else frameBit.assertEquals(0);

    message.push(bytesToWord(withFrameBit));

    if (i % 2 === 1) sponge.absorb(cipherText[i - 1]);
    if (i % 2 === 1 || i === cipherText.length - 1)
      sponge.absorb(cipherText[i]);
  }
  // authentication tag
  sponge.squeeze().assertEquals(authenticationTag!);

  return message;
}

function encryptV2(message: Bytes, otherPublicKey: PublicKey): CipherText {
  // pad message to a multiple of 31 so that we can then later append a frame bit to the message
  const bytes = message.bytes;
  const multipleOf = 31;
  let n = Math.ceil(bytes.length / multipleOf) * multipleOf;
  let padding = Array.from({ length: n - bytes.length }, () => UInt8.from(0));

  message.bytes = bytes.concat(padding);

  // convert message into chunks of 31 bytes
  const chunks = message.chunk(31);

  // key exchange
  let privateKey = Provable.witness(Scalar, () => Scalar.random());
  let publicKey = Group.generator.scale(privateKey);
  let sharedSecret = otherPublicKey.toGroup().scale(privateKey);

  let sponge = new Poseidon.Sponge();
  sponge.absorb(sharedSecret.x);

  // frame bits
  const zeroBit = [UInt8.from(0)];
  const oneBit = [UInt8.from(1)];

  // encryption
  let cipherText = [];
  for (let [n, chunk] of chunks.entries()) {
    if (n === chunks.length - 1) {
      // attach the one frame bit if its the last chunk
      chunk = chunk.concat(oneBit);
    } else {
      // pad with zero frame bit
      chunk = chunk.concat(zeroBit);
    }
    console.log('with bit', bytesToWord(chunk).toString());

    let keyStream = sponge.squeeze();
    let encryptedChunk = bytesToWord(chunk).add(keyStream);
    cipherText.push(encryptedChunk);

    // absorb for the auth tag (two at a time for saving permutations)
    if (n % 2 === 1) sponge.absorb(cipherText[n - 1]);
    if (n % 2 === 1 || n === chunks.length - 1) sponge.absorb(cipherText[n]);
  }

  // authentication tag
  let authenticationTag = sponge.squeeze();
  cipherText.push(authenticationTag);

  return { publicKey, cipherText };
}
