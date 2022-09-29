export {
  Group,
  Scalar,
  ProvablePure,
  Provable,
  JSONValue,
  Ledger,
  isReady,
  shutdown,
} from './snarky.js';
export { Field, Bool } from './lib/core.js';
export type { Keypair } from './snarky.js';
export * from './snarky/addons.js';
export { Poseidon, TokenSymbol } from './lib/hash.js';
export * from './lib/signature.js';
export {
  Circuit,
  CircuitValue,
  ProvableExtended,
  prop,
  arrayProp,
  matrixProp,
  public_,
  circuitMain,
  provable,
  provablePure,
  Struct,
} from './lib/circuit_value.js';
export { UInt32, UInt64, Int64, Sign } from './lib/int.js';
export { Types } from './snarky/types.js';

export * as Mina from './lib/mina.js';
export {
  SmartContract,
  method,
  deploy,
  DeployArgs,
  signFeePayer,
  declareMethods,
  Account,
  VerificationKey,
} from './lib/zkapp.js';
export { state, State, declareState } from './lib/state.js';
export { Proof, SelfProof, verify } from './lib/proof_system.js';

export {
  Token,
  AccountUpdate,
  Permissions,
  ZkappPublicInput,
  zkappCommandToJson,
} from './lib/account_update.js';

export {
  fetchAccount,
  fetchLastBlock,
  addCachedAccount,
  setGraphqlEndpoint,
  sendZkapp,
} from './lib/fetch.js';
export * as Encryption from './lib/encryption.js';
export * as Encoding from './lib/encoding.js';
export { Character, CircuitString } from './lib/string.js';

// experimental APIs
import { ZkProgram } from './lib/proof_system.js';
import { Reducer, Callback } from './lib/zkapp.js';
import { createChildAccountUpdate } from './lib/account_update.js';
import { memoizeWitness } from './lib/circuit_value.js';
import { MerkleTree, MerkleWitness } from './lib/merkle_tree.js';
export { Experimental };

const Experimental_ = {
  Reducer,
  Callback,
  createChildAccountUpdate,
  memoizeWitness,
  MerkleTree,
  MerkleWitness,
  ZkProgram,
};

type Callback_<Result> = Callback<Result>;

/**
 * This module exposes APIs that are unstable, in the sense that the API surface is expected to change.
 * (Not unstable in the sense that they are less functional or tested than other parts.)
 */
namespace Experimental {
  export let ZkProgram = Experimental_.ZkProgram;
  export let Reducer = Experimental_.Reducer;
  export let createChildAccountUpdate = Experimental_.createChildAccountUpdate;
  export let memoizeWitness = Experimental_.memoizeWitness;
  export let MerkleTree = Experimental_.MerkleTree;
  export let MerkleWitness = Experimental_.MerkleWitness;
  export let Callback = Experimental_.Callback;
  export type Callback<Result> = Callback_<Result>;
}
