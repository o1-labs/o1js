import assert from 'assert';
import {
  Bytes,
  PrivateKey,
  initializeBindings,
  Encryption,
  Encoding,
} from 'o1js';

await initializeBindings();

class Bytes256 extends Bytes(256) {}
const priv = PrivateKey.random();
const pub = priv.toPublicKey();

const plainMsg = 'The quick brown fox jumped over the angry dog.';

console.log('en/decryption of field elements');
const cipher2 = Encryption.encrypt(Encoding.stringToFields(plainMsg), pub);
const plainText2 = Encryption.decrypt(cipher2, priv);

assert(
  Encoding.stringFromFields(plainText2) === plainMsg,
  'Plain message and decrypted message are the same'
);

console.log('en/decryption of bytes');
const message = Bytes256.fromString(plainMsg);
console.log('plain message', plainMsg);
const cipher = Encryption.encryptBytes(message, pub);
const plainText = Encryption.decryptBytes(cipher, priv);
console.log('decrypted message', Buffer.from(plainText.toBytes()).toString());
