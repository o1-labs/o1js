import { argon2i } from 'hash-wasm';
import nacl from 'tweetnacl';
import { versionBytes } from '../../bindings/crypto/constants.js';
import { fromBase58Check, toBase58Check } from '../../lib/util/base58.js';
import { PrivateKey, PublicKey } from './curve-bigint.js';

export { KeystoreJson, secureBoxToBase58 };

const VERSION_BYTE = 2;
type KeystoreJson = {
  box_primitive: string;
  pw_primitive: string;
  nonce: string;
  pwsalt: string;
  pwdiff: [number, number];
  ciphertext: string;
};

async function secureBoxToBase58(
  keyfile: KeystoreJson,
  password: string
): Promise<{ publicKey: string; privateKey: string }> {
  let pwsalt = Uint8Array.from(fromBase58Check(keyfile.pwsalt, VERSION_BYTE));

  let key = await argon2i({
    password,
    salt: pwsalt,
    parallelism: 1,
    iterations: keyfile.pwdiff[1],
    memorySize: Math.max(8, Math.floor(keyfile.pwdiff[0] / 1024)),
    hashLength: 32,
    outputType: 'binary',
  });

  let ciphertext = Uint8Array.from(fromBase58Check(keyfile.ciphertext, VERSION_BYTE));
  let nonce = Uint8Array.from(fromBase58Check(keyfile.nonce, VERSION_BYTE));
  let privateKeyBytes = nacl.secretbox.open(ciphertext, nonce, key);
  if (privateKeyBytes === null) throw new Error('Invalid password or corrupt secure box');
  let privateKey = toBase58Check(privateKeyBytes, versionBytes.privateKey);
  let privateKeyBigint = PrivateKey.fromBytes([...privateKeyBytes]);
  let publicKeyBigint = PrivateKey.toPublicKey(privateKeyBigint);
  let publicKey = PublicKey.toBase58(publicKeyBigint);
  return { privateKey, publicKey };
}
