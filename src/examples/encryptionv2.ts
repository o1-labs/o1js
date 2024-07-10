import {
  Bytes,
  PrivateKey,
  initializeBindings,
  Encryption,
  Encoding,
  Provable,
} from 'o1js';

await initializeBindings();

class Bytes32 extends Bytes(31) {}
const priv = PrivateKey.random();
const pub = priv.toPublicKey();

const plainMsg = 'Hello world';
const message = Bytes.fromString(plainMsg);
console.log('plain message', plainMsg);
const cipher = Encryption.encryptV2(Bytes32.from(message), pub);
const plainText = Encryption.decryptV2(cipher, priv);

console.log(
  'decrypted message',
  Buffer.from(Bytes.from(plainText).toBytes()).toString()
);
