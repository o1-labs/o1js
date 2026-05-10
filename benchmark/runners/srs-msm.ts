/**
 * SRS MSM benchmark for the experimental montgomery backend.
 *
 * Run with:
 * ```
 * ./run benchmark/runners/srs-msm.ts
 * ```
 *
 * Optional knobs:
 * - O1JS_MSM_BENCH_SIZES=14,16,18
 * - O1JS_MSM_BENCH_THREADS=4
 * - O1JS_MSM_BENCH_WHOLE_DOMAIN=1
 */

import type { MlArray } from '../../src/lib/ml/base.js';
import type { OrInfinity } from '../../src/bindings/crypto/bindings/curve.js';
import type { PolyComm } from '../../src/bindings/crypto/bindings/kimchi-types.js';

type FieldName = 'fp' | 'fq';

const fields: FieldName[] = ['fp', 'fq'];
const logs = parseLogSizes(process.env.O1JS_MSM_BENCH_SIZES ?? '14,16,18');
const threads = Number(process.env.O1JS_MSM_BENCH_THREADS ?? 0);
const includeWholeDomain = process.env.O1JS_MSM_BENCH_WHOLE_DOMAIN === '1';
const oldMontgomeryFlag = process.env.O1JS_EXPERIMENTAL_MONTGOMERY_MSM;
const bindings = await importInternal<any>('../../bindings.js', '../../src/bindings.js');
const { getRustConversion } = await importInternal<any>(
  '../../bindings/crypto/bindings.js',
  '../../src/bindings/crypto/bindings.js'
);
const { srs: createSrsBindings } = await importInternal<any>(
  '../../bindings/crypto/bindings/srs.js',
  '../../src/bindings/crypto/bindings/srs.js'
);
const { computeMontgomeryLagrangeCommitment, initializeMontgomeryMsm } =
  await importInternal<any>(
    '../../bindings/crypto/bindings/montgomery-msm.js',
    '../../src/bindings/crypto/bindings/montgomery-msm.js'
  );

await bindings.initializeBindings();
let wasm = bindings.wasm;
let conversion = getRustConversion(wasm);
let srsBindings = createSrsBindings(wasm, conversion as any);

let initialized = await measure('montgomery cold start', () =>
  initializeMontgomeryMsm({ force: true, threads })
);
if (initialized.value !== true) {
  throw Error(
    'montgomery backend did not initialize. Install optional dependency `montgomery` and run on Node 24+ or a supported browser runtime.'
  );
}

await bindings.withThreadPool(async () => {
  for (let field of fields) {
    for (let logSize of logs) {
      let domainSize = 1 << logSize;
      let srs = (
        await measure(`${field} 2^${logSize} kimchi srs create`, () =>
          Promise.resolve(srsBindings[field].create(domainSize))
        )
      ).value;

      let indices = [0, domainSize >> 1, domainSize - 1];
      let getSrsPoints = () =>
        (conversion as any)[field].pointsFromRust(
          wasm[`caml_${field}_srs_get`](srs)
        ) as MlArray<OrInfinity>;

      for (let index of indices) {
        process.env.O1JS_EXPERIMENTAL_MONTGOMERY_MSM = '';
        let kimchi = await measure(`${field} 2^${logSize} kimchi lagrange[${index}]`, () =>
          Promise.resolve(srsBindings[field].lagrangeCommitment(srs, domainSize, index))
        );

        let first = await measure(`${field} 2^${logSize} montgomery first[${index}]`, () =>
          computeMontgomeryLagrangeCommitment({
            field,
            srs,
            domainSize,
            index,
            getSrsPoints,
            options: { force: true, threads },
          })
        );
        assertSamePolyComm(
          first.value as PolyComm | undefined,
          kimchi.value,
          `${field} 2^${logSize} first[${index}]`
        );

        let warm = await measure(`${field} 2^${logSize} montgomery warm[${index}]`, () =>
          computeMontgomeryLagrangeCommitment({
            field,
            srs,
            domainSize,
            index,
            getSrsPoints,
            options: { force: true, threads },
          })
        );
        assertSamePolyComm(
          warm.value as PolyComm | undefined,
          kimchi.value,
          `${field} 2^${logSize} warm[${index}]`
        );
      }

      if (includeWholeDomain) {
        process.env.O1JS_EXPERIMENTAL_MONTGOMERY_MSM = '';
        await measure(`${field} 2^${logSize} kimchi whole-domain`, () =>
          Promise.resolve(srsBindings[field].lagrangeCommitmentsWholeDomain(srs, domainSize))
        );
      }
    }
  }
});

if (oldMontgomeryFlag === undefined) {
  delete process.env.O1JS_EXPERIMENTAL_MONTGOMERY_MSM;
} else {
  process.env.O1JS_EXPERIMENTAL_MONTGOMERY_MSM = oldMontgomeryFlag;
}

async function measure<T>(label: string, run: () => Promise<T>) {
  let start = performance.now();
  let value = await run();
  let ms = performance.now() - start;
  console.log(`${label}: ${ms.toFixed(3)}ms`);
  return { value, ms };
}

function parseLogSizes(input: string) {
  return input
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isInteger(x) && x > 0);
}

async function importInternal<T>(distSpecifier: string, sourceSpecifier: string): Promise<T> {
  let specifiers = [distSpecifier, sourceSpecifier];
  for (let specifier of specifiers) {
    try {
      return (await import(specifier)) as T;
    } catch (error) {
      if (!isModuleNotFound(error)) throw error;
    }
  }
  throw Error(`could not import ${distSpecifier} or ${sourceSpecifier}`);
}

function isModuleNotFound(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    'code' in error &&
    ((error as { code?: unknown }).code === 'ERR_MODULE_NOT_FOUND' ||
      (error as { code?: unknown }).code === 'MODULE_NOT_FOUND')
  );
}

function assertSamePolyComm(actual: PolyComm | undefined, expected: PolyComm, label: string) {
  if (actual === undefined) throw Error(`${label}: montgomery returned no commitment`);
  if (!polyCommEquals(actual, expected)) throw Error(`${label}: commitment mismatch`);
}

function polyCommEquals(a: PolyComm, b: PolyComm) {
  let aPoints = a[1];
  let bPoints = b[1];
  if (aPoints.length !== bPoints.length) return false;
  for (let i = 1; i < aPoints.length; i++) {
    let aPoint = aPoints[i];
    let bPoint = bPoints[i];
    if (aPoint === 0 || bPoint === 0) {
      if (aPoint !== bPoint) return false;
      continue;
    }
    if (aPoint[1][1][1] !== bPoint[1][1][1] || aPoint[1][2][1] !== bPoint[1][2][1]) {
      return false;
    }
  }
  return true;
}
