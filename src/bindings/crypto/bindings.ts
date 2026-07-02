/**
 * This file contains bindings for JSOO written in TS and integrated with our normal code base.
 * It is exposed to JSOO by populating a global variable with an object.
 * It gets imported as the first thing in ../../bindings.js so that the global variable is ready by the time JSOO code gets executed.
 */
import type * as rustNamespace from '../compiled/node_bindings/kimchi_napi.wasi.cjs';
import { prefixHashes, prefixHashesLegacy } from '../crypto/constants.js';
import { Bigint256Bindings } from './bindings/bigint256.js';
import { fieldsFromRustFlat, fieldsToRustFlat } from './bindings/conversion-base.js';
import { PallasBindings, VestaBindings } from './bindings/curve.js';
import { jsEnvironment } from './bindings/env.js';
import { FpBindings, FqBindings } from './bindings/field.js';
import { FpVectorBindings, FqVectorBindings } from './bindings/vector.js';
import { napiConversionCore } from './native/napi-conversion-core.js';
import { napiOraclesConversion } from './native/napi-conversion-oracles.js';
import { napiProofConversion } from './native/napi-conversion-proof.js';
import { napiVerifierIndexConversion } from './native/napi-conversion-verifier-index.js';
import { srs as napiSrs } from './native/napi-srs.js';

export { Napi, RustConversion, Wasm, getRustConversion };

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

// Both backends (the native .node build and the wasm32-wasip1-threads build)
// are napi-rs builds of the same kimchi-napi crate, so a single conversion
// layer serves both.
type Rust = typeof rustNamespace;
type Wasm = Rust;
type Napi = Rust;

type RustConversion = ReturnType<typeof buildNapiRustConversion>;

function getRustConversion(rust: Rust): RustConversion {
  return getConversionBundle(rust).conversion;
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

type ConversionBundle = {
  rust: Rust;
  conversion: RustConversion;
  srs: ReturnType<typeof napiSrs>;
};

// cache the bundle per FFI module, so that repeated calls from JSOO don't
// rebuild the conversion tables
let bundleCache = new WeakMap<object, ConversionBundle>();

function getConversionBundle(rust: Rust): ConversionBundle {
  let cached = bundleCache.get(rust as object);
  if (cached !== undefined) return cached;
  const conversion = buildNapiRustConversion(rust);
  const bundle = { rust, conversion, srs: napiSrs(rust, conversion) };
  bundleCache.set(rust as object, bundle);
  return bundle;
}
