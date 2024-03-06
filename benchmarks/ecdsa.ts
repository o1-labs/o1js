/**
 * Benchmark runner example
 *
 * Run with
 * ```
 * ./run benchmarks/ecdsa.ts --bundle
 * ```
 */
import { keccakAndEcdsa } from '../src/examples/crypto/ecdsa/ecdsa.js';
import { benchmark, pValue, printResults } from './benchmark.js';

let result = await benchmark(
  'ecdsa',
  async (tic, toc) => {
    tic('build constraint system');
    await keccakAndEcdsa.analyzeMethods();
    toc();
  },
  // two warmups to ensure full caching
  { numberOfWarmups: 2, numberOfRuns: 5 }
);

// example for how to log results

let previousResult = {
  label: 'ecdsa - build constraint system',
  mean: 3103.639612600001,
  variance: 72678.9751211293,
  full: [
    3560.7922879999987, 2891.445788000001, 2946.1976350000023,
    2996.3062800000007, 3123.456072000001,
  ],
};
printResults([previousResult]);
printResults(result);

// comparing results for significant improvement

let p = pValue(result[0], previousResult);

if (p < 0.05) {
  if (result[0].mean > previousResult.mean) {
    console.log(`Performance has improved. p = ${p.toFixed(3)} < 0.05`);
  } else {
    console.log(`Performance has degraded. p = ${p.toFixed(3)} < 0.05`);
  }
} else {
  console.log(
    `Performance has not changed significantly. p = ${p.toFixed(3)} > 0.05`
  );
}
