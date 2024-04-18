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
import { InitBenchmark } from '../benchmarks/init.js';

const results = [];

// Run the initialization benchmark
results.push(...(await InitBenchmark.run()));
// Run all other benchmarks
await initializeBindings();
results.push(...(await EcdsaBenchmark.run()));

// Process and log results
for (const result of results) {
  logResult(result);
  console.log('\n');
}
