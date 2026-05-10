import { MlArray } from '../../../lib/ml/base.js';
import { getBackendPreference } from '../../../lib/backend.js';
import { Fp, Fq, type FiniteField } from '../finite-field.js';
import { OrInfinity } from './curve.js';
import { Field } from './field.js';
import { PolyComm } from './kimchi-types.js';

export {
  computeMontgomeryCommitEvaluations,
  computeMontgomeryLagrangeCommitment,
  getCachedMontgomeryCommitEvaluations,
  getCachedMontgomeryLagrangeCommitment,
  getCachedMontgomeryLagrangeCommitmentsWholeDomain,
  initializeMontgomeryMsm,
  isMontgomeryMsmEnabled,
  msm,
  msmUnsafe,
  precomputeMontgomeryCommitEvaluations,
  precomputeMontgomeryLagrangeCommitment,
  warmupMontgomeryCommitEvaluations,
  warmupMontgomeryLagrangeCommitment,
  warmupMontgomeryLagrangeCommitmentsWholeDomain,
};

type FieldName = 'fp' | 'fq';
type AffinePoint = { x: bigint; y: bigint; isZero: boolean };
type MontgomeryModule = {
  Pallas(): Promise<MontgomeryCurve>;
  Vesta(): Promise<MontgomeryCurve>;
  startThreads?(threads?: number): Promise<void>;
};
type MontgomeryCurve = {
  Field: {
    local: { getPointer(size?: number): number; getPointers(n: number): number[] };
    getPointer(size?: number): number;
  };
  Scalar: {
    sizeField: number;
    writeBigint(pointer: number, value: bigint): void;
  };
  Affine: {
    size: number;
    writeBigints(pointPtr: number, points: AffinePoint[]): void;
    toBigint(point: number): AffinePoint;
  };
  Projective: { toAffine(scratch: number[], affine: number, point: number): void };
  Parallel: {
    getPointer(size: number): Promise<number>;
    getScalarPointer(size: number): Promise<number>;
    msm(
      scalarPtr: number,
      pointPtr: number,
      n: number,
      verboseTiming?: boolean,
      options?: { c?: number; useSafeAdditions?: boolean }
    ): Promise<{ result: number; log: unknown[][] }>;
    msmUnsafe(
      scalarPtr: number,
      pointPtr: number,
      n: number,
      verboseTiming?: boolean,
      options?: { c?: number; c0?: number }
    ): Promise<{ result: number; log: unknown[][] }>;
  };
};

type MontgomeryOptions = {
  force?: boolean;
  threads?: number;
};

type SrsPointCache = { pointPtr: number; length: number };
type LagrangeCache = {
  commitments: Map<string, PolyComm>;
  wholeDomains: Map<number, MlArray<PolyComm>>;
  pending: Map<string, Promise<boolean>>;
};
type CommitEvaluationsCache = {
  commitments: WeakMap<object, Map<number, PolyComm>>;
  pending: WeakMap<object, Map<number, Promise<boolean>>>;
};

const srsPoints = new WeakMap<object, Map<FieldName, Promise<SrsPointCache>>>();
const lagrangeCache = new WeakMap<object, Map<FieldName, LagrangeCache>>();
const commitEvaluationsCache = new WeakMap<object, Map<FieldName, CommitEvaluationsCache>>();
const scalarPointers = new Map<string, Promise<{ scalarPtr: number; length: number }>>();

let modulePromise: Promise<MontgomeryModule | undefined> | undefined;
let montgomeryModule: MontgomeryModule | undefined;
let threadPromise: Promise<void> | undefined;
let curves: Partial<Record<FieldName, Promise<MontgomeryCurve | undefined>>> = {};

