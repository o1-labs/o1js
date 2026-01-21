/**
 * This file contains bindings for JSOO written in TS and integrated with our normal code base.
 * It is exposed to JSOO by populating a global variable with an object.
 * It gets imported as the first thing in ../../bindings.js so that the global variable is ready by the time JSOO code gets executed.
 */
import type * as rustNamespace from '../compiled/node_bindings/plonk_wasm.cjs';
import { prefixHashes, prefixHashesLegacy } from '../crypto/constants.js';
import { Bigint256Bindings } from './bindings/bigint256.js';
import { fieldsFromRustFlat, fieldsToRustFlat } from './bindings/conversion-base.js';
import { conversionCore as wasmConversionCore } from './bindings/conversion-core.js';
import { oraclesConversion as wasmOraclesConversion } from './bindings/conversion-oracles.js';
import { proofConversion as wasmProofConversion } from './bindings/conversion-proof.js';
import { verifierIndexConversion as wasmVerifierIndexConversion } from './bindings/conversion-verifier-index.js';
import { PallasBindings, VestaBindings } from './bindings/curve.js';
import { jsEnvironment } from './bindings/env.js';
import { FpBindings, FqBindings } from './bindings/field.js';
import { FpVectorBindings, FqVectorBindings } from './bindings/vector.js';
import { srs as wasmSrs } from './bindings/srs.js';
import { srs as napiSrs } from './napi-srs.js';
import { napiConversionCore } from './napi-conversion-core.js';
import { napiProofConversion } from './napi-conversion-proof.js';
import { napiVerifierIndexConversion } from './napi-conversion-verifier-index.js';
import { napiOraclesConversion } from './napi-conversion-oracles.js';

export { Napi, Wasm, RustConversion, getRustConversion };



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
  rustConversion: (rust: Rust) => getConversionBundle(rust).conversion,
  srs: (rust: Rust) => getConversionBundle(rust).srs,
};

// this is put in a global variable so that mina/src/lib/crypto/kimchi_bindings/js/bindings.js finds it
(globalThis as any).__snarkyTsBindings = tsBindings;

type Rust = typeof rustNamespace;
type Wasm = Rust;
type Napi = Rust;
type BackendKind = 'wasm' | 'napi';

// Whether or not native backend is in use
function shouldUseNativeConversion(rust: Rust): boolean {
  const marker = (rust as any).__kimchi_use_native;
  const globalMarker =
    typeof globalThis !== 'undefined' &&
    (globalThis as any).__kimchi_use_native;
  return Boolean(marker || globalMarker);
}

type WasmConversion = ReturnType<typeof buildWasmRustConversion>;
type NapiConversion = ReturnType<typeof buildNapiRustConversion>;

type RustConversion<B extends BackendKind = BackendKind> = B extends 'wasm'
  ? WasmConversion
  : NapiConversion;

function getRustConversion(rust: Rust): RustConversion {
  return shouldUseNativeConversion(rust)
    ? buildNapiRustConversion(rust)
    : buildWasmRustConversion(rust);
}

function buildWasmRustConversion(wasm: Rust) {
  let core = wasmConversionCore(wasm);
  let proof = wasmProofConversion(wasm, core);
  let oracles = wasmOraclesConversion(wasm);
  let verifierIndex = wasmVerifierIndexConversion(wasm, core);

  return {
    fp: { ...core.fp, ...verifierIndex.fp, ...oracles.fp, ...proof.fp },
    fq: { ...core.fq, ...verifierIndex.fq, ...oracles.fq, ...proof.fq },
    fieldsToRustFlat,
    fieldsFromRustFlat,
    wireToRust: core.wireToRust,
    mapMlArrayToRustVector: core.mapMlArrayToRustVector,
  };
}

function buildNapiRustConversion(napi: Rust) {
  let core = napiConversionCore(napi);
  let proof = napiProofConversion(napi, core);
  let oracles = napiOraclesConversion(napi);
  let verifierIndex = napiVerifierIndexConversion(napi, core);

  return {
    fp: { ...core.fp, ...proof.fp, ...verifierIndex.fp, ...oracles.fp },
    fq: { ...core.fq, ...proof.fq, ...verifierIndex.fq, ...oracles.fq },
    fieldsToRustFlat,
    fieldsFromRustFlat,
    wireToRust: core.wireToRust,
    mapMlArrayToRustVector: core.mapMlArrayToRustVector,
  };
}

type ConversionBundle<B extends BackendKind> = {
  kind: B;
  rust: Rust;
  conversion: RustConversion<B>;
  srs: B extends 'wasm' ? ReturnType<typeof wasmSrs> : ReturnType<typeof napiSrs>;
};

function getConversionBundle(rust: Rust): ConversionBundle<BackendKind> {
  if (shouldUseNativeConversion(rust)) {
    const conversion = buildNapiRustConversion(rust);
    return { kind: 'napi', rust, conversion, srs: napiSrs(rust, conversion) };
  }
  const conversion = buildWasmRustConversion(rust);
  return { kind: 'wasm', rust, conversion, srs: wasmSrs(rust, conversion) };
}
