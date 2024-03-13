/**
 * Benchmark runner
 */

import { InfluxDB, Point } from '@influxdata/influxdb-client';
import jStat from 'jstat';
import os from 'node:os';
export { Benchmark, BenchmarkResult, benchmark, logResult, pValue };

type BenchmarkResult = {
  label: string;
  size: number;
  mean: number;
  variance: number;
};

type Benchmark = { run: () => Promise<BenchmarkResult[]> };

const influxDbClient = setupInfluxDbClient();

function benchmark(
  label: string,
  run:
    | ((
        tic: (label?: string) => void,
        toc: (label?: string) => void
      ) => Promise<void>)
    | ((tic: (label?: string) => void, toc: (label?: string) => void) => void),
  options?: {
    numberOfRuns?: number;
    numberOfWarmups?: number;
  }
): Benchmark {
  return {
    async run() {
      const { numberOfRuns = 5, numberOfWarmups = 0 } = options ?? {};

      let lastStartKey: string;
      let startTime: Record<string, number | undefined> = {}; // key: startTime
      let runTimes: Record<string, number[]> = {}; // key: [(endTime - startTime)]

      function reset() {
        startTime = {};
      }

      function start(key?: string) {
        lastStartKey = key ?? '';
        key = getKey(label, key);
        if (startTime[key] !== undefined)
          throw Error('running `start(label)` with an already started label');
        startTime[key] = performance.now();
      }

      function stop(key?: string) {
        let end = performance.now();
        key ??= lastStartKey;
        if (key === undefined) {
          throw Error('running `stop()` with no start defined');
        }
        key = getKey(label, key);
        let start_ = startTime[key];
        startTime[key] = undefined;
        if (start_ === undefined)
          throw Error('running `stop()` with no start defined');
        let times = (runTimes[key] ??= []);
        times.push(end - start_);
      }

      let noop = () => {};
      for (let i = 0; i < numberOfWarmups; i++) {
        reset();
        await run(noop, noop);
      }
      for (let i = 0; i < numberOfRuns; i++) {
        reset();
        await run(start, stop);
      }

      const results: BenchmarkResult[] = [];

      for (let label in runTimes) {
        let times = runTimes[label];
        results.push({ label, ...getStatistics(times) });
      }
      return results;
    },
  };
}

function getKey(label: string, key?: string) {
  return key ? `${label} - ${key}` : label;
}

function getStatistics(numbers: number[]) {
  let sum = 0;
  let sumSquares = 0;
  for (let i of numbers) {
    sum += i;
    sumSquares += i ** 2;
  }
  let n = numbers.length;
  let mean = sum / n;
  let variance = (sumSquares - sum ** 2 / n) / (n - 1);

  return { mean, variance, size: n };
}

async function logResult(result: BenchmarkResult): Promise<void> {
  console.log(result.label + `\n`);
  console.log(`time: ${resultToString(result)}`);

  const previousResult = await getPreviousResultFromInfluxDb(result);
  if (!previousResult) {
    writeResultToInfluxDb(result);
    console.log('\n');
    return;
  }

  let change = (result.mean - previousResult.mean) / previousResult.mean;
  let p = pValue(result, previousResult);

  let changePositive = change > 0 ? '+' : '';
  let pGreater = p > 0.05 ? '>' : '<';
  console.log(
    `change: ${changePositive}${(change * 100).toFixed(3)}% (p = ${p.toFixed(
      2
    )} ${pGreater} 0.05)`
  );

  if (p < 0.05) {
    if (result.mean < previousResult.mean) {
      console.log('Performance has improved.');
    } else {
      console.log('Performance has regressed.');
    }
  } else {
    console.log('Change within noise threshold.');
  }

  writeResultToInfluxDb(result);
  console.log('\n');
}

function resultToString({ mean, variance }: BenchmarkResult) {
  return `${mean.toFixed(3)}ms ± ${((Math.sqrt(variance) / mean) * 100).toFixed(
    1
  )}%`;
}

function pValue(sample1: BenchmarkResult, sample2: BenchmarkResult): number {
  const n1 = sample1.size;
  const n2 = sample2.size;
  const mean1 = sample1.mean;
  const mean2 = sample2.mean;
  const var1 = sample1.variance / n1;
  const var2 = sample2.variance / n2;

  // calculate the t-statistic
  const tStatistic = (mean1 - mean2) / Math.sqrt(var1 + var2);

  // degrees of freedom
  const df = (var1 + var2) ** 2 / (var1 ** 2 / (n1 - 1) + var2 ** 2 / (n2 - 1));

  // calculate the (two-sided) p-value indicating a significant change
  const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(tStatistic), df));
  return pValue;
}

function getInfluxDbClientOptions() {
  return {
    url: process.env.INFLUXDB_URL,
    token: process.env.INFLUXDB_TOKEN,
    org: process.env.INFLUXDB_ORG,
    bucket: process.env.INFLUXDB_BUCKET,
  };
}

function getInfluxDbPointTags() {
  return {
    sourceEnvironment: process.env.METRICS_SOURCE_ENVIRONMENT ?? 'local',
    operatingSystem: `${os.type()} ${os.release()} ${os.arch()}`,
    hardware: `${os.cpus()[0].model}, ${os.cpus().length} cores, ${(
      os.totalmem() /
      1024 /
      1024 /
      1024
    ).toFixed(2)}Gb of RAM`,
    gitBranch: process.env.GIT_BRANCH ?? 'unknown',
  };
}

function setupInfluxDbClient(): InfluxDB | undefined {
  const { url, token } = getInfluxDbClientOptions();
  if (url === undefined || token === undefined) {
    return undefined;
  }
  return new InfluxDB({ url, token });
}

function writeResultToInfluxDb(result: BenchmarkResult): void {
  const { org, bucket } = getInfluxDbClientOptions();
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
      for (const [key, value] of Object.entries(getInfluxDbPointTags())) {
        point.tag(key, value.trim());
      }
      influxDbWriteClient.writePoint(point);
    } catch (e) {
      console.error('Error writing to InfluxDB: ', e);
    } finally {
      influxDbWriteClient.close();
    }
  } else {
    console.info('Skipping writing to InfluxDB: not configured.');
  }
}

function getPreviousResultFromInfluxDb(
  result: BenchmarkResult
): Promise<BenchmarkResult | undefined> {
  return new Promise((resolve) => {
    const { org, bucket } = getInfluxDbClientOptions();
    if (!influxDbClient || !org || !bucket) {
      resolve(undefined);
      return;
    }
    console.log('Querying InfluxDB for previous results.');
    const influxDbPointTags = getInfluxDbPointTags();
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
