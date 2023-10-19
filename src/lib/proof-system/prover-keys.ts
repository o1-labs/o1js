import {
  WasmPastaFpPlonkIndex,
  WasmPastaFqPlonkIndex,
} from '../../bindings/compiled/node_bindings/plonk_wasm.cjs';
import { Pickles, getWasm } from '../../snarky.js';

export { encodeProverKey, decodeProverKey, AnyKey, AnyValue };

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

type MlProvingKeyHeader = [
  _: 0,
  typeEqual: number,
  snarkKeysHeader: Opaque,
  index: number,
  constraintSystem: MlConstraintSystem
];

// pickles_bindings.ml, any_key enum

enum KeyType {
  StepProvingKey,
  StepVerificationKey,
  WrapProvingKey,
  WrapVerificationKey,
}

// TODO better names

type AnyKey =
  | [KeyType.StepProvingKey, MlProvingKeyHeader]
  | [KeyType.StepVerificationKey, TODO]
  | [KeyType.WrapProvingKey, MlProvingKeyHeader]
  | [KeyType.WrapVerificationKey, TODO];

type AnyValue =
  | [KeyType.StepProvingKey, MlBackendKeyPair<WasmPastaFpPlonkIndex>]
  | [KeyType.StepVerificationKey, TODO]
  | [KeyType.WrapProvingKey, MlBackendKeyPair<WasmPastaFqPlonkIndex>]
  | [KeyType.WrapVerificationKey, TODO];

function encodeProverKey(value: AnyValue): Uint8Array {
  console.log('ENCODE', value);
  let wasm = getWasm();
  switch (value[0]) {
    case KeyType.StepProvingKey:
      return wasm.caml_pasta_fp_plonk_index_encode(value[1][1]);
    default:
      throw Error('todo');
  }
}

function decodeProverKey(key: AnyKey, bytes: Uint8Array): AnyValue {
  console.log('DECODE', key);
  let wasm = getWasm();
  switch (key[0]) {
    case KeyType.StepProvingKey:
      let srs = Pickles.loadSrsFp();
      let index = wasm.caml_pasta_fp_plonk_index_decode(bytes, srs);
      let cs = key[1][4];
      return [KeyType.StepProvingKey, [0, index, cs]];
    default:
      throw Error('todo');
  }
}