function isMontgomeryMsmEnabled(options?: MontgomeryOptions) {
  if (options?.force === true) return true;
  if (getBackendPreference() !== 'wasm') return false;
  let globalFlag = (globalThis as { O1JS_EXPERIMENTAL_MONTGOMERY_MSM?: unknown })
    .O1JS_EXPERIMENTAL_MONTGOMERY_MSM;
  let processFlag =
    typeof process !== 'undefined' ? process.env.O1JS_EXPERIMENTAL_MONTGOMERY_MSM : undefined;
  return globalFlag === '1' || globalFlag === true || processFlag === '1';
}

async function initializeMontgomeryMsm(options?: MontgomeryOptions) {
  let module = await loadMontgomery(options);
  if (module === undefined) return false;
  let [fp, fq] = await Promise.all([curveForField('fp', options), curveForField('fq', options)]);
  return fp !== undefined && fq !== undefined;
}

async function loadMontgomery(options?: MontgomeryOptions) {
  if (!isMontgomeryMsmEnabled(options) || !runtimeSupportsMontgomery()) return undefined;
  if (montgomeryModule !== undefined) return montgomeryModule;
  modulePromise ??= importOptionalMontgomery().then(async (module) => {
    if (module === undefined) return undefined;
    let threads = options?.threads ?? configuredThreadCount();
    if (threads > 0 && typeof module.startThreads === 'function') {
      threadPromise ??= module.startThreads(threads);
      await threadPromise;
    }
    montgomeryModule = module;
    return module;
  });
  return modulePromise;
}

async function importOptionalMontgomery(): Promise<MontgomeryModule | undefined> {
  try {
    let specifier = 'montgomery';
    return (await import(specifier)) as MontgomeryModule;
  } catch {
    return undefined;
  }
}

async function curveForField(field: FieldName, options?: MontgomeryOptions) {
  let cached = curves[field];
  if (cached !== undefined) return cached;
  let module = await loadMontgomery(options);
  if (module === undefined) return undefined;
  let curve = field === 'fp' ? module.Vesta() : module.Pallas();
  curves[field] = curve;
  return curve;
}

function runtimeSupportsMontgomery() {
  if (
    typeof SharedArrayBuffer === 'undefined' ||
    typeof (Atomics as any).waitAsync !== 'function'
  ) {
    return false;
  }
  if (typeof process === 'undefined' || process.release?.name !== 'node') return true;
  let major = Number(process.versions.node.split('.')[0]);
  return major >= 24;
}

function configuredThreadCount() {
  if (typeof process === 'undefined') return 0;
  let value = Number(process.env.O1JS_MONTGOMERY_THREADS ?? 0);
  return Number.isInteger(value) && value > 0 ? value : 0;
}

async function msm(
  field: FieldName,
  points: OrInfinity[],
  scalars: bigint[],
  options?: MontgomeryOptions
) {
  return msmImpl(field, points, scalars, false, options);
}

async function msmUnsafe(
  field: FieldName,
  points: OrInfinity[],
  scalars: bigint[],
  options?: MontgomeryOptions
) {
  return msmImpl(field, points, scalars, true, options);
}

async function msmImpl(
  field: FieldName,
  points: OrInfinity[],
  scalars: bigint[],
  unsafe: boolean,
  options?: MontgomeryOptions
): Promise<PolyComm | undefined> {
  if (points.length !== scalars.length) throw Error('montgomery MSM input length mismatch');
  let curve = await curveForField(field, options);
  if (curve === undefined) return undefined;
  let pointPtr = await writeMontgomeryPoints(curve, points.map(orInfinityToMontgomery));
  let scalarPtr = await writeMontgomeryScalars(curve, scalars);
  let { result } = unsafe
    ? await curve.Parallel.msmUnsafe(scalarPtr, pointPtr, scalars.length)
    : await curve.Parallel.msm(scalarPtr, pointPtr, scalars.length);
  return polyCommFromMontgomeryResult(curve, result);
}

