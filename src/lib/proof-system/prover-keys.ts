/**
 * This file provides helpers to
 * - encode and decode all 4 kinds of snark keys to/from bytes
 * - create a header which is passed to the `Cache` so that it can figure out where and if to read from cache
 *
 * The inputs are `SnarkKeyHeader` and `SnarkKey`, which are OCaml tagged enums defined in pickles_bindings.ml
 */
import {
  WasmPastaFpPlonkIndex,
  WasmPastaFqPlonkIndex,
} from '../../bindings/compiled/node_bindings/plonk_wasm.cjs';
import { Pickles, wasm } from '../../snarky.js';
import { VerifierIndex } from '../../bindings/crypto/bindings/kimchi-types.js';
import { getRustConversion } from '../../bindings/crypto/bindings.js';
import { MlString } from '../ml/base.js';
import { CacheHeader, cacheHeaderVersion } from './cache.js';
import type { MethodInterface } from './zkprogram.js';

export { parseHeader, encodeProverKey, decodeProverKey, SnarkKeyHeader, SnarkKey };
export type { MlWrapVerificationKey };

// there are 4 types of snark keys in Pickles which we all handle at once
enum KeyType {
  StepProvingKey,
  StepVerificationKey,
  WrapProvingKey,
  WrapVerificationKey,
}

type SnarkKeyHeader =
  | [KeyType.StepProvingKey, MlStepProvingKeyHeader]
  | [KeyType.StepVerificationKey, MlStepVerificationKeyHeader]
  | [KeyType.WrapProvingKey, MlWrapProvingKeyHeader]
  | [KeyType.WrapVerificationKey, MlWrapVerificationKeyHeader];

type SnarkKey =
  | [KeyType.StepProvingKey, MlBackendKeyPair<WasmPastaFpPlonkIndex>]
  | [KeyType.StepVerificationKey, VerifierIndex]
  | [KeyType.WrapProvingKey, MlBackendKeyPair<WasmPastaFqPlonkIndex>]
  | [KeyType.WrapVerificationKey, MlWrapVerificationKey];

/**
 * Create `CacheHeader` from a `SnarkKeyHeader` plus some context available to `compile()`
 */
function parseHeader(
  programName: string,
  methods: MethodInterface[],
  header: SnarkKeyHeader
): CacheHeader {
  let hash = Pickles.util.fromMlString(header[1][2][6]);
  switch (header[0]) {
    case KeyType.StepProvingKey:
    case KeyType.StepVerificationKey: {
      let kind = snarkKeyStringKind[header[0]];
      let methodIndex = header[1][3];
      let methodName = methods[methodIndex].methodName;
      let persistentId = sanitize(`${kind}-${programName}-${methodName}`);
      let uniqueId = sanitize(`${kind}-${programName}-${methodIndex}-${methodName}-${hash}`);
      return {
        version: cacheHeaderVersion,
        uniqueId,
        kind,
        persistentId,
        programName,
        methodName,
        methodIndex,
        hash,
        dataType: snarkKeySerializationType[header[0]],
      };
    }
    case KeyType.WrapProvingKey:
    case KeyType.WrapVerificationKey: {
      let kind = snarkKeyStringKind[header[0]];
      let dataType = snarkKeySerializationType[header[0]];
      let persistentId = sanitize(`${kind}-${programName}`);
      let uniqueId = sanitize(`${kind}-${programName}-${hash}`);
      return {
        version: cacheHeaderVersion,
        uniqueId,
        kind,
        persistentId,
        programName,
        hash,
        dataType,
      };
    }
  }
}

/**
 * Encode a snark key to bytes
 */
function encodeProverKey(value: SnarkKey): Uint8Array {
  switch (value[0]) {
    case KeyType.StepProvingKey: {
      let index = value[1][1];
      let encoded = wasm.caml_pasta_fp_plonk_index_encode(index);
      return encoded;
    }
    case KeyType.StepVerificationKey: {
      let vkMl = value[1];
      const rustConversion = getRustConversion(wasm);
      let vkWasm = rustConversion.fp.verifierIndexToRust(vkMl);
      let string = wasm.caml_pasta_fp_plonk_verifier_index_serialize(vkWasm);
      return new TextEncoder().encode(string);
    }
    case KeyType.WrapProvingKey: {
      let index = value[1][1];
      let encoded = wasm.caml_pasta_fq_plonk_index_encode(index);
      return encoded;
    }
    case KeyType.WrapVerificationKey: {
      let vk = value[1];
      let string = Pickles.encodeVerificationKey(vk);
      return new TextEncoder().encode(string);
    }
    default:
      value satisfies never;
      throw Error('unreachable');
  }
}

