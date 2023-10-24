export type { ProvablePure } from './snarky.js';
export { Ledger } from './snarky.js';
export { Field, Bool, Group, Scalar } from './lib/core.js';
export { Poseidon, TokenSymbol } from './lib/hash.js';
export * from './lib/signature.js';
export type {
  ProvableExtended,
  FlexibleProvable,
  FlexibleProvablePure,
  InferProvable,
} from './lib/circuit_value.js';
export {
  CircuitValue,
  prop,
  arrayProp,
  matrixProp,
  provable,
  provablePure,
  Struct,
} from './lib/circuit_value.js';
export { Provable } from './lib/provable.js';
export { Circuit, Keypair, public_, circuitMain } from './lib/circuit.js';
export { UInt32, UInt64, Int64, Sign } from './lib/int.js';
export { Types } from './bindings/mina-transaction/types.js';

export * as Mina from './lib/mina.js';
export type { DeployArgs } from './lib/zkapp.js';
export {
  SmartContract,
  method,
  declareMethods,
  Account,
  VerificationKey,
  Reducer,
} from './lib/zkapp.js';
export { state, State, declareState } from './lib/state.js';

export type { JsonProof } from './lib/proof_system.js';
export {
  Proof,
  SelfProof,
  verify,
  Empty,
  Undefined,
  Void,
} from './lib/proof_system.js';

export {
  Token,
  TokenId,
  AccountUpdate,
  Permissions,
  TxnVersion,
  ZkappPublicInput,
} from './lib/account_update.js';

export type { TransactionStatus } from './lib/fetch.js';
export {
  fetchAccount,
  fetchLastBlock,
  fetchTransactionStatus,
  checkZkappTransaction,
  fetchEvents,
  addCachedAccount,
  setGraphqlEndpoint,
  setGraphqlEndpoints,
  setArchiveGraphqlEndpoint,
  sendZkapp,
} from './lib/fetch.js';
export * as Encryption from './lib/encryption.js';
export * as Encoding from './bindings/lib/encoding.js';
export { Character, CircuitString } from './lib/string.js';
export { MerkleTree, MerkleWitness } from './lib/merkle_tree.js';
export { MerkleMap, MerkleMapWitness } from './lib/merkle_map.js';

export { Nullifier } from './lib/nullifier.js';

// experimental APIs
import { ZkProgram } from './lib/proof_system.js';
import { Callback } from './lib/zkapp.js';
import { createChildAccountUpdate } from './lib/account_update.js';
import { memoizeWitness } from './lib/provable.js';
export { Experimental };

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
