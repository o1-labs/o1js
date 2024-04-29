/**
 * Simple benchmarks runner with historical data preservation in cloud storage (if configured)
 *
 * Run with
 * ```
 * ./run benchmark/runners/simple.ts --bundle
 * ```
 */

import { initializeBindings } from 'o1js';
import { EcdsaBenchmarks } from '../benchmarks/ecdsa.js';
import { TxnBenchmarks } from '../benchmarks/transaction.js';
import { processAndLogBenchmarkResults } from '../utils/result-utils.js';

const results = [];
await initializeBindings();

// Run benchmarks and collect results
results.push(...(await EcdsaBenchmarks.run()));
results.push(...(await TxnBenchmarks.run()));

// Process and log results
await processAndLogBenchmarkResults(results);
