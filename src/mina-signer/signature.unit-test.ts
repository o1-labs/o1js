// unit tests dedicated to testing consistency of the signature algorithm
import { expect } from 'expect';
import {
  sign,
  Signature,
  signFieldElement,
  verify,
  verifyFieldElement,
} from './signature.js';
import { isReady, Ledger, Field as FieldSnarky, shutdown } from '../snarky.js';
import { Field, HashInput } from '../provable/field-bigint.js';
import { PrivateKey, PublicKey } from '../provable/curve-bigint.js';
import { PrivateKey as PrivateKeySnarky } from '../lib/signature.js';
import { p } from '../js_crypto/finite_field.js';
import { AccountUpdate } from '../provable/gen/transaction-bigint.js';

await isReady;

// check consistency with OCaml, where we expose the function to sign 1 field element with "testnet"
function checkConsistentSingle(
  msg: Field,
  key: PrivateKey,
  keySnarky: PrivateKeySnarky,
  pk: PublicKey
) {
  let sigTest = signFieldElement(msg, key, 'testnet');
  let sigMain = signFieldElement(msg, key, 'mainnet');
  // verify
  let okTestnetTestnet = verifyFieldElement(sigTest, msg, pk, 'testnet');
  let okMainnetTestnet = verifyFieldElement(sigMain, msg, pk, 'testnet');
  let okTestnetMainnet = verifyFieldElement(sigTest, msg, pk, 'mainnet');
  let okMainnetMainnet = verifyFieldElement(sigMain, msg, pk, 'mainnet');
  expect(okTestnetTestnet).toEqual(true);
  expect(okMainnetTestnet).toEqual(false);
  expect(okTestnetMainnet).toEqual(false);
  expect(okMainnetMainnet).toEqual(true);
  // consistent with OCaml
  let actualSigTestnet = Ledger.signFieldElement(FieldSnarky(msg), keySnarky);
  expect(Signature.toBase58(sigTest)).toEqual(actualSigTestnet);
}

// check that various multi-field hash inputs can be verified
function checkCanVerify(msg: HashInput, key: PrivateKey, pk: PublicKey) {
  let sigTest = sign(msg, key, 'testnet');
  let sigMain = sign(msg, key, 'mainnet');
  // verify
  let okTestnetTestnet = verify(sigTest, msg, pk, 'testnet');
  let okMainnetTestnet = verify(sigMain, msg, pk, 'testnet');
  let okTestnetMainnet = verify(sigTest, msg, pk, 'mainnet');
  let okMainnetMainnet = verify(sigMain, msg, pk, 'mainnet');
  expect(okTestnetTestnet).toEqual(true);
  expect(okMainnetTestnet).toEqual(false);
  expect(okTestnetMainnet).toEqual(false);
  expect(okMainnetMainnet).toEqual(true);
}

// check with different random private keys
for (let i = 0; i < 10; i++) {
  let key = PrivateKey.random();
  let keySnarky = PrivateKeySnarky.fromBase58(PrivateKey.toBase58(key));
  let publicKey = PrivateKey.toPublicKey(key);

  // hard coded single field elements
  let hardcoded = [0n, 1n, 2n, p - 1n];
  for (let x of hardcoded) {
    checkConsistentSingle(x, key, keySnarky, publicKey);
  }
  // random single field elements
  for (let i = 0; i < 10; i++) {
    let x = Field.random();
    checkConsistentSingle(x, key, keySnarky, publicKey);
  }
  // hard-coded multi-element hash inputs
  let messages: HashInput[] = [
    { fields: [0n, 0n, 0n] },
    { fields: [4n, 20n, 120398120n] },
    {
      fields: [1n, p - 1n],
      packed: [
        [0n, 0],
        [1n, 1],
      ],
    },
    {
      packed: [
        [0xffn, 8],
        [0xffffn, 16],
        [0xffff_ffffn, 32],
        [0xffff_ffff_ffff_ffffn, 64],
      ],
    },
    AccountUpdate.toInput(AccountUpdate.emptyValue()),
  ];
  for (let msg of messages) {
    checkCanVerify(msg, key, publicKey);
  }
}

console.log(
  "signatures are consistent or verify / don't verify as expected! 🎉"
);

shutdown();
