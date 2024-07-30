import {
  Bytes,
  PrivateKey,
  initializeBindings,
  Encryption,
  Encoding,
  Provable,
} from 'o1js';

await initializeBindings();

class Bytes256 extends Bytes(256) {}
const priv = PrivateKey.random();
const pub = priv.toPublicKey();

const plainMsg = 'Hello world';
const message = Bytes256.fromString(plainMsg);
console.log('plain message', plainMsg);
const cipher = Encryption.encryptV2(message, pub);
const plainText = Encryption.decryptV2(cipher, priv);
console.log('decrypted message', Buffer.from(plainText.toBytes()).toString());
