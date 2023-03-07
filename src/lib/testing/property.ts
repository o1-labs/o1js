import { Random } from './random.js';
export { test };
export { Random, sample, withHardCoded } from './random.js';

const defaultTimeBudget = 100; // ms
const defaultMinRuns = 15;
const defaultMaxRuns = 400;

const test = Object.assign(testCustom(), {
  negative: testCustom({ negative: true }),
  custom: testCustom,
});

/**
 * Create a customized test runner.
 *
 * The runner takes any number of generators (Random<T>) and a function which gets samples as inputs, and performs the test.
 * The test can be either performed by using the `assert` function which is passed as argument, or simply throw an error when an assertion fails:
 *
 * ```ts
 * let test = testCustom();
 *
 * test(Random.nat(5), (x, assert) => {
 *   // x is one sample of the `Random.nat(5)` distribution
 *   // we can make assertions about it by using `assert`
 *   assert(x < 6, "should not exceed max value of 5");
 *   // or by using any other assertion library which throws errors on failing assertions:
 *   expect(x).toBeLessThan(6);
 * })
 * ```
 *
 * Parameters `minRuns`, `maxRuns` and `timeBudget` determine how often a test is run:
 * - We definitely run the test `minRuns` times
 * - Then we determine how many more test fit into the `timeBudget` (time the test should take, in milliseconds)
 * - And we run the test as often as we can within that budget, but at most `maxRuns` times.
 *
 * If one run fails, the entire test stops immediately and the failing sample is printed to the console.
 *
 * The parameter `negative` inverts this behaviour: If `negative: true`, _every_ sample is expected to fail and the test
 * stops if one sample succeeds.
 *
 * The default behaviour of printing out failing samples can be turned off by setting `logFailures: false`.
 */
function testCustom({
  minRuns = defaultMinRuns,
  maxRuns = defaultMaxRuns,
  timeBudget = defaultTimeBudget,
  negative = false,
  logFailures = true,
} = {}) {
  return function <T extends readonly Random<any>[]>(
    ...args: ArrayTestArgs<T>
  ) {
    let run: (...args: ArrayRunArgs<Nexts<T>>) => void;
    let arg = args.pop();
    if (typeof arg !== 'function') {
      if (arg !== undefined) timeBudget = (arg as any).timeBudget;
      run = args.pop() as any;
    } else {
      run = arg;
    }
    let gens = args as any as T;
    let nexts = gens.map((g) => g.create()) as Nexts<T>;
    let start = performance.now();
    // run at least `minRuns` times
    testN(minRuns, nexts, run, { negative, logFailures });
    let time = performance.now() - start;
    if (time > timeBudget || minRuns >= maxRuns) return minRuns;
    // (minRuns + remainingRuns) * timePerRun = timeBudget
    let remainingRuns = Math.floor(timeBudget / (time / minRuns)) - minRuns;
    // run at most `maxRuns` times
    if (remainingRuns > maxRuns - minRuns) remainingRuns = maxRuns - minRuns;
    testN(remainingRuns, nexts, run, { negative, logFailures });
    return minRuns + remainingRuns;
  };
}

function testN<T extends readonly (() => any)[]>(
  N: number,
  nexts: T,
  run: (...args: ArrayRunArgs<T>) => void,
  { negative = false, logFailures = true } = {}
) {
  let errorMessages: string[] = [];
  let fail = false;
  let count = 0;
  function assert(ok: boolean, message?: string) {
    count++;
    if (!ok) {
      fail = true;
      errorMessages.push(
        `Failed: ${message ? `"${message}"` : `assertion #${count}`}`
      );
    }
  }
  for (let i = 0; i < N; i++) {
    count = 0;
    fail = false;
    let error: Error | undefined;
    let values = nexts.map((next) => next());
    try {
      (run as any)(...values, assert);
    } catch (e: any) {
      error = e;
      fail = true;
    }
    if (fail) {
      if (negative) continue;
      if (logFailures) {
        console.log('failing inputs:');
        values.forEach((v) => console.dir(v, { depth: Infinity }));
      }
      let message = '\n' + errorMessages.join('\n');
      if (error === undefined) throw Error(message);
      error.message = `${message}\nFailed - error during test execution:
${error.message}`;
      throw error;
    } else {
      if (!negative) continue;
      if (logFailures) {
        console.log('succeeding inputs:');
        values.forEach((v) => console.dir(v, { depth: Infinity }));
      }
      throw Error('Negative test failed - one run succeeded');
    }
  }
}

// types

type Nexts<T extends readonly Random<any>[]> = {
  [i in keyof T]: T[i]['create'] extends () => () => infer U ? () => U : never;
};

type ArrayTestArgs<T extends readonly Random<any>[]> = [
  ...gens: T,
  run: (...args: ArrayRunArgs<Nexts<T>>) => void
];

type ArrayRunArgs<Nexts extends readonly (() => any)[]> = [
  ...values: { [i in keyof Nexts]: Nexts[i] extends () => infer U ? U : never },
  assert: (b: boolean, message?: string) => void
];
