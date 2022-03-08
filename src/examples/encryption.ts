import { Encryption, Encoding, PrivateKey } from 'snarkyjs';

// generate keys
let privateKey = PrivateKey.random();
let publicKey = privateKey.toPublicKey();

// message
let message = 'This is a secret.';
let messageFields = Encoding.Bijective.Fp.fromString(message);

// encrypt
let cipherText = Encryption.encrypt(messageFields, publicKey);

// decrypt
let decryptedFields = Encryption.decrypt(cipherText, privateKey);
let decryptedMessage = Encoding.Bijective.Fp.toString(decryptedFields);

if (decryptedMessage !== message) throw Error('decryption failed');
console.log(`Original message: "${message}"`);
console.log(`Recovered message: "${decryptedMessage}"`);
