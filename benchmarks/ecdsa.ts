/**
 * Benchmark runner example
 *
 * Run with
 * ```
 * ./run benchmarks/ecdsa.ts --bundle
 * ```
 */
import { keccakAndEcdsa } from '../src/examples/crypto/ecdsa/ecdsa.js';
import { benchmark, printResults } from './benchmark.js';

let result = await benchmark(
  'ecdsa',
  async (tic, toc) => {
    tic('compile (cached)');
    await keccakAndEcdsa.compile();
    toc();
  },
  // two warmups to ensure full caching
  { numberOfWarmups: 2, numberOfRuns: 5 }
);

// just an example for how to log results
console.log(result[0].full);
printResults(result);
