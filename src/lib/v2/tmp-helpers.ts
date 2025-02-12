import { promises as fs } from 'fs';
import sodium from 'libsodium-wrappers-sumo';
import { fromBase58Check, toBase58Check } from '../../lib/util/base58.js';
import { versionBytes } from '../../bindings/crypto/constants.js';
import {
  PrivateKey as PrivateKeyBigInt,
  PublicKey as PublicKeyBigInt,
} from '../../mina-signer/src/curve-bigint.js';
import { PrivateKey, PublicKey } from '../provable/crypto/signature.js';

const VERSION_BYTE = 2;

type SecureBoxJson = {
  box_primitive: string;
  pw_primitive: string;
  nonce: string;
  pwsalt: string;
  pwdiff: [number, number];
  ciphertext: string;
};

export async function secureBoxToBase58(
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
  let privateKeyBigint = PrivateKeyBigInt.fromBytes([...privateKeyBytes]);
  let publicKeyBigint = PrivateKeyBigInt.toPublicKey(privateKeyBigint);
  let publicKey = PublicKeyBigInt.toBase58(publicKeyBigint);
  return { privateKey, publicKey };
}

export async function readKeypair(filepath: string, password: string) {
  const content = await fs.readFile(filepath);
  const json = JSON.parse(content.toString());
  const { privateKey, publicKey } = await secureBoxToBase58(json, password);
  return {
    privateKey: PrivateKey.fromBase58(privateKey),
    publicKey: PublicKey.fromBase58(publicKey),
  };
}
