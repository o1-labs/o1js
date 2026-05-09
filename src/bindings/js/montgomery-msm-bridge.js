let bridgeReady;
let curves;

export { installMontgomeryMsmBridge, isMontgomeryProverMsmEnabled };

function installMontgomeryMsmBridge() {
  if (bridgeReady !== undefined) return bridgeReady;
  globalThis.o1jsMontgomerySrsMsmEnabled = isMontgomeryBridgeReady;
  globalThis.o1jsMontgomeryProverMsmEnabled = isMontgomeryProverBridgeReady;
  globalThis.o1jsMontgomerySrsMsm = montgomerySrsMsm;
  globalThis.o1jsMontgomerySrsMsmBatch = montgomerySrsMsmBatch;
  bridgeReady = isMontgomeryBridgeEnabled() ? initializeCurves().catch(() => undefined) : undefined;
  return bridgeReady;
}

async function initializeCurves() {
  let specifier = 'montgomery';
  let montgomery = await import(specifier);
  let [pallas, vesta] = await Promise.all([montgomery.Pallas(), montgomery.Vesta()]);
  curves = { pallas, vesta };
}

function montgomerySrsMsm(curveName, pointBytes, scalarBytes) {
  if (!isMontgomeryBridgeEnabled() || curves === undefined) return undefined;
  let curve = curves[curveName];
  if (curve === undefined) return undefined;
  let n = pointBytes.length / 64;
  if (typeof curve.Sync?.msmAffineBytesBatch === 'function') {
    let bytes = montgomerySrsMsmBatch(curveName, pointBytes, scalarBytes, Uint32Array.of(n));
    if (bytes instanceof Uint8Array && bytes.length === 64 && !isZeroBytes(bytes)) {
      return bytes;
    }
  }

  let msmAffineBytes = curve.Sync?.msmAffineBytes;
  if (typeof msmAffineBytes !== 'function') return undefined;

  let start = traceMsmEnabled() ? performance.now() : 0;
  let bytes = msmAffineBytes(pointBytes, scalarBytes);
  traceMsm(curveName, n, performance.now() - start, bytes);
  if (!(bytes instanceof Uint8Array) || bytes.length !== 64 || isZeroBytes(bytes)) {
    return undefined;
  }
  return bytes;
}

function montgomerySrsMsmBatch(curveName, pointBytes, scalarBytes, sizes) {
  if (!isMontgomeryBridgeEnabled() || curves === undefined) return undefined;
  let curve = curves[curveName];
  if (curve === undefined) return undefined;
  let msmAffineBytesBatch = curve.Sync?.msmAffineBytesBatch;
  if (typeof msmAffineBytesBatch !== 'function') return undefined;

  let start = traceMsmEnabled() ? performance.now() : 0;
  let bytes;
  try {
    bytes = msmAffineBytesBatch(pointBytes, scalarBytes, sizes);
  } catch (error) {
    traceMsmBatch(curveName, sizes, performance.now() - start, undefined, error);
    return undefined;
  }
  traceMsmBatch(curveName, sizes, performance.now() - start, bytes);
  if (!(bytes instanceof Uint8Array) || bytes.length !== sizes.length * 64) {
    return undefined;
  }
  return bytes;
}

function isZeroBytes(bytes) {
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] !== 0) return false;
  }
  return true;
}

function isMontgomeryBridgeReady() {
  return isMontgomeryBridgeEnabled() && curves !== undefined;
}

function isMontgomeryProverBridgeReady() {
  return isMontgomeryProverMsmEnabled() && curves !== undefined;
}

function isMontgomeryBridgeEnabled() {
  let globalFlag = globalThis.O1JS_EXPERIMENTAL_MONTGOMERY_MSM;
  let processFlag =
    typeof process !== 'undefined' ? process.env.O1JS_EXPERIMENTAL_MONTGOMERY_MSM : undefined;
  return globalFlag === '1' || globalFlag === true || processFlag === '1';
}

function isMontgomeryProverMsmEnabled() {
  let globalFlag = globalThis.O1JS_EXPERIMENTAL_MONTGOMERY_PROVER_MSM;
  let processFlag =
    typeof process !== 'undefined'
      ? process.env.O1JS_EXPERIMENTAL_MONTGOMERY_PROVER_MSM
      : undefined;
  return isMontgomeryBridgeEnabled() && (globalFlag === '1' || globalFlag === true || processFlag === '1');
}

function traceMsmEnabled() {
  return typeof process !== 'undefined' && process.env.O1JS_MONTGOMERY_MSM_TRACE === '1';
}

function traceMsm(curve, n, ms, bytes) {
  if (!traceMsmEnabled()) return;
  let ok = bytes instanceof Uint8Array && bytes.length === 64 && !isZeroBytes(bytes);
  process.stderr.write(
    `[o1js-montgomery-msm] ${JSON.stringify({
      curve,
      n,
      ms,
      ok,
      thread: typeof process !== 'undefined' ? process.pid : undefined,
    })}\n`
  );
}

function traceMsmBatch(curve, sizes, ms, bytes, error) {
  if (!traceMsmEnabled()) return;
  let batchSizes = Array.from(sizes);
  let ok = bytes instanceof Uint8Array && bytes.length === batchSizes.length * 64;
  process.stderr.write(
    `[o1js-montgomery-msm] ${JSON.stringify({
      curve,
      batch: batchSizes.length,
      n: batchSizes.reduce((sum, size) => sum + size, 0),
      sizes: batchSizes,
      ms,
      ok,
      error: error === undefined ? undefined : String(error?.stack ?? error),
      thread: typeof process !== 'undefined' ? process.pid : undefined,
    })}\n`
  );
}
