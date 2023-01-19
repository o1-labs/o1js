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
import { NetworkId, Signature } from './signature.js';
import { expect } from 'expect';
import { PublicKey, Scalar } from '../../provable/curve-bigint.js';
import { Field } from '../../provable/field-bigint.js';

let { privateKey, publicKey } = keypair;
let networks: NetworkId[] = ['testnet', 'mainnet'];

for (let network of networks) {
  let i = 0;
  let reference = signatures[network];

  for (let payment of payments) {
    let signature = signPayment(payment, privateKey, network);
    let sig = Signature.fromBase58(signature);
    let ref = reference[i++];
    expect(sig.r).toEqual(BigInt(ref.field));
    expect(sig.s).toEqual(BigInt(ref.scalar));
    let ok = verifyPayment(payment, signature, publicKey, network);
    expect(ok).toEqual(true);
  }

  for (let delegation of delegations) {
    let signature = signStakeDelegation(delegation, privateKey, network);
    let sig = Signature.fromBase58(signature);
    let ref = reference[i++];
    expect(sig.r).toEqual(BigInt(ref.field));
    expect(sig.s).toEqual(BigInt(ref.scalar));
    let ok = verifyStakeDelegation(delegation, signature, publicKey, network);
    expect(ok).toEqual(true);
  }

  for (let string of strings) {
    let signature = signString(string, privateKey, network);
    let sig = Signature.fromBase58(signature);
    let ref = reference[i++];
    expect(sig.r).toEqual(BigInt(ref.field));
    expect(sig.s).toEqual(BigInt(ref.scalar));
    let ok = verifyStringSignature(string, signature, publicKey, network);
    expect(ok).toEqual(true);
  }
}

// negative tests with invalid payments

let validPayment = payments[0];
let amountTooLarge = {
  common: validPayment.common,
  body: {
    ...validPayment.body,
    amount: (2n ** 64n).toString(),
  },
};
let invalidPublicKey: PaymentJson = {
  common: validPayment.common,
  body: {
    ...validPayment.body,
    source: PublicKey.toBase58({ x: 0n, isOdd: 0n }),
  },
};
let signature = Signature.toBase58({ r: Field.random(), s: Scalar.random() });

expect(() => signPayment(amountTooLarge, privateKey, 'mainnet')).toThrow(
  `inputs larger than ${2n ** 64n - 1n} are not allowed`
);
expect(verifyPayment(amountTooLarge, signature, publicKey, 'mainnet')).toEqual(
  false
);

expect(() => signPayment(invalidPublicKey, privateKey, 'mainnet')).toThrow(
  'not a valid group element'
);
expect(
  verifyPayment(invalidPublicKey, signature, publicKey, 'mainnet')
).toEqual(false);

// negative tests with invalid signatures

let garbageSignature = 'garbage';
let signatureFieldTooLarge = Signature.toBase58({
  r: Field.modulus,
  s: Scalar.random(),
});
let signatureScalarTooLarge = Signature.toBase58({
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
