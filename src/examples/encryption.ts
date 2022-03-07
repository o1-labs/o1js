import { Encryption, Encoding, PrivateKey } from 'snarkyjs';

// generate keys
let privateKey = PrivateKey.random();
let publicKey = privateKey.toPublicKey();

// message
let message = 'This is a secret.';
let messageFields = Encoding.stringToFields(message);

// encrypt
let cipherText = Encryption.encrypt(messageFields, publicKey);

// decrypt
let decryptedMessageFields = Encryption.decrypt(cipherText, privateKey);
let decryptedMessage = Encoding.stringFromFields(decryptedMessageFields);

if (decryptedMessage !== message) throw Error('decryption failed');
console.log(`Original message: "${message}"`);
console.log(`Recovered message: "${decryptedMessage}"`);
