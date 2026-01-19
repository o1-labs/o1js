import assert from 'assert';
import { KeystoreJson, secureBoxToBase58 } from './secure-box.js';

const keyfileExample: KeystoreJson = {
  box_primitive: 'xsalsa20poly1305',
  pw_primitive: 'argon2i',
  nonce: '7bhBLFhx8v8uR9N9gVxbK721VZRqQ9X4zEh4xAq',
  pwsalt: 'AnJ9HJKcGdiWpssG76s7p3Hzh3TG',
  pwdiff: [134217728, 6],
  ciphertext: 'BRKKEJcPFrcmsJjkWunysYrpb65hQgBeqzBDRbzrRPhS49CEHVgn48X21Peq9MwAzKeEPdFFB',
};
const keyFilePassword = '123456';
const result = {
  privateKey: 'EKF4XaKafQXHUHTxSA9qTYsBxk9VV5oGDe4CmcZY52bsQFs1GnRs',
  publicKey: 'B62qkhhWkJdZx9MAZHd67VqBAX7FVbzSizqsFYqMKvQu4kPNyFxxCmB',
};

let actualResult = await secureBoxToBase58(keyfileExample, keyFilePassword);
assert.deepStrictEqual(actualResult, result, 'secureBoxToBase58 did not produce expected result');
