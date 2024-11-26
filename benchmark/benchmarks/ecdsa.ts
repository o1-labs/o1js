/**
 * ECDSA benchmarks
 */

import { Provable } from 'o1js';
import {
  Bytes32,
  Ecdsa,
  Secp256k1,
  keccakAndEcdsa,
} from '../../src/examples/crypto/ecdsa/ecdsa.js';
import { benchmark } from '../benchmark.js';

export { EcdsaBenchmarks };

let privateKey = Secp256k1.Scalar.random();
let publicKey = Secp256k1.generator.scale(privateKey);
let message = Bytes32.fromString("what's up");
let signature = Ecdsa.sign(message.toBytes(), privateKey.toBigInt());

const EcdsaBenchmarks = benchmark(
  'ecdsa',
  async (tic, toc) => {
    tic('build constraint system');
    await keccakAndEcdsa.analyzeMethods();
    toc();

    tic('witness generation');
    await Provable.runAndCheck(async () => {
      let message_ = Provable.witness(Bytes32, () => message);
      let signature_ = Provable.witness(Ecdsa, () => signature);
      let publicKey_ = Provable.witness(Secp256k1, () => publicKey);
      await keccakAndEcdsa.rawMethods.verifyEcdsa(
        message_,
        signature_,
        publicKey_
      );
    });
    toc();
  },
  // two warmups to ensure full caching
  { numberOfWarmups: 2, numberOfRuns: 5 }
);
