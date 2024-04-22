import {
  Encryption,
  Encoding,
  PrivateKey,
  Provable,
  initializeBindings,
} from 'o1js';

await initializeBindings();

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

await Provable.runAndCheck(() => {
  // encrypt
  let cipherText = Encryption.encrypt(messageFields, publicKey);

  // decrypt
  let decryptedFields = Encryption.decrypt(cipherText, privateKey);

  messageFields.forEach((m, i) => {
    m.assertEquals(decryptedFields[i]);
  });
});

// With a longer message
message = JSON.stringify({
  coinbase: {
    btc: 40000.0,
    eth: 3000.0,
    usdc: 1.0,
    ada: 1.02,
    avax: 70.43,
    mina: 2.13,
  },
  binance: {
    btc: 39999.0,
    eth: 3001.0,
    usdc: 1.01,
    ada: 0.99,
    avax: 70.21,
    mina: 2.07,
  },
});
messageFields = Encoding.stringToFields(message);

// encrypt
cipherText = Encryption.encrypt(messageFields, publicKey);

// decrypt
decryptedFields = Encryption.decrypt(cipherText, privateKey);
decryptedMessage = Encoding.stringFromFields(decryptedFields);

if (decryptedMessage !== message) throw Error('decryption failed');
console.log(`Original message: "${message}"`);
console.log(`Recovered message: "${decryptedMessage}"`);

// the same but in a checked computation

await Provable.runAndCheck(() => {
  // encrypt
  let cipherText = Encryption.encrypt(messageFields, publicKey);

  // decrypt
  let decryptedFields = Encryption.decrypt(cipherText, privateKey);

  messageFields.forEach((m, i) => {
    m.assertEquals(decryptedFields[i]);
  });
});

console.log('everything works!');