function getCachedMontgomeryCommitEvaluations(
  field: FieldName,
  srs: object,
  domainSize: number,
  evaluations: MlArray<Field>
) {
  if (!isMontgomeryMsmEnabled()) return undefined;
  return getCommitEvaluationsValueMap(
    getCommitEvaluationsCache(srs, field).commitments,
    evaluations
  ).get(domainSize);
}

function warmupMontgomeryCommitEvaluations(input: {
  field: FieldName;
  srs: object;
  domainSize: number;
  evaluations: MlArray<Field>;
  getSrsPoints(): MlArray<OrInfinity>;
  expected?: PolyComm;
}) {
  void precomputeMontgomeryCommitEvaluations(input).catch(() => undefined);
}

async function precomputeMontgomeryCommitEvaluations(input: {
  field: FieldName;
  srs: object;
  domainSize: number;
  evaluations: MlArray<Field>;
  getSrsPoints(): MlArray<OrInfinity>;
  expected?: PolyComm;
  options?: MontgomeryOptions;
}) {
  if (!isMontgomeryMsmEnabled(input.options)) return false;
  let cache = getCommitEvaluationsCache(input.srs, input.field);
  let commitmentMap = getCommitEvaluationsValueMap(cache.commitments, input.evaluations);
  if (commitmentMap.has(input.domainSize)) return true;

  let pendingMap = getCommitEvaluationsValueMap(cache.pending, input.evaluations);
  let pending = pendingMap.get(input.domainSize);
  if (pending !== undefined) return pending;

  let promise = computeMontgomeryCommitEvaluations(input)
    .then((commitment) => {
      if (commitment === undefined) return false;
      if (input.expected !== undefined && !polyCommEquals(commitment, input.expected)) return false;
      getCommitEvaluationsValueMap(
        getCommitEvaluationsCache(input.srs, input.field).commitments,
        input.evaluations
      ).set(input.domainSize, commitment);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      let pendingMap = getCommitEvaluationsValueMap(
        getCommitEvaluationsCache(input.srs, input.field).pending,
        input.evaluations
      );
      if (pendingMap.get(input.domainSize) === promise) pendingMap.delete(input.domainSize);
    });
  pendingMap.set(input.domainSize, promise);
  return promise;
}

async function computeMontgomeryCommitEvaluations(input: {
  field: FieldName;
  srs: object;
  domainSize: number;
  evaluations: MlArray<Field>;
  getSrsPoints(): MlArray<OrInfinity>;
  options?: MontgomeryOptions;
}) {
  let curve = await curveForField(input.field, input.options);
  if (curve === undefined) return undefined;
  let points = await getMontgomerySrsPoints(input.field, input.srs, input.getSrsPoints, curve);
  if (points.length < input.domainSize) return undefined;
  let scalars = interpolateEvaluations(
    input.field,
    MlArray.mapFrom(input.evaluations, ([, x]) => x)
  );
  if (scalars.length !== input.domainSize) return undefined;
  let scalarPtr = await writeMontgomeryScalars(curve, scalars);
  let { result } = await curve.Parallel.msm(scalarPtr, points.pointPtr, input.domainSize);
  return polyCommFromMontgomeryResult(curve, result);
}

function getCachedMontgomeryLagrangeCommitment(
  field: FieldName,
  srs: object,
  domainSize: number,
  index: number
) {
  if (!isMontgomeryMsmEnabled()) return undefined;
  return getLagrangeCache(srs, field).commitments.get(lagrangeKey(domainSize, index));
}

function warmupMontgomeryLagrangeCommitment(input: {
  field: FieldName;
  srs: object;
  domainSize: number;
  index: number;
  getSrsPoints(): MlArray<OrInfinity>;
  expected?: PolyComm;
}) {
  void precomputeMontgomeryLagrangeCommitment(input).catch(() => undefined);
}

