import {
  WasmPastaFpPlonkIndex,
  WasmPastaFqPlonkIndex,
} from '../../bindings/compiled/node_bindings/plonk_wasm.cjs';
import { Pickles, getWasm } from '../../snarky.js';
import { VerifierIndex } from '../../bindings/crypto/bindings/kimchi-types.js';
import { getRustConversion } from '../../bindings/crypto/bindings.js';

export { encodeProverKey, decodeProverKey, proverKeyType, AnyKey, AnyValue };
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

// Pickles.Cache.{Step,Wrap}.Key.Proving.t

type MlStepProvingKeyHeader = [
  _: 0,
  typeEqual: number,
  snarkKeysHeader: unknown,
  index: number,
  constraintSystem: MlConstraintSystem
];

type MlWrapProvingKeyHeader = [
  _: 0,
  typeEqual: number,
  snarkKeysHeader: unknown,
  constraintSystem: MlConstraintSystem
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
  | [KeyType.StepVerificationKey, unknown]
  | [KeyType.WrapProvingKey, MlWrapProvingKeyHeader]
  | [KeyType.WrapVerificationKey, unknown];

type AnyValue =
  | [KeyType.StepProvingKey, MlBackendKeyPair<WasmPastaFpPlonkIndex>]
  | [KeyType.StepVerificationKey, VerifierIndex]
  | [KeyType.WrapProvingKey, MlBackendKeyPair<WasmPastaFqPlonkIndex>]
  | [KeyType.WrapVerificationKey, MlWrapVerificationKey];

function encodeProverKey(value: AnyValue): Uint8Array {
  let wasm = getWasm();
  switch (value[0]) {
    case KeyType.StepProvingKey: {
      let index = value[1][1];
      console.time('encode index');
      let encoded = wasm.caml_pasta_fp_plonk_index_encode(index);
      console.timeEnd('encode index');
      return encoded;
    }
    case KeyType.StepVerificationKey: {
      let vkMl = value[1];
      console.time('create rust conversion');
      const rustConversion = getRustConversion(getWasm());
      console.timeEnd('create rust conversion');
      console.time('verifierIndexToRust');
      let vkWasm = rustConversion.fp.verifierIndexToRust(vkMl);
      console.timeEnd('verifierIndexToRust');
      console.time('encode vk');
      let string = wasm.caml_pasta_fp_plonk_verifier_index_serialize(vkWasm);
      console.timeEnd('encode vk');
      return new TextEncoder().encode(string);
    }
    case KeyType.WrapProvingKey: {
      let index = value[1][1];
      console.time('encode wrap index');
      let encoded = wasm.caml_pasta_fq_plonk_index_encode(index);
      console.timeEnd('encode wrap index');
      return encoded;
    }
    case KeyType.WrapVerificationKey: {
      let vk = value[1];
      console.time('encode wrap vk');
      let string = Pickles.encodeVerificationKey(vk);
      console.timeEnd('encode wrap vk');
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
      console.time('decode index');
      let index = wasm.caml_pasta_fp_plonk_index_decode(bytes, srs);
      console.timeEnd('decode index');
      let cs = key[1][4];
      return [KeyType.StepProvingKey, [0, index, cs]];
    }
    case KeyType.StepVerificationKey: {
      let srs = Pickles.loadSrsFp();
      let string = new TextDecoder().decode(bytes);
      console.time('decode vk');
      let vkWasm = wasm.caml_pasta_fp_plonk_verifier_index_deserialize(
        srs,
        string
      );
      console.timeEnd('decode vk');
      console.time('create rust conversion');
      const rustConversion = getRustConversion(getWasm());
      console.timeEnd('create rust conversion');
      console.time('verifierIndexFromRust');
      let vkMl = rustConversion.fp.verifierIndexFromRust(vkWasm);
      console.timeEnd('verifierIndexFromRust');
      return [KeyType.StepVerificationKey, vkMl];
    }
    case KeyType.WrapProvingKey: {
      let srs = Pickles.loadSrsFq();
      console.time('decode wrap index');
      let index = wasm.caml_pasta_fq_plonk_index_decode(bytes, srs);
      console.timeEnd('decode wrap index');
      let cs = key[1][3];
      return [KeyType.WrapProvingKey, [0, index, cs]];
    }
    case KeyType.WrapVerificationKey: {
      let string = new TextDecoder().decode(bytes);
      console.time('decode wrap vk');
      let vk = Pickles.decodeVerificationKey(string);
      console.timeEnd('decode wrap vk');
      return [KeyType.WrapVerificationKey, vk];
    }
    default:
      key satisfies never;
      throw Error('todo');
  }
}

const proverKeySerializationType = {
  [KeyType.StepProvingKey]: 'bytes',
  [KeyType.StepVerificationKey]: 'string',
  [KeyType.WrapProvingKey]: 'bytes',
  [KeyType.WrapVerificationKey]: 'string',
} as const;

function proverKeyType(key: AnyKey): 'string' | 'bytes' {
  return proverKeySerializationType[key[0]];
}
