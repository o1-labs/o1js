/**
 * Simple benchmarks runner
 * Exercises benchmarks and logs the results
 *
 * Run with
 * ```
 * ./run benchmark/runners/simple.ts --bundle
 * ```
 */

import { logResult } from '../base-benchmark.js';
import EcdsaBenchmark from '../samples/ecdsa.js';

// Run all benchmarks
const results = [...(await EcdsaBenchmark.run())];

// Process and log results
for (const result of results) {
  logResult(result);
  console.log('\n');
}