async function precomputeMontgomeryLagrangeCommitment(input: {
  field: FieldName;
  srs: object;
  domainSize: number;
  index: number;
  getSrsPoints(): MlArray<OrInfinity>;
  expected?: PolyComm;
  options?: MontgomeryOptions;
}) {
  if (!isMontgomeryMsmEnabled(input.options)) return false;
  let cache = getLagrangeCache(input.srs, input.field);
  let key = lagrangeKey(input.domainSize, input.index);
  if (cache.commitments.has(key)) return true;
  let pending = cache.pending.get(key);
  if (pending !== undefined) return pending;

  let promise = computeMontgomeryLagrangeCommitment(input)
    .then((commitment) => {
      if (commitment === undefined) return false;
      if (input.expected !== undefined && !polyCommEquals(commitment, input.expected)) return false;
      cache.commitments.set(key, commitment);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      if (cache.pending.get(key) === promise) cache.pending.delete(key);
    });
  cache.pending.set(key, promise);
  return promise;
}

async function computeMontgomeryLagrangeCommitment(input: {
  field: FieldName;
  srs: object;
  domainSize: number;
  index: number;
  getSrsPoints(): MlArray<OrInfinity>;
  options?: MontgomeryOptions;
}) {
  let curve = await curveForField(input.field, input.options);
  if (curve === undefined) return undefined;
  let points = await getMontgomerySrsPoints(input.field, input.srs, input.getSrsPoints, curve);
  if (points.length < input.domainSize) return undefined;
  let scalars = await getLagrangeScalars(input.field, input.domainSize, input.index, curve);
  let { result } = await curve.Parallel.msmUnsafe(
    scalars.scalarPtr,
    points.pointPtr,
    input.domainSize
  );
  return polyCommFromMontgomeryResult(curve, result);
}

function getCachedMontgomeryLagrangeCommitmentsWholeDomain(
  field: FieldName,
  srs: object,
  domainSize: number
) {
  if (!isMontgomeryMsmEnabled()) return undefined;
  return getLagrangeCache(srs, field).wholeDomains.get(domainSize);
}

function warmupMontgomeryLagrangeCommitmentsWholeDomain(input: {
  field: FieldName;
  srs: object;
  domainSize: number;
  getSrsPoints(): MlArray<OrInfinity>;
  expected?: MlArray<PolyComm>;
}) {
  if (!isMontgomeryMsmEnabled()) return;
  let max = configuredWholeDomainWarmupMax();
  if (max <= 0 || input.domainSize > max) return;
  let cache = getLagrangeCache(input.srs, input.field);
  let key = `whole:${input.domainSize}`;
  if (cache.wholeDomains.has(input.domainSize) || cache.pending.has(key)) return;
  let promise = Promise.all(
    Array.from({ length: input.domainSize }, (_, index) =>
      computeMontgomeryLagrangeCommitment({ ...input, index })
    )
  )
    .then((commitments) => {
      if (commitments.some((commitment) => commitment === undefined)) return false;
      let mlCommitments = [0, ...commitments] as MlArray<PolyComm>;
      if (input.expected !== undefined && !polyCommsEqual(mlCommitments, input.expected)) {
        return false;
      }
      cache.wholeDomains.set(input.domainSize, mlCommitments);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      if (cache.pending.get(key) === promise) cache.pending.delete(key);
    });
  cache.pending.set(key, promise);
  void promise;
}

function configuredWholeDomainWarmupMax() {
  if (typeof process === 'undefined') return 0;
  let value = Number(process.env.O1JS_MONTGOMERY_WHOLE_DOMAIN_MAX ?? 0);
  return Number.isInteger(value) && value > 0 ? value : 0;
}

async function getMontgomerySrsPoints(
  field: FieldName,
  srs: object,
  getSrsPoints: () => MlArray<OrInfinity>,
  curve: MontgomeryCurve
) {
  let fieldCache = srsPoints.get(srs);
  if (fieldCache === undefined) srsPoints.set(srs, (fieldCache = new Map()));
  let cached = fieldCache.get(field);
  if (cached !== undefined) return cached;
  let promise = Promise.resolve().then(async () => {
    let [, _h, ...gs] = getSrsPoints();
    let points = gs.map(orInfinityToMontgomery);
    return { pointPtr: await writeMontgomeryPoints(curve, points), length: points.length };
  });
  fieldCache.set(field, promise);
  return promise;
}

