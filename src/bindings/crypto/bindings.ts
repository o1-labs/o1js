/**
 * This file contains bindings for JSOO written in TS and integrated with our normal code base.
 * It is exposed to JSOO by populating a global variable with an object.
 * It gets imported as the first thing in ../../bindings.js so that the global variable is ready by the time JSOO code gets executed.
 */
import { prefixHashes, prefixHashesLegacy } from '../crypto/constants.js';
import { Bigint256Bindings } from './bindings/bigint256.js';
import { PallasBindings, VestaBindings } from './bindings/curve.js';
import { FpBindings, FqBindings } from './bindings/field.js';
import { FpVectorBindings, FqVectorBindings } from './bindings/vector.js';
import type * as wasmNamespace from '../compiled/node_bindings/plonk_wasm.cjs';
import { fieldsFromRustFlat, fieldsToRustFlat } from './bindings/conversion-base.js';
import { proofConversion } from './bindings/conversion-proof.js';
import { conversionCore } from './bindings/conversion-core.js';
import { verifierIndexConversion } from './bindings/conversion-verifier-index.js';
import { oraclesConversion } from './bindings/conversion-oracles.js';
import { jsEnvironment } from './bindings/env.js';
import { srs } from './bindings/srs.js';
// native
import { conversionCore as conversionCoreNative } from './native/conversion-core.js';
import { fieldsFromRustFlat as fieldsFromRustFlatNative, fieldsToRustFlat as fieldsToRustFlatNative } from './native/conversion-base.js';
import { proofConversion as proofConversionNative } from './native/conversion-proof.js';
import { verifierIndexConversion as verifierIndexConversionNative } from './native/conversion-verifier-index.js';
import { oraclesConversion as oraclesConversionNative } from './native/conversion-oracles.js';
import { srs as srsNative } from './native/srs.js';

export { getRustConversion, type RustConversion, type NativeConversion, type Wasm };

const tsBindings = {
  jsEnvironment,
  prefixHashes,
  prefixHashesLegacy,
  ...Bigint256Bindings,
  ...FpBindings,
  ...FqBindings,
  ...VestaBindings,
  ...PallasBindings,
  ...FpVectorBindings,
  ...FqVectorBindings,
  rustConversion: createRustConversion,
  srs: (wasm: Wasm) => {
    const bundle = getConversionBundle(wasm);
    return bundle.srsFactory(wasm, bundle.conversion);
  },
};

// this is put in a global variable so that mina/src/lib/crypto/kimchi_bindings/js/bindings.js finds it
(globalThis as any).__snarkyTsBindings = tsBindings;

type Wasm = typeof wasmNamespace;

function createRustConversion(wasm: Wasm): RustConversion {
  return shouldUseNativeConversion(wasm)
    ? createNativeConversion(wasm)
    : createWasmConversion(wasm);
}

function createWasmConversion(wasm: Wasm) {
  const core = conversionCore(wasm);
  const verifierIndex = verifierIndexConversion(wasm, core);
  const oracles = oraclesConversion(wasm);
  const proof = proofConversion(wasm, core);

  return {
    fp: { ...core.fp, ...verifierIndex.fp, ...oracles.fp, ...proof.fp },
    fq: { ...core.fq, ...verifierIndex.fq, ...oracles.fq, ...proof.fq },
    fieldsToRustFlat,
    fieldsFromRustFlat,
    wireToRust: core.wireToRust,
    mapMlArrayToRustVector: core.mapMlArrayToRustVector,
  };
}

type WasmConversion = ReturnType<typeof createWasmConversion>;
type NativeConversion = ReturnType<typeof createNativeConversion>;
type RustConversion = WasmConversion | NativeConversion;

function getRustConversion(wasm: Wasm): RustConversion {
  return createRustConversion(wasm);
}

function createNativeConversion(wasm: Wasm) {
  const core = conversionCoreNative(wasm);
  const verifierIndex = verifierIndexConversionNative(wasm, core);
  const oracles = oraclesConversionNative(wasm);
  const proof = proofConversionNative(wasm, core);

  return {
    fp: { ...core.fp, ...verifierIndex.fp, ...oracles.fp, ...proof.fp },
    fq: { ...core.fq, ...verifierIndex.fq, ...oracles.fq, ...proof.fq },
    fieldsToRustFlatNative,
    fieldsFromRustFlatNative,
    wireToRust: core.wireToRust,
    mapMlArrayToRustVector: core.mapMlArrayToRustVector,
  };
}

function shouldUseNativeConversion(wasm: Wasm): boolean {
  const marker = (wasm as any).__kimchi_use_native;
  const globalMarker =
    typeof globalThis !== 'undefined' &&
    (globalThis as any).__kimchi_use_native;
  return Boolean(marker || globalMarker);
}

type ConversionBundle =
  | { conversion: WasmConversion; srsFactory: typeof srs }
  | { conversion: NativeConversion; srsFactory: typeof srsNative };

function getConversionBundle(wasm: Wasm): ConversionBundle {
  if (shouldUseNativeConversion(wasm)) {
    return { conversion: createNativeConversion(wasm), srsFactory: srsNative };
  }
  return { conversion: createWasmConversion(wasm), srsFactory: srs };
}
