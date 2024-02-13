export type { ProvablePure } from './snarky.js';
export { Ledger } from './snarky.js';
export { Field, Bool, Group, Scalar } from './lib/core.js';
export {
  createForeignField,
  ForeignField,
  AlmostForeignField,
  CanonicalForeignField,
} from './lib/foreign-field.js';
export { createForeignCurve, ForeignCurve } from './lib/foreign-curve.js';
export { createEcdsa, EcdsaSignature } from './lib/foreign-ecdsa.js';
export { Poseidon, TokenSymbol, ProvableHashable } from './lib/hash.js';
export { Keccak } from './lib/keccak.js';
export { Hash } from './lib/hashes-combined.js';

export { assert } from './lib/gadgets/common.js';

export * from './lib/signature.js';
export type {
  ProvableExtended,
  FlexibleProvable,
  FlexibleProvablePure,
  InferProvable,
} from './lib/circuit-value.js';
export {
  CircuitValue,
  prop,
  arrayProp,
  matrixProp,
  provable,
  provablePure,
  Struct,
  Unconstrained,
} from './lib/circuit-value.js';
export { Provable } from './lib/provable.js';
export { Circuit, Keypair, public_, circuitMain } from './lib/circuit.js';
export { UInt32, UInt64, Int64, Sign, UInt8 } from './lib/int.js';
export { Bytes } from './lib/provable-types/provable-types.js';
export { Packed, Hashed } from './lib/provable-types/packed.js';
export { Gadgets } from './lib/gadgets/gadgets.js';
export { Types } from './bindings/mina-transaction/types.js';

export {
  MerkleList,
  MerkleListIterator,
} from './lib/provable-types/merkle-list.js';

export * as Mina from './lib/mina.js';
export type { DeployArgs } from './lib/zkapp.js';
export {
  SmartContract,
  method,
  declareMethods,
  Account,
  Reducer,
} from './lib/zkapp.js';
export { state, State, declareState } from './lib/state.js';

export type { JsonProof } from './lib/proof-system.js';
export {
  Proof,
  SelfProof,
  verify,
  Empty,
  Undefined,
  Void,
  VerificationKey,
} from './lib/proof-system.js';
export { Cache, CacheHeader } from './lib/proof-system/cache.js';

export {
  Token,
  TokenId,
  AccountUpdate,
  Permissions,
  ZkappPublicInput,
  TransactionVersion,
  AccountUpdateForest,
  AccountUpdateTree,
} from './lib/account-update.js';

export { TokenAccountUpdateIterator } from './lib/mina/token/forest-iterator.js';
export { TokenContract } from './lib/mina/token/token-contract.js';

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
  Lightnet,
} from './lib/fetch.js';
export * as Encryption from './lib/encryption.js';
export * as Encoding from './bindings/lib/encoding.js';
export { Character, CircuitString } from './lib/string.js';
export { MerkleTree, MerkleWitness } from './lib/merkle-tree.js';
export { MerkleMap, MerkleMapWitness } from './lib/merkle-map.js';

export { Nullifier } from './lib/nullifier.js';

import { ExperimentalZkProgram, ZkProgram } from './lib/proof-system.js';
export { ZkProgram };

export { Crypto } from './lib/crypto.js';

// experimental APIs
import { memoizeWitness } from './lib/provable.js';
export { Experimental };

const Experimental_ = {
  memoizeWitness,
};

/**
 * This module exposes APIs that are unstable, in the sense that the API surface is expected to change.
 * (Not unstable in the sense that they are less functional or tested than other parts.)
 */
namespace Experimental {
  /** @deprecated `ZkProgram` has moved out of the Experimental namespace and is now directly available as a top-level import `ZkProgram`.
   * The old `Experimental.ZkProgram` API has been deprecated in favor of the new `ZkProgram` top-level import.
   */
  export let ZkProgram = ExperimentalZkProgram;
  export let memoizeWitness = Experimental_.memoizeWitness;
}

Error.stackTraceLimit = 100000;

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