/**
 * Decode bytes to a snark key with the help of its header
 */
function decodeProverKey(header: SnarkKeyHeader, bytes: Uint8Array): SnarkKey {
  switch (header[0]) {
    case KeyType.StepProvingKey: {
      let srs = Pickles.loadSrsFp();
      let index = wasm.caml_pasta_fp_plonk_index_decode(bytes, srs);
      let cs = header[1][4];
      return [KeyType.StepProvingKey, [0, index, cs]];
    }
    case KeyType.StepVerificationKey: {
      let srs = Pickles.loadSrsFp();
      let string = new TextDecoder().decode(bytes);
      let vkWasm = wasm.caml_pasta_fp_plonk_verifier_index_deserialize(srs, string);
      const rustConversion = getRustConversion(wasm);
      let vkMl = rustConversion.fp.verifierIndexFromRust(vkWasm);
      return [KeyType.StepVerificationKey, vkMl];
    }
    case KeyType.WrapProvingKey: {
      let srs = Pickles.loadSrsFq();
      let index = wasm.caml_pasta_fq_plonk_index_decode(bytes, srs);
      let cs = header[1][3];
      return [KeyType.WrapProvingKey, [0, index, cs]];
    }
    case KeyType.WrapVerificationKey: {
      let string = new TextDecoder().decode(bytes);
      let vk = Pickles.decodeVerificationKey(string);
      return [KeyType.WrapVerificationKey, vk];
    }
    default:
      header satisfies never;
      throw Error('unreachable');
  }
}

/**
 * Sanitize a string so that it can be used as a file name
 */
function sanitize(string: string): string {
  return string.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

const snarkKeyStringKind = {
  [KeyType.StepProvingKey]: 'step-pk',
  [KeyType.StepVerificationKey]: 'step-vk',
  [KeyType.WrapProvingKey]: 'wrap-pk',
  [KeyType.WrapVerificationKey]: 'wrap-vk',
} as const;

const snarkKeySerializationType = {
  [KeyType.StepProvingKey]: 'bytes',
  [KeyType.StepVerificationKey]: 'string',
  [KeyType.WrapProvingKey]: 'bytes',
  [KeyType.WrapVerificationKey]: 'string',
} as const;

// pickles types

// Plonk_constraint_system.Make()().t

class MlConstraintSystem {
  // opaque type
}

// Dlog_plonk_based_keypair.Make().t

type MlBackendKeyPair<WasmIndex> = [_: 0, index: WasmIndex, cs: MlConstraintSystem];

// Snarky_keys_header.t

type MlSnarkKeysHeader = [
  _: 0,
  headerVersion: number,
  kind: [_: 0, type: MlString, identifier: MlString],
  constraintConstants: unknown,
  length: number,
  constraintSystemHash: MlString,
  identifyingHash: MlString
];

// Pickles.Cache.{Step,Wrap}.Key.Proving.t

type MlStepProvingKeyHeader = [
  _: 0,
  typeEqual: number,
  snarkKeysHeader: MlSnarkKeysHeader,
  index: number,
  constraintSystem: MlConstraintSystem
];

type MlStepVerificationKeyHeader = [
  _: 0,
  typeEqual: number,
  snarkKeysHeader: MlSnarkKeysHeader,
  index: number,
  digest: unknown
];

type MlWrapProvingKeyHeader = [
  _: 0,
  typeEqual: number,
  snarkKeysHeader: MlSnarkKeysHeader,
  constraintSystem: MlConstraintSystem
];

type MlWrapVerificationKeyHeader = [
  _: 0,
  typeEqual: number,
  snarkKeysHeader: MlSnarkKeysHeader,
  digest: unknown
];

// Pickles.Verification_key.t

class MlWrapVerificationKey {
  // opaque type
}