async function getLagrangeScalars(
  field: FieldName,
  domainSize: number,
  index: number,
  curve: MontgomeryCurve
) {
  let key = `${field}:${domainSize}:${index}`;
  let cached = scalarPointers.get(key);
  if (cached !== undefined) return cached;
  let promise = Promise.resolve().then(async () => {
    let scalars = lagrangeScalars(field, domainSize, index);
    return { scalarPtr: await writeMontgomeryScalars(curve, scalars), length: scalars.length };
  });
  scalarPointers.set(key, promise);
  return promise;
}

async function writeMontgomeryPoints(curve: MontgomeryCurve, points: AffinePoint[]) {
  let pointPtr = await curve.Parallel.getPointer(points.length * curve.Affine.size);
  curve.Affine.writeBigints(pointPtr, points);
  return pointPtr;
}

async function writeMontgomeryScalars(curve: MontgomeryCurve, scalars: bigint[]) {
  let scalarPtr = await curve.Parallel.getScalarPointer(scalars.length * curve.Scalar.sizeField);
  for (let i = 0, ptr = scalarPtr; i < scalars.length; i++, ptr += curve.Scalar.sizeField) {
    curve.Scalar.writeBigint(ptr, scalars[i]);
  }
  return scalarPtr;
}

function lagrangeScalars(field: FieldName, domainSize: number, index: number) {
  if (!Number.isInteger(domainSize) || domainSize <= 0 || (domainSize & (domainSize - 1)) !== 0) {
    throw Error(`expected power-of-two domain size, got ${domainSize}`);
  }
  if (!Number.isInteger(index) || index < 0 || index >= domainSize) {
    throw Error(`lagrange index ${index} out of range for domain ${domainSize}`);
  }
  let Field = field === 'fp' ? Fp : Fq;
  let omega = domainGenerator(Field, Math.log2(domainSize));
  let omegaInverse = Field.inverse(omega);
  let domainSizeInverse = Field.inverse(BigInt(domainSize));
  if (omegaInverse === undefined || domainSizeInverse === undefined) {
    throw Error('invalid lagrange domain');
  }
  let step = Field.power(omegaInverse, BigInt(index));
  let scalar = domainSizeInverse;
  let scalars = Array<bigint>(domainSize);
  for (let i = 0; i < domainSize; i++) {
    scalars[i] = scalar;
    scalar = Field.mul(scalar, step);
  }
  return scalars;
}

function interpolateEvaluations(field: FieldName, evaluations: bigint[]) {
  let n = evaluations.length;
  if (!Number.isInteger(n) || n <= 0 || (n & (n - 1)) !== 0) {
    throw Error(`expected power-of-two evaluation length, got ${n}`);
  }
  let Field = field === 'fp' ? Fp : Fq;
  let omega = domainGenerator(Field, Math.log2(n));
  let omegaInverse = Field.inverse(omega);
  let nInverse = Field.inverse(BigInt(n));
  if (omegaInverse === undefined || nInverse === undefined) {
    throw Error('invalid evaluation domain');
  }
  let coefficients = fft(Field, evaluations, omegaInverse);
  for (let i = 0; i < coefficients.length; i++) {
    coefficients[i] = Field.mul(coefficients[i], nInverse);
  }
  return coefficients;
}

function fft(Field: FiniteField, input: bigint[], omega: bigint) {
  let n = input.length;
  let values = input.slice();
  bitReverseInPlace(values);
  for (let length = 2; length <= n; length <<= 1) {
    let step = Field.power(omega, BigInt(n / length));
    for (let offset = 0; offset < n; offset += length) {
      let twiddle = 1n;
      let half = length >> 1;
      for (let j = 0; j < half; j++) {
        let even = values[offset + j];
        let odd = Field.mul(values[offset + j + half], twiddle);
        values[offset + j] = Field.add(even, odd);
        values[offset + j + half] = Field.sub(even, odd);
        twiddle = Field.mul(twiddle, step);
      }
    }
  }
  return values;
}

