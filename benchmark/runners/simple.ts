/**
 * Simple benchmarks runner
 * Exercises benchmarks and logs the results
 *
 * Run with
 * ```
 * ./run benchmark/runners/simple.ts --bundle
 * ```
 */
import { initializeBindings } from 'o1js';
import { logResult } from '../benchmark.js';
import { EcdsaBenchmark } from '../benchmarks/ecdsa.js';

await initializeBindings();

// Run all benchmarks
const results = [...(await EcdsaBenchmark.run())];

// Process and log results
for (const result of results) {
  logResult(result);
  console.log('\n');
}
