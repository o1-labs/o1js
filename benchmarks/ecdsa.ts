/**
 * Benchmark runner example
 *
 * Run with
 * ```
 * ./run benchmarks/ecdsa.ts --bundle
 * ```
 */
import { Provable } from 'o1js';
import {
  keccakAndEcdsa,
  Secp256k1,
  Ecdsa,
  Bytes32,
} from '../src/examples/crypto/ecdsa/ecdsa.js';
import { BenchmarkResult, benchmark, printResult } from './benchmark.js';

let privateKey = Secp256k1.Scalar.random();
let publicKey = Secp256k1.generator.scale(privateKey);
let message = Bytes32.fromString("what's up");
let signature = Ecdsa.sign(message.toBytes(), privateKey.toBigInt());

const EcdsaBenchmark = benchmark(
  'ecdsa',
  async (tic, toc) => {
    tic('build constraint system');
    keccakAndEcdsa.analyzeMethods();
    toc();

    tic('witness generation');
    Provable.runAndCheck(() => {
      let message_ = Provable.witness(Bytes32.provable, () => message);
      let signature_ = Provable.witness(Ecdsa.provable, () => signature);
      let publicKey_ = Provable.witness(Secp256k1.provable, () => publicKey);
      keccakAndEcdsa.rawMethods.verifyEcdsa(message_, signature_, publicKey_);
    });
    toc();
  },
  // two warmups to ensure full caching
  { numberOfWarmups: 2, numberOfRuns: 5 }
);

// mock: load previous results

let previousResults: BenchmarkResult[] = [
  {
    label: 'ecdsa - build constraint system',
    mean: 3103.639612600001,
    variance: 72678.9751211293,
    size: 5,
  },
  {
    label: 'ecdsa - witness generation',
    mean: 2062.8708897999995,
    variance: 13973.913943626918,
    size: 5,
  },
];

// run benchmark

let results = await EcdsaBenchmark.run();

// example for how to log results
// criterion-style comparison of result to previous one, check significant improvement

for (let i = 0; i < results.length; i++) {
  let result = results[i];
  let previous = previousResults[i];
  printResult(result, previous);
}
