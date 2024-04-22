/**
 * Specific runner for o1js initialization benchmarks to get "clean" metrics
 *
 * Run with
 * ```
 * ./run benchmark/runners/init.ts --bundle
 * ```
 */

import { benchmark } from '../benchmark.js';
import { processAndLogBenchmarkResults } from '../utils/result-utils.js';

const InitBenchmarks = benchmark(
  'init',
  async (tic, toc) => {
    tic('o1js import');
    const { initializeBindings } = await import('o1js');
    toc();

    tic('bindings initialization');
    await initializeBindings();
    toc();
  },
  // Run once with no warmups to get the worst-case scenario metrics
  { numberOfWarmups: 0, numberOfRuns: 1 }
);

// Run the initialization benchmarks and collect results
const results = [...(await InitBenchmarks.run())];

// Process and log results
await processAndLogBenchmarkResults(results);
