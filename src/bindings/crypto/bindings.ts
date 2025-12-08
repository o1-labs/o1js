/**
 * This file contains bindings for JSOO written in TS and integrated with our normal code base.
 * It is exposed to JSOO by populating a global variable with an object.
 * It gets imported as the first thing in ../../bindings.js so that the global variable is ready by the time JSOO code gets executed.
 */
import type * as napiNamespace from '../compiled/node_bindings/plonk_wasm.cjs';
import type * as wasmNamespace from '../compiled/node_bindings/plonk_wasm.cjs';
import { prefixHashes, prefixHashesLegacy } from '../crypto/constants.js';
import { Bigint256Bindings } from './bindings/bigint256.js';
import { fieldsFromRustFlat, fieldsToRustFlat } from './bindings/conversion-base.js';
import { conversionCore } from './bindings/conversion-core.js';
import { oraclesConversion } from './bindings/conversion-oracles.js';
import { proofConversion } from './bindings/conversion-proof.js';
import { verifierIndexConversion } from './bindings/conversion-verifier-index.js';
import { PallasBindings, VestaBindings } from './bindings/curve.js';
import { jsEnvironment } from './bindings/env.js';
import { FpBindings, FqBindings } from './bindings/field.js';
import { FpVectorBindings, FqVectorBindings } from './bindings/vector.js';
import { srs } from './bindings/srs.js';
import { srs as napiSrs } from './napi-srs.js';
import { napiConversionCore } from './napi-conversion-core.js';
import { napiProofConversion } from './napi-conversion-proof.js';
import { napiVerifierIndexConversion } from './napi-conversion-verifier-index.js';
import { napiOraclesConversion } from './bindings/napi-conversion-oracles.js';

export { Napi, RustConversion, Wasm, createNativeRustConversion, getRustConversion };

/* TODO: Uncomment in phase 2 of conversion layer 
import { conversionCore as conversionCoreNative } from './native/conversion-core.js';
import { fieldsFromRustFlat as fieldsFromRustFlatNative, fieldsToRustFlat as fieldsToRustFlatNative } from './native/conversion-base.js';
import { proofConversion as proofConversionNative } from './native/conversion-proof.js';
import { verifierIndexConversion as verifierIndexConversionNative } from './native/conversion-verifier-index.js';
import { oraclesConversion as oraclesConversionNative } from './native/conversion-oracles.js';

export { getRustConversion, type RustConversion, type NativeConversion, type Wasm };*/

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
  nativeRustConversion: createNativeRustConversion,
  /* TODO: Uncomment in phase 2 of conversion layer   
  srs: (wasm: Wasm) => {
    const bundle = getConversionBundle(wasm);
    return bundle.srsFactory(wasm, bundle.conversion);
  },*/
  srs: (wasm: Wasm) => srs(wasm, getRustConversion(wasm)),
  srsNative: (napi: Napi) => napiSrs(napi, createNativeRustConversion(napi) as any),
};

// this is put in a global variable so that mina/src/lib/crypto/kimchi_bindings/js/bindings.js finds it
(globalThis as any).__snarkyTsBindings = tsBindings;

type Wasm = typeof wasmNamespace;
type Napi = typeof napiNamespace;

type RustConversion = ReturnType<typeof buildWasmConversion>;

function getRustConversion(wasm: Wasm): RustConversion {
  return createRustConversion(wasm);
}

function createRustConversion(wasm: Wasm) {
  return buildWasmConversion(wasm);
}

function buildWasmConversion(wasm: Wasm) {
  let core = conversionCore(wasm);
  let verifierIndex = verifierIndexConversion(wasm, core);
  let oracles = oraclesConversion(wasm);
  let proof = proofConversion(wasm, core);

  return {
    fp: { ...core.fp, ...verifierIndex.fp, ...oracles.fp, ...proof.fp },
    fq: { ...core.fq, ...verifierIndex.fq, ...oracles.fq, ...proof.fq },
    fieldsToRustFlat,
    fieldsFromRustFlat,
    wireToRust: core.wireToRust,
    mapMlArrayToRustVector: core.mapMlArrayToRustVector,
  };
}

function createNativeRustConversion(napi: any) {
  let core = napiConversionCore(napi);
  let proof = napiProofConversion(napi, core);
  let verif = napiVerifierIndexConversion(napi, core);
  let oracles = napiOraclesConversion(napi);
  return {
    fp: { ...core.fp, ...proof.fp, ...verif.fp, ...oracles.fp },
    fq: { ...core.fq, ...proof.fq, ...verif.fq, ...oracles.fq },
  };
}

/* TODO: Uncomment in phase 2 of conversion layer   

function shouldUseNativeConversion(wasm: Wasm): boolean {
  const marker = (wasm as any).__kimchi_use_native;
  const globalMarker =
    typeof globalThis !== 'undefined' &&
    (globalThis as any).__kimchi_use_native;
  return Boolean(marker || globalMarker);
}

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

type RustConversion = ReturnType<typeof buildConversion>;

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

type ConversionBundle =
  | { conversion: WasmConversion; srsFactory: typeof srs }
  | { conversion: NativeConversion; srsFactory: typeof srsNative };

function getConversionBundle(wasm: Wasm): ConversionBundle {
  if (shouldUseNativeConversion(wasm)) {
    return { conversion: createNativeConversion(wasm), srsFactory: srsNative };
  }
  return { conversion: createWasmConversion(wasm), srsFactory: srs };
}
*/
