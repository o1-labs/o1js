/**
 * ECDSA benchmark
 *
 * Run with
 * ```
 * ./run benchmarks/ecdsa.ts --bundle
 * ```
 */

import { Provable } from 'o1js';
import {
  Bytes32,
  Ecdsa,
  Secp256k1,
  keccakAndEcdsa,
} from '../src/examples/crypto/ecdsa/ecdsa.js';
import { benchmark, logResult } from './benchmark.js';

let privateKey = Secp256k1.Scalar.random();
let publicKey = Secp256k1.generator.scale(privateKey);
let message = Bytes32.fromString("what's up");
let signature = Ecdsa.sign(message.toBytes(), privateKey.toBigInt());

const EcdsaBenchmark = benchmark(
  'ecdsa',
  async (tic, toc) => {
    tic('build constraint system');
    await keccakAndEcdsa.analyzeMethods();
    toc();

    tic('witness generation');
    await Provable.runAndCheck(async () => {
      let message_ = Provable.witness(Bytes32.provable, () => message);
      let signature_ = Provable.witness(Ecdsa.provable, () => signature);
      let publicKey_ = Provable.witness(Secp256k1.provable, () => publicKey);
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

// run benchmark
let results = await EcdsaBenchmark.run();

// criterion-style comparison of result to previous one, check significant improvement
for (const result of results) {
  await logResult(result);
}
