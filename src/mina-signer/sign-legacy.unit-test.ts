import {
  payments,
  delegations,
  keypair,
  signatures,
} from './test-vectors/legacySignatures.js';
import { signPayment, signStakeDelegation } from './sign-legacy.js';
import { NetworkId, Signature } from './signature.js';
import { expect } from 'expect';

let { privateKey } = keypair;
let networks: NetworkId[] = ['testnet', 'mainnet'];

for (let network of networks) {
  let i = 0;
  let reference = signatures[network];

  for (let payment of payments) {
    let signatureBase58 = signPayment(payment, privateKey, network);
    let signature = Signature.fromBase58(signatureBase58);
    let ref = reference[i++];
    console.log({
      signature,
      ref,
    });
    expect(signature.r).toEqual(BigInt(ref.field));
    expect(signature.s).toEqual(BigInt(ref.scalar));
  }

  for (let delegation of delegations) {
    let signatureBase58 = signStakeDelegation(delegation, privateKey, network);
    let signature = Signature.fromBase58(signatureBase58);
    let ref = reference[i++];
    expect(signature.r).toEqual(BigInt(ref.field));
    expect(signature.s).toEqual(BigInt(ref.scalar));
  }

  // TODO strings
}
