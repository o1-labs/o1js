import {
  WasmPastaFpPlonkIndex,
  WasmPastaFqPlonkIndex,
} from '../../bindings/compiled/node_bindings/plonk_wasm.cjs';
import { Pickles, getWasm } from '../../snarky.js';

export { encodeProverKey, decodeProverKey, AnyKey, AnyValue };
export type { MlWrapVerificationKey };

type TODO = unknown;
type Opaque = unknown;

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
  snarkKeysHeader: Opaque,
  index: number,
  constraintSystem: MlConstraintSystem
];

type MlWrapProvingKeyHeader = [
  _: 0,
  typeEqual: number,
  snarkKeysHeader: Opaque,
  constraintSystem: MlConstraintSystem
];

// Pickles.Verification_key.t
// no point in defining

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
  | [KeyType.StepVerificationKey, TODO]
  | [KeyType.WrapProvingKey, MlWrapProvingKeyHeader]
  | [KeyType.WrapVerificationKey, TODO];

type AnyValue =
  | [KeyType.StepProvingKey, MlBackendKeyPair<WasmPastaFpPlonkIndex>]
  | [KeyType.StepVerificationKey, TODO]
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
      value[0] satisfies KeyType.StepVerificationKey;
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
      key[0] satisfies KeyType.StepVerificationKey;
      throw Error('todo');
  }
}
