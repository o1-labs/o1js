import { Encryption, Encoding, PrivateKey, isReady, Circuit } from 'snarkyjs';

await isReady;

// generate keys
let privateKey = PrivateKey.random();
let publicKey = privateKey.toPublicKey();

// message
let message = 'This is a secret.';
let messageFields = Encoding.stringToFields(message);

// encrypt
let cipherText = Encryption.encrypt(messageFields, publicKey);

// decrypt
let decryptedFields = Encryption.decrypt(cipherText, privateKey);
let decryptedMessage = Encoding.stringFromFields(decryptedFields);

if (decryptedMessage !== message) throw Error('decryption failed');
console.log(`Original message: "${message}"`);
console.log(`Recovered message: "${decryptedMessage}"`);

// the same but in a checked computation

Circuit.runAndCheck(() => {
  // encrypt
  let cipherText = Encryption.encrypt(messageFields, publicKey);

  // decrypt
  let decryptedFields = Encryption.decrypt(cipherText, privateKey);

  messageFields.forEach((m, i) => {
    m.assertEquals(decryptedFields[i]);
  });
});

console.log('everything works!');
