import { Random } from './random.js';
export { test, Random };

const defaultTimeBudget = 100; // ms
const isVerbose = false;

function test<T extends readonly Random<any>[]>(...args: ArrayTestArgs<T>) {
  let timeBudget = defaultTimeBudget;
  let run: (...args: ArrayRunArgs<T>) => void;
  let arg = args.pop();
  if (typeof arg !== 'function') {
    if (arg !== undefined) timeBudget = (arg as any).timeBudget;
    run = args.pop() as any;
  } else {
    run = arg;
  }
  let gens = args as any as T;
  let start = performance.now();
  // run at least 10 times
  testN<T>(10, gens, run);
  let time = performance.now() - start;
  if (time > timeBudget) return 10;
  // (10 + remainingRuns) * timePerRun = timeBudget
  let remainingRuns = Math.floor(timeBudget / (time / 10)) - 10;
  // run at most 100 times
  if (remainingRuns > 90) remainingRuns = 90;
  testN<T>(remainingRuns, gens, run);
  return 10 + remainingRuns;
}

function testN<T extends readonly Random<any>[]>(
  N: number,
  gens: T,
  run: (...args: ArrayRunArgs<T>) => void
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
    let values = gens.map((gen) => gen.next());
    try {
      if (isVerbose) console.log('testing', ...values);
      (run as any)(...values, assert);
    } catch (e: any) {
      error = e;
      fail = true;
    }
    if (fail) {
      console.log('failing inputs:');
      values.forEach((v) => console.dir(v, { depth: Infinity }));
      let message = '\n' + errorMessages.join('\n');
      if (error === undefined) throw Error(message);
      error.message = `${message}\nFailed - error during test execution:
${error.message}`;
      throw error;
    }
  }
}

// types

type ArrayTestArgs<T extends readonly Random<any>[]> = [
  ...gens: T,
  run: (...args: ArrayRunArgs<T>) => void
  // options?: { timeBudget?: number } // TODO make this work
];

type ArrayRunArgs<T extends readonly Random<any>[]> = [
  ...values: { [K in keyof T]: T[K] extends Random<infer U> ? U : never },
  assert: (b: boolean, message?: string) => void
];