function bitReverseInPlace(values: bigint[]) {
  let n = values.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; (j & bit) !== 0; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let tmp = values[i];
      values[i] = values[j];
      values[j] = tmp;
    }
  }
}

function domainGenerator(Field: FiniteField, logSize: number) {
  if (logSize > Number(Field.M) || logSize < 0) {
    throw Error(`log2 size of evaluation domain must be in [0, ${Field.M}], got ${logSize}`);
  }
  let generator = Field.twoadicRoot;
  for (let j = Number(Field.M); j > logSize; j--) {
    generator = Field.square(generator);
  }
  return generator;
}

function orInfinityToMontgomery(point: OrInfinity): AffinePoint {
  if (point === 0) throw Error('montgomery MSM fast path does not accept infinity points');
  return { x: point[1][1][1], y: point[1][2][1], isZero: false };
}

function polyCommFromMontgomeryResult(curve: MontgomeryCurve, result: number): PolyComm {
  let scratch = curve.Field.local.getPointers(5);
  let affine = curve.Field.local.getPointer(curve.Affine.size);
  curve.Projective.toAffine(scratch, affine, result);
  let point = curve.Affine.toBigint(affine);
  let mlPoint: OrInfinity = point.isZero ? 0 : [0, [0, [0, point.x], [0, point.y]]];
  return [0, [0, mlPoint]];
}

function getLagrangeCache(srs: object, field: FieldName) {
  let srsCache = lagrangeCache.get(srs);
  if (srsCache === undefined) lagrangeCache.set(srs, (srsCache = new Map()));
  let fieldCache = srsCache.get(field);
  if (fieldCache === undefined) {
    fieldCache = { commitments: new Map(), wholeDomains: new Map(), pending: new Map() };
    srsCache.set(field, fieldCache);
  }
  return fieldCache;
}

function getCommitEvaluationsCache(srs: object, field: FieldName) {
  let srsCache = commitEvaluationsCache.get(srs);
  if (srsCache === undefined) commitEvaluationsCache.set(srs, (srsCache = new Map()));
  let fieldCache = srsCache.get(field);
  if (fieldCache === undefined) {
    fieldCache = { commitments: new WeakMap(), pending: new WeakMap() };
    srsCache.set(field, fieldCache);
  }
  return fieldCache;
}

function getCommitEvaluationsValueMap<T>(
  cache: WeakMap<object, Map<number, T>>,
  evaluations: MlArray<Field>
) {
  let key = evaluations as unknown as object;
  let map = cache.get(key);
  if (map === undefined) {
    map = new Map();
    cache.set(key, map);
  }
  return map;
}

function lagrangeKey(domainSize: number, index: number) {
  return `${domainSize}:${index}`;
}

function polyCommsEqual(a: MlArray<PolyComm>, b: MlArray<PolyComm>) {
  if (a.length !== b.length) return false;
  for (let i = 1; i < a.length; i++) {
    if (!polyCommEquals(a[i] as PolyComm, b[i] as PolyComm)) return false;
  }
  return true;
}

function polyCommEquals(a: PolyComm, b: PolyComm) {
  let aPoints = a[1];
  let bPoints = b[1];
  if (aPoints.length !== bPoints.length) return false;
  for (let i = 1; i < aPoints.length; i++) {
    if (!orInfinityEquals(aPoints[i], bPoints[i])) return false;
  }
  return true;
}

function orInfinityEquals(a: OrInfinity, b: OrInfinity) {
  if (a === 0 || b === 0) return a === b;
  return a[1][1][1] === b[1][1][1] && a[1][2][1] === b[1][2][1];
}
