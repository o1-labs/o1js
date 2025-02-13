import { Field, Scalar, Group } from '../wrapped.js';
import { Poseidon } from './poseidon.js';
import { Provable } from '../provable.js';
import { PrivateKey, PublicKey } from './signature.js';
import { bytesToWord, wordToBytes } from '../gadgets/bit-slices.js';
import { Bytes } from '../bytes.js';
import { UInt8 } from '../int.js';
import { chunk } from '../../util/arrays.js';

export {
  encrypt,
  decrypt,
  encryptBytes,
  decryptBytes,
  CipherTextBytes,
  CipherText,
};

type CipherText = {
  publicKey: Group;
  cipherText: Field[];
};
type CipherTextBytes = CipherText & { messageLength: number };

/**
 * Decrypts a {@link CipherText} using a {@link PrivateKey}.
 */
function decrypt(
  { publicKey, cipherText }: CipherText,
  privateKey: PrivateKey
) {
  // key exchange
  const sharedSecret = publicKey.scale(privateKey.s);
  const sponge = new Poseidon.Sponge();
  sponge.absorb(sharedSecret.x);
  const authenticationTag = cipherText.pop();

  // decryption
  const message = [];
  for (let i = 0; i < cipherText.length; i++) {
    // absorb frame tag
    if (i === cipherText.length - 1) sponge.absorb(Field(1));
    else sponge.absorb(Field(0));

    const keyStream = sponge.squeeze();
    const messageChunk = cipherText[i].sub(keyStream);

    // push the message to our final messages
    message.push(messageChunk);

    // absorb the cipher text chunk
    sponge.absorb(cipherText[i]);
  }

  // authentication tag
  sponge.squeeze().assertEquals(authenticationTag!);

  return message;
}

/**
 * Public Key Encryption, encrypts Field elements using a {@link PublicKey}.
 */
function encrypt(message: Field[], otherPublicKey: PublicKey): CipherText {
  // key exchange
  const privateKey = Provable.witness(Scalar, () => Scalar.random());
  const publicKey = Group.generator.scale(privateKey);
  const sharedSecret = otherPublicKey.toGroup().scale(privateKey);

  const sponge = new Poseidon.Sponge();
  sponge.absorb(sharedSecret.x);

  // encryption
  const cipherText = [];
  for (let [n, chunk] of message.entries()) {
    // absorb frame bit
    if (n === message.length - 1) sponge.absorb(Field(1));
    else sponge.absorb(Field(0));

    const keyStream = sponge.squeeze();
    const encryptedChunk = chunk.add(keyStream);
    cipherText.push(encryptedChunk);

    sponge.absorb(encryptedChunk);
  }

  // authentication tag
  const authenticationTag = sponge.squeeze();
  cipherText.push(authenticationTag);

  return { publicKey, cipherText };
}

/**
 * Public Key Encryption, encrypts Bytes using a {@link PublicKey}.
 */
function encryptBytes(
  message: Bytes,
  otherPublicKey: PublicKey
): CipherTextBytes {
  const bytes = message.bytes;
  const messageLength = bytes.length;

  // pad message to a multiple of 31 so they still fit into one field element
  const multipleOf = 31;
  const n = Math.ceil(messageLength / multipleOf) * multipleOf;

  // create the padding
  const padding = Array.from({ length: n - messageLength }, () =>
    UInt8.from(0)
  );

  // convert message into chunks of 31 bytes
  const chunks = chunk(bytes.concat(padding), 31);

  // call into encryption() and convert chunk to field elements
  return {
    ...encrypt(
      chunks.map((chunk) => bytesToWord(chunk)),
      otherPublicKey
    ),
    messageLength,
  };
}

/**
 * Decrypts a {@link CipherText} using a {@link PrivateKey}.
 */
function decryptBytes(cipherText: CipherTextBytes, privateKey: PrivateKey) {
  // calculate padding
  const messageLength = cipherText.messageLength;
  const multipleOf = 31;
  const n = Math.ceil(messageLength / multipleOf) * multipleOf;

  // decrypt plain field elements and convert them into bytes
  const message = decrypt(cipherText, privateKey);
  const bytes = message.map((m) => wordToBytes(m, 31));
  return Bytes.from(bytes.flat().slice(0, messageLength - n));
}
