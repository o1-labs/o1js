import sodium from 'libsodium-wrappers-sumo';
import assert from 'assert';
import { fromBase58Check, toBase58Check } from '../../lib/util/base58.js';
import { versionBytes } from '../../bindings/crypto/constants.js';
import { PrivateKey, PublicKey } from '../src/curve-bigint.js';

const VERSION_BYTE = 2;

type SecureBoxJson = {
  box_primitive: string;
  pw_primitive: string;
  nonce: string;
  pwsalt: string;
  pwdiff: [number, number];
  ciphertext: string;
};

async function secureBoxToBase58(
  keyfile: SecureBoxJson,
  keyfilePassword: string
) {
  await sodium.ready;

  let pwsalt = Uint8Array.from(fromBase58Check(keyfile.pwsalt, VERSION_BYTE));

  let key = sodium.crypto_pwhash(
    32,
    keyfilePassword,
    pwsalt,
    keyfile.pwdiff[1],
    keyfile.pwdiff[0],
    sodium.crypto_pwhash_ALG_ARGON2I13
  );

  let ciphertext = Uint8Array.from(
    fromBase58Check(keyfile.ciphertext, VERSION_BYTE)
  );
  let nonce = Uint8Array.from(fromBase58Check(keyfile.nonce, VERSION_BYTE));
  let privateKeyBytes = sodium.crypto_secretbox_open_easy(
    ciphertext,
    nonce,
    key,
    'uint8array'
  );
  let privateKey = toBase58Check(privateKeyBytes, versionBytes.privateKey);
  let privateKeyBigint = PrivateKey.fromBytes([...privateKeyBytes]);
  let publicKeyBigint = PrivateKey.toPublicKey(privateKeyBigint);
  let publicKey = PublicKey.toBase58(publicKeyBigint);
  return { privateKey, publicKey };
}

// example data

const keyfileExample: SecureBoxJson = {
  box_primitive: 'xsalsa20poly1305',
  pw_primitive: 'argon2i',
  nonce: '7bhBLFhx8v8uR9N9gVxbK721VZRqQ9X4zEh4xAq',
  pwsalt: 'AnJ9HJKcGdiWpssG76s7p3Hzh3TG',
  pwdiff: [134217728, 6],
  ciphertext:
    'BRKKEJcPFrcmsJjkWunysYrpb65hQgBeqzBDRbzrRPhS49CEHVgn48X21Peq9MwAzKeEPdFFB',
};
const keyFilePassword = '123456';
const result = {
  privateKey: 'EKF4XaKafQXHUHTxSA9qTYsBxk9VV5oGDe4CmcZY52bsQFs1GnRs',
  publicKey: 'B62qkhhWkJdZx9MAZHd67VqBAX7FVbzSizqsFYqMKvQu4kPNyFxxCmB',
};

let actualResult = await secureBoxToBase58(keyfileExample, keyFilePassword);
assert.deepStrictEqual(actualResult, result);
console.log('worked');
