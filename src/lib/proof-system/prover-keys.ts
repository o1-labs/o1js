import {
  WasmPastaFpPlonkIndex,
  WasmPastaFqPlonkIndex,
} from '../../bindings/compiled/node_bindings/plonk_wasm.cjs';
import { getWasm } from '../../snarky.js';

export { encodeProverKey, decodeProverKey, AnyKey, AnyValue };

type TODO = any;
type Opaque = unknown;

type MlConstraintSystem = Opaque; // opaque

// Dlog_plonk_based_keypair.Make().t

type MlBackendKeyPair<WasmIndex> = [
  _: 0,
  index: WasmIndex,
  cs: MlConstraintSystem
];

// pickles_bindings.ml, any_key enum

enum KeyType {
  StepProverKey,
  StepVerifierKey,
  WrapProverKey,
  WrapVerifierKey,
}

// TODO better names

type AnyKey =
  | [KeyType.StepProverKey, TODO]
  | [KeyType.StepVerifierKey, TODO]
  | [KeyType.WrapProverKey, TODO]
  | [KeyType.WrapVerifierKey, TODO];

type AnyValue =
  | [KeyType.StepProverKey, MlBackendKeyPair<WasmPastaFpPlonkIndex>]
  | [KeyType.StepVerifierKey, unknown]
  | [KeyType.WrapProverKey, MlBackendKeyPair<WasmPastaFqPlonkIndex>]
  | [KeyType.WrapVerifierKey, unknown];

function encodeProverKey(value: AnyValue): Uint8Array {
  console.log('ENCODE', value);
  let wasm = getWasm();
  switch (value[0]) {
    case KeyType.StepProverKey:
      return wasm.caml_pasta_fp_plonk_index_encode(value[1][1]);
    default:
      throw Error('todo');
  }
}

function decodeProverKey(key: AnyKey, bytes: Uint8Array): AnyValue {
  console.log('DECODE', key);
  let wasm = getWasm();
  switch (key[0]) {
    case KeyType.StepProverKey:
      throw Error('todo');
    // return [
    //   KeyType.StepProverKey,
    //   [
    //     0,
    //     wasm.caml_pasta_fp_plonk_index_decode(bytes),
    //     // TODO
    //     null,
    //   ],
    // ];
    default:
      throw Error('todo');
  }
}
