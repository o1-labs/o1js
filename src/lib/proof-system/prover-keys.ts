import {
  WasmPastaFpPlonkIndex,
  WasmPastaFqPlonkIndex,
} from '../../bindings/compiled/node_bindings/plonk_wasm.cjs';

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
  | [KeyType.StepVerifierKey, TODO]
  | [KeyType.WrapProverKey, MlBackendKeyPair<WasmPastaFqPlonkIndex>]
  | [KeyType.WrapVerifierKey, TODO];

function encodeProverKey(value: AnyValue): Uint8Array {
  console.log('ENCODE', value);
  throw Error('todo');
}

function decodeProverKey(key: AnyKey, bytes: Uint8Array): AnyValue {
  console.log('DECODE', key);
  throw Error('todo');
}
