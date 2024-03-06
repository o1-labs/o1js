/**
 * Benchmark runner example
 *
 * Run with
 * ```
 * ./run benchmarks/ecdsa.ts --bundle
 * ```
 */
import { keccakAndEcdsa } from '../src/examples/crypto/ecdsa/ecdsa.js';
import { BenchmarkResult, benchmark, printResult } from './benchmark.js';

let results = await benchmark(
  'ecdsa',
  async (tic, toc) => {
    tic('build constraint system');
    await keccakAndEcdsa.analyzeMethods();
    toc();
  },
  // two warmups to ensure full caching
  { numberOfWarmups: 2, numberOfRuns: 5 }
);

// mock: load previous results
let previousResults: BenchmarkResult[] = [
  {
    label: 'ecdsa - build constraint system',
    size: 5,
    mean: 3103.639612600001,
    variance: 72678.9751211293,
  },
];

// example for how to log results
// criterion-style comparison of result to previous one, check significant improvement

for (let i = 0; i < results.length; i++) {
  let result = results[i];
  let previous = previousResults[i];
  printResult(result, previous);
}
