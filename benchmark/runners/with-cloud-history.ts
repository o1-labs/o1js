/**
 * Benchmarks runner with historical data preservation in cloud storage (InfluxDB)
 *
 * Run with
 * ```
 * ./run benchmark/runners/with-cloud-history.ts --bundle
 * ```
 */

import { logResult } from '../base-benchmark.js';
import EcdsaBenchmark from '../samples/ecdsa.js';
import {
  readPreviousResultFromInfluxDb,
  writeResultToInfluxDb,
} from '../utils/influxdb-utils.js';

// Run all benchmarks
const results = [...(await EcdsaBenchmark.run())];

// Process and log results
for (const result of results) {
  const previousResult = await readPreviousResultFromInfluxDb(result);
  logResult(result, previousResult);
  writeResultToInfluxDb(result);
  console.log('\n');
}
