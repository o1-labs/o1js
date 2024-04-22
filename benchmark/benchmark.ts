/**
 * Base benchmark harness
 */

import jStat from 'jstat';
export {
  Benchmark,
  BenchmarkResult,
  benchmark,
  calculateBounds,
  logResult,
  pValue,
};

type BenchmarkResult = {
  label: string;
  size: number;
  mean: number;
  variance: number;
};

type Benchmark = { run: () => Promise<BenchmarkResult[]> };

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
  let variance: number;
  if (n > 1) {
    variance = (sumSquares - sum ** 2 / n) / (n - 1);
  } else {
    variance = 0;
  }
  return { mean, variance, size: n };
}

function logResult(
  result: BenchmarkResult,
  previousResult?: BenchmarkResult
): void {
  console.log(result.label);
  console.log(`time: ${resultToString(result)}`);

  if (previousResult === undefined) return;

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

function calculateBounds(result: BenchmarkResult) {
  const stdDev = Math.sqrt(result.variance);
  const upperBound = result.mean + stdDev;
  const lowerBound = result.mean - stdDev;
  return { upperBound, lowerBound };
}
