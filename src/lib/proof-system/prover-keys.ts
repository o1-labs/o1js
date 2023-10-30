import {
  WasmPastaFpPlonkIndex,
  WasmPastaFqPlonkIndex,
} from '../../bindings/compiled/node_bindings/plonk_wasm.cjs';
import { Pickles, getWasm } from '../../snarky.js';
import { VerifierIndex } from '../../bindings/crypto/bindings/kimchi-types.js';
import { getRustConversion } from '../../bindings/crypto/bindings.js';
import { MlString } from '../ml/base.js';
import { CacheHeader, cacheHeaderVersion } from './cache.js';
import type { MethodInterface } from '../proof_system.js';

export { parseHeader, encodeProverKey, decodeProverKey, AnyKey, AnyValue };
export type { MlWrapVerificationKey };

// Plonk_constraint_system.Make()().t

class MlConstraintSystem {
  // opaque type
}

// Dlog_plonk_based_keypair.Make().t

type MlBackendKeyPair<WasmIndex> = [
  _: 0,
  index: WasmIndex,
  cs: MlConstraintSystem
];

// Snarky_keys_header.t

type MlSnarkKeysHeader = [
  _: 0,
  headerVersion: number,
  kind: [_: 0, type: MlString, identifier: MlString],
  constraintConstants: unknown,
  commits: unknown,
  length: number,
  commitDate: MlString,
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

// pickles_bindings.ml, any_key enum

enum KeyType {
  StepProvingKey,
  StepVerificationKey,
  WrapProvingKey,
  WrapVerificationKey,
}

// TODO better names

type AnyKey =
  | [KeyType.StepProvingKey, MlStepProvingKeyHeader]
  | [KeyType.StepVerificationKey, MlStepVerificationKeyHeader]
  | [KeyType.WrapProvingKey, MlWrapProvingKeyHeader]
  | [KeyType.WrapVerificationKey, MlWrapVerificationKeyHeader];

type AnyValue =
  | [KeyType.StepProvingKey, MlBackendKeyPair<WasmPastaFpPlonkIndex>]
  | [KeyType.StepVerificationKey, VerifierIndex]
  | [KeyType.WrapProvingKey, MlBackendKeyPair<WasmPastaFqPlonkIndex>]
  | [KeyType.WrapVerificationKey, MlWrapVerificationKey];

function parseHeader(
  programId: string,
  methods: MethodInterface[],
  key: AnyKey
): CacheHeader {
  let hash = Pickles.util.fromMlString(key[1][2][8]);
  switch (key[0]) {
    case KeyType.StepProvingKey:
    case KeyType.StepVerificationKey: {
      let kind = snarkKeyStringKind[key[0]];
      let methodIndex = key[1][3];
      let methodName = methods[methodIndex].methodName;
      // TODO sanitize unique id
      let uniqueId = `${kind}-${programId}-${methodIndex}-${methodName}-${hash}`;
      return {
        version: cacheHeaderVersion,
        uniqueId,
        kind,
        programId,
        methodName,
        methodIndex,
        hash,
        dataType: snarkKeySerializationType[key[0]],
      };
    }
    case KeyType.WrapProvingKey:
    case KeyType.WrapVerificationKey: {
      let kind = snarkKeyStringKind[key[0]];
      let dataType = snarkKeySerializationType[key[0]];
      // TODO sanitize unique id
      let uniqueId = `${kind}-${programId}-${hash}`;
      return {
        version: cacheHeaderVersion,
        uniqueId,
        kind,
        programId,
        hash,
        dataType,
      };
    }
  }
}

function encodeProverKey(value: AnyValue): Uint8Array {
  let wasm = getWasm();
  switch (value[0]) {
    case KeyType.StepProvingKey: {
      let index = value[1][1];
      let encoded = wasm.caml_pasta_fp_plonk_index_encode(index);
      return encoded;
    }
    case KeyType.StepVerificationKey: {
      let vkMl = value[1];
      const rustConversion = getRustConversion(getWasm());
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
      throw Error('todo');
  }
}

function decodeProverKey(key: AnyKey, bytes: Uint8Array): AnyValue {
  let wasm = getWasm();
  switch (key[0]) {
    case KeyType.StepProvingKey: {
      let srs = Pickles.loadSrsFp();
      let index = wasm.caml_pasta_fp_plonk_index_decode(bytes, srs);
      let cs = key[1][4];
      return [KeyType.StepProvingKey, [0, index, cs]];
    }
    case KeyType.StepVerificationKey: {
      let srs = Pickles.loadSrsFp();
      let string = new TextDecoder().decode(bytes);
      let vkWasm = wasm.caml_pasta_fp_plonk_verifier_index_deserialize(
        srs,
        string
      );
      const rustConversion = getRustConversion(getWasm());
      let vkMl = rustConversion.fp.verifierIndexFromRust(vkWasm);
      return [KeyType.StepVerificationKey, vkMl];
    }
    case KeyType.WrapProvingKey: {
      let srs = Pickles.loadSrsFq();
      let index = wasm.caml_pasta_fq_plonk_index_decode(bytes, srs);
      let cs = key[1][3];
      return [KeyType.WrapProvingKey, [0, index, cs]];
    }
    case KeyType.WrapVerificationKey: {
      let string = new TextDecoder().decode(bytes);
      let vk = Pickles.decodeVerificationKey(string);
      return [KeyType.WrapVerificationKey, vk];
    }
    default:
      key satisfies never;
      throw Error('todo');
  }
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
