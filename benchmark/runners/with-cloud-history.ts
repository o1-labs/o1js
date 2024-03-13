/**
 * Benchmarks runner with historical data preservation in cloud storage (InfluxDB)
 *
 * Run with
 * ```
 * ./run benchmark/runners/with-cloud-history.ts --bundle
 * ```
 */

import { InfluxDB, Point } from '@influxdata/influxdb-client';
import os from 'node:os';
import { logResult, type BenchmarkResult } from '../base-benchmark.js';
import EcdsaBenchmark from '../samples/ecdsa.js';

const INFLUXDB_CLIENT_OPTIONS = {
  url: process.env.INFLUXDB_URL,
  token: process.env.INFLUXDB_TOKEN,
  org: process.env.INFLUXDB_ORG,
  bucket: process.env.INFLUXDB_BUCKET,
};
const INFLUXDB_COMMON_POINT_TAGS = {
  sourceEnvironment: process.env.METRICS_SOURCE_ENVIRONMENT ?? 'local',
  operatingSystem: `${os.type()} ${os.release()} ${os.arch()}`,
  hardware: `${os.cpus()[0].model}, ${os.cpus().length} cores, ${(
    os.totalmem() / Math.pow(1024, 3)
  ).toFixed(2)}Gb of RAM`,
  gitBranch: process.env.GIT_BRANCH ?? 'unknown',
};
const influxDbClient = setupInfluxDbClient();

// Run all benchmarks
const results = [...(await EcdsaBenchmark.run())];

// Process and log results
for (const result of results) {
  const previousResult = await readPreviousResultFromInfluxDb(result);
  logResult(result, previousResult);
  writeResultToInfluxDb(result);
  console.log('\n');
}

function setupInfluxDbClient(): InfluxDB | undefined {
  const { url, token } = INFLUXDB_CLIENT_OPTIONS;
  if (url === undefined || token === undefined) {
    return undefined;
  }
  return new InfluxDB({ url, token });
}

function writeResultToInfluxDb(result: BenchmarkResult): void {
  const { org, bucket } = INFLUXDB_CLIENT_OPTIONS;
  if (influxDbClient && org && bucket) {
    console.log('Writing result to InfluxDB.');
    const influxDbWriteClient = influxDbClient.getWriteApi(org, bucket, 'ms');
    try {
      const point = new Point(`${result.label} - ${result.size} samples`)
        .tag('benchmarkName', result.label.trim())
        .tag('sampledTimes', result.size.toString())
        .floatField('mean', result.mean)
        .floatField('variance', result.variance)
        .intField('size', result.size);
      for (const [key, value] of Object.entries(INFLUXDB_COMMON_POINT_TAGS)) {
        point.tag(key, value.trim());
      }
      influxDbWriteClient.writePoint(point);
    } catch (e) {
      console.error('Error writing to InfluxDB: ', e);
    } finally {
      influxDbWriteClient.close();
    }
  } else {
    console.info('Skipping writing to InfluxDB: client is not configured.');
  }
}

function readPreviousResultFromInfluxDb(
  result: BenchmarkResult
): Promise<BenchmarkResult | undefined> {
  return new Promise((resolve) => {
    const { org, bucket } = INFLUXDB_CLIENT_OPTIONS;
    if (!influxDbClient || !org || !bucket) {
      resolve(undefined);
      return;
    }
    console.log('Querying InfluxDB for previous results.');
    const influxDbPointTags = INFLUXDB_COMMON_POINT_TAGS;
    const influxDbQueryClient = influxDbClient.getQueryApi(org);
    const baseBranchForComparison =
      process.env.METRICS_BASE_BRANCH_FOR_COMPARISON ?? 'main';
    const fluxQuery = `
      from(bucket: "${bucket}")
        |> range(start: -90d)
        |> filter(fn: (r) => r.benchmarkName == "${result.label}")
        |> filter(fn: (r) => r.gitBranch == "${baseBranchForComparison}")
        |> filter(fn: (r) => r.sampledTimes == "${result.size}")
        |> filter(fn: (r) => r.sourceEnvironment == "${influxDbPointTags.sourceEnvironment}")
        |> filter(fn: (r) => r.operatingSystem == "${influxDbPointTags.operatingSystem}")
        |> filter(fn: (r) => r.hardware == "${influxDbPointTags.hardware}")
        |> toFloat()
        |> group()
        |> pivot(
          rowKey:["_measurement"],
          columnKey: ["_field"],
          valueColumn: "_value"
        )
        |> sort(desc: true)
        |> limit(n:1)
    `;
    try {
      let previousResult: BenchmarkResult | undefined = undefined;
      influxDbQueryClient.queryRows(fluxQuery, {
        next(row, tableMeta) {
          const tableObject = tableMeta.toObject(row);
          if (
            !previousResult &&
            tableObject._measurement &&
            tableObject.mean &&
            tableObject.variance &&
            tableObject.size
          ) {
            const measurement = tableObject._measurement;
            previousResult = {
              label: measurement
                .substring(0, measurement.lastIndexOf('-'))
                .trim(),
              mean: parseFloat(tableObject.mean),
              variance: parseFloat(tableObject.variance),
              size: parseInt(tableObject.size, 10),
            };
          }
        },
        error(e) {
          console.error('Error querying InfluxDB: ', e);
          resolve(undefined);
        },
        complete() {
          resolve(previousResult);
        },
      });
    } catch (e) {
      console.error('Error querying InfluxDB: ', e);
      resolve(undefined);
    }
  });
}
