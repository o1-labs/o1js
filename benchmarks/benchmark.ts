/**
 * Benchmark runner
 */
import jStat from 'jstat';
export { BenchmarkResult, benchmark, printResults, pValue };

type BenchmarkResult = {
  label: string;
  mean: number;
  variance: number;
  full: number[];
};

async function benchmark(
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
): Promise<BenchmarkResult[]> {
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

  for (let key in runTimes) {
    let times = runTimes[key];
    results.push({ label: key, ...getStatistics(times) });
  }
  return results;
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

  return { mean, variance, full: numbers };
}

function printResults(results: BenchmarkResult[]) {
  for (let result of results) {
    console.log(`${result.label}: ${resultToString(result)}`);
  }
}

function resultToString({ mean, variance }: BenchmarkResult) {
  return `${mean.toFixed(3)}ms ± ${((Math.sqrt(variance) / mean) * 100).toFixed(
    1
  )}%`;
}

function pValue(sample1: BenchmarkResult, sample2: BenchmarkResult): number {
  const n1 = sample1.full.length;
  const n2 = sample2.full.length;
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
