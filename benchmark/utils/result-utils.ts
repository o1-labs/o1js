/**
 * Benchmark results processing utils
 */

import { BenchmarkResult, logResult } from '../benchmark.js';
import {
  readPreviousResultFromInfluxDb,
  writeResultToInfluxDb,
} from './influxdb-utils.js';

export async function processAndLogBenchmarkResults(
  results: BenchmarkResult[]
): Promise<void> {
  for (const result of results) {
    const previousResult = await readPreviousResultFromInfluxDb(result);
    logResult(result, previousResult);
    writeResultToInfluxDb(result);
    console.log('\n');
  }
}
