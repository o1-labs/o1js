/**
 * Benchmark runner
 */
export { BenchmarkResult, benchmark, printResults };

type BenchmarkResult = {
  label: string;
  mean: number;
  stdDev: number;
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
  let stdDev = Math.sqrt((sumSquares - sum ** 2 / n) / (n - 1)) / mean;

  return { mean, stdDev, full: numbers };
}

function printResults(results: BenchmarkResult[]) {
  for (let result of results) {
    console.log(`${result.label}: ${resultToString(result)}`);
  }
}

function resultToString({ mean, stdDev }: BenchmarkResult) {
  return `${mean.toFixed(2)}ms ± ${(stdDev * 100).toFixed(1)}%`;
}
