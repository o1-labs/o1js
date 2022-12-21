import {
  payments,
  delegations,
  strings,
  keypair,
  signatures,
} from './test-vectors/legacySignatures.js';
import {
  signPayment,
  signStakeDelegation,
  signString,
  verifyPayment,
  verifyStakeDelegation,
  verifyStringSignature,
} from './sign-legacy.js';
import { NetworkId, Signature } from './signature.js';
import { expect } from 'expect';

let { privateKey, publicKey } = keypair;
let networks: NetworkId[] = ['testnet', 'mainnet'];

for (let network of networks) {
  let i = 0;
  let reference = signatures[network];

  for (let payment of payments) {
    let signatureBase58 = signPayment(payment, privateKey, network);
    let signature = Signature.fromBase58(signatureBase58);
    let ref = reference[i++];
    expect(signature.r).toEqual(BigInt(ref.field));
    expect(signature.s).toEqual(BigInt(ref.scalar));
    let ok = verifyPayment(payment, signatureBase58, publicKey, network);
    expect(ok).toEqual(true);
  }

  for (let delegation of delegations) {
    let signatureBase58 = signStakeDelegation(delegation, privateKey, network);
    let signature = Signature.fromBase58(signatureBase58);
    let ref = reference[i++];
    expect(signature.r).toEqual(BigInt(ref.field));
    expect(signature.s).toEqual(BigInt(ref.scalar));
    let ok = verifyStakeDelegation(
      delegation,
      signatureBase58,
      publicKey,
      network
    );
    expect(ok).toEqual(true);
  }

  for (let string of strings) {
    let signatureBase58 = signString(string, privateKey, network);
    let signature = Signature.fromBase58(signatureBase58);
    let ref = reference[i++];
    expect(signature.r).toEqual(BigInt(ref.field));
    expect(signature.s).toEqual(BigInt(ref.scalar));
    let ok = verifyStringSignature(string, signatureBase58, publicKey, network);
    expect(ok).toEqual(true);
  }
}

console.log(
  'legacy signatures match the test vectors and successfully verify! 🎉'
);
process.exit(0);
