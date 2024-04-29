import {
  payments,
  delegations,
  strings,
  keypair,
  signatures,
} from './test-vectors/legacySignatures.js';
import {
  PaymentJson,
  signPayment,
  signStakeDelegation,
  signString,
  verifyPayment,
  verifyStakeDelegation,
  verifyStringSignature,
} from './sign-legacy.js';
import { Signature, SignatureJson } from './signature.js';
import { expect } from 'expect';
import { PublicKey, Scalar } from './curve-bigint.js';
import { Field } from './field-bigint.js';
import { Random, test } from '../../lib/testing/property.js';
import { RandomTransaction } from './random-transaction.js';
import { NetworkId } from './types.js';

let { privateKey, publicKey } = keypair;
let networks: NetworkId[] = ['testnet', 'mainnet'];

// test hard-coded cases against reference signature

for (let network of networks) {
  let i = 0;
  let reference = signatures[NetworkId.toString(network)];

  for (let payment of payments) {
    let signature = signPayment(payment, privateKey, network);
    let sig = Signature.fromJSON(signature);
    let ref = reference[i++];
    expect(sig.r).toEqual(BigInt(ref.field));
    expect(sig.s).toEqual(BigInt(ref.scalar));
    let ok = verifyPayment(payment, signature, publicKey, network);
    expect(ok).toEqual(true);
  }

  for (let delegation of delegations) {
    let signature = signStakeDelegation(delegation, privateKey, network);
    let sig = Signature.fromJSON(signature);
    let ref = reference[i++];
    expect(sig.r).toEqual(BigInt(ref.field));
    expect(sig.s).toEqual(BigInt(ref.scalar));
    let ok = verifyStakeDelegation(delegation, signature, publicKey, network);
    expect(ok).toEqual(true);
  }

  for (let string of strings) {
    let signature = signString(string, privateKey, network);
    let sig = Signature.fromJSON(signature);
    let ref = reference[i++];
    expect(sig.r).toEqual(BigInt(ref.field));
    expect(sig.s).toEqual(BigInt(ref.scalar));
    let ok = verifyStringSignature(string, signature, publicKey, network);
    expect(ok).toEqual(true);
  }
}

// sign & verify with randomly generated payments

test(
  RandomTransaction.payment,
  Random.json.keypair,
  Random.json.privateKey,
  (payment, { privateKey, publicKey }, otherKey, assert) => {
    let verify = (sig: SignatureJson, network: NetworkId) =>
      verifyPayment(payment, sig, publicKey, network);

    // valid signatures & verification matrix
    let testnet = signPayment(payment, privateKey, 'testnet');
    let mainnet = signPayment(payment, privateKey, 'mainnet');
    assert(verify(testnet, 'testnet') === true);
    assert(verify(testnet, 'mainnet') === false);
    assert(verify(mainnet, 'testnet') === false);
    assert(verify(mainnet, 'mainnet') === true);

    // fails when signing with wrong private key
    let testnetWrong = signPayment(payment, otherKey, 'testnet');
    let mainnetWrong = signPayment(payment, otherKey, 'mainnet');
    assert(verify(testnetWrong, 'testnet') === false);
    assert(verify(mainnetWrong, 'mainnet') === false);
  }
);

// generative negative tests - any invalid payment should fail

test.negative(
  RandomTransaction.payment.invalid!,
  Random.json.privateKey,
  RandomTransaction.networkId,
  (payment, privateKey, network) => signPayment(payment, privateKey, network)
);

// negative tests with invalid payments

let validPayment = payments[0];
let amountTooLarge = {
  common: validPayment.common,
  body: {
    ...validPayment.body,
    amount: (2n ** 64n).toString(),
  },
};
let signature = Signature.toJSON({ r: Field.random(), s: Scalar.random() });

expect(() => signPayment(amountTooLarge, privateKey, 'mainnet')).toThrow(
  `inputs larger than ${2n ** 64n - 1n} are not allowed`
);
expect(verifyPayment(amountTooLarge, signature, publicKey, 'mainnet')).toEqual(
  false
);

// negative tests with invalid signatures

let garbageSignature = { field: 'garbage', scalar: 'garbage' };
let signatureFieldTooLarge = Signature.toJSON({
  r: Field.modulus,
  s: Scalar.random(),
});
let signatureScalarTooLarge = Signature.toJSON({
  r: Field.random(),
  s: Scalar.modulus,
});

expect(
  verifyPayment(validPayment, garbageSignature, publicKey, 'mainnet')
).toEqual(false);
expect(
  verifyPayment(validPayment, signatureFieldTooLarge, publicKey, 'mainnet')
).toEqual(false);
expect(
  verifyPayment(validPayment, signatureScalarTooLarge, publicKey, 'mainnet')
).toEqual(false);

console.log(
  'legacy signatures match the test vectors and successfully verify! 🎉'
);
process.exit(0);
