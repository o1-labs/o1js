export { Types } from './bindings/mina-transaction/types.js';
export { Circuit, Keypair, circuitMain, public_ } from './lib/circuit.js';
export {
  CircuitValue,
  Struct,
  arrayProp,
  matrixProp,
  prop,
  provable,
  provablePure,
} from './lib/circuit_value.js';
export type {
  FlexibleProvable,
  FlexibleProvablePure,
  InferProvable,
  ProvableExtended,
} from './lib/circuit_value.js';
export { Bool, Field, Group, Scalar } from './lib/core.js';
export { Poseidon, TokenSymbol } from './lib/hash.js';
export { Int64, Sign, UInt32, UInt64 } from './lib/int.js';
export { Provable } from './lib/provable.js';
export * from './lib/signature.js';
export { Ledger } from './snarky.js';
export type { ProvablePure } from './snarky.js';

export * as Mina from './lib/mina.js';
export { State, declareState, state } from './lib/state.js';
export {
  Account,
  Reducer,
  SmartContract,
  VerificationKey,
  declareMethods,
  method,
} from './lib/zkapp.js';
export type { DeployArgs } from './lib/zkapp.js';

export {
  Empty,
  Proof,
  SelfProof,
  Undefined,
  Void,
  verify,
} from './lib/proof_system.js';
export type { JsonProof } from './lib/proof_system.js';

export {
  AccountUpdate,
  Permissions,
  Token,
  TokenId,
  ZkappPublicInput,
} from './lib/account_update.js';

export * as Encoding from './bindings/lib/encoding.js';
export * as Encryption from './lib/encryption.js';
export {
  KeyPair,
  acquireKeyPair,
  addCachedAccount,
  checkZkappTransaction,
  fetchAccount,
  fetchEvents,
  fetchLastBlock,
  fetchTransactionStatus,
  releaseKeyPair,
  sendZkapp,
  setArchiveGraphqlEndpoint,
  setGraphqlEndpoint,
  setGraphqlEndpoints,
} from './lib/fetch.js';
export type { TransactionStatus } from './lib/fetch.js';
export { MerkleMap, MerkleMapWitness } from './lib/merkle_map.js';
export { MerkleTree, MerkleWitness } from './lib/merkle_tree.js';
export { Character, CircuitString } from './lib/string.js';

export { Nullifier } from './lib/nullifier.js';
export { Experimental };

// experimental APIs
import { createChildAccountUpdate } from './lib/account_update.js';
import { ZkProgram } from './lib/proof_system.js';
import { memoizeWitness } from './lib/provable.js';
import { Callback } from './lib/zkapp.js';

const Experimental_ = {
  Callback,
  createChildAccountUpdate,
  memoizeWitness,
  ZkProgram,
};

type Callback_<Result> = Callback<Result>;

/**
 * This module exposes APIs that are unstable, in the sense that the API surface is expected to change.
 * (Not unstable in the sense that they are less functional or tested than other parts.)
 */
namespace Experimental {
  export let ZkProgram = Experimental_.ZkProgram;
  export let createChildAccountUpdate = Experimental_.createChildAccountUpdate;
  export let memoizeWitness = Experimental_.memoizeWitness;
  export let Callback = Experimental_.Callback;
  export type Callback<Result> = Callback_<Result>;
}

Error.stackTraceLimit = 1000;

// deprecated stuff
export { isReady, shutdown };

/**
 * @deprecated `await isReady` is no longer needed. Remove it from your code.
 */
let isReady = Promise.resolve();

/**
 * @deprecated `shutdown()` is no longer needed, and is a no-op. Remove it from your code.
 */
function shutdown() {}
