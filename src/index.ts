export { TupleN } from './lib/util/types.js';
export type { ProvablePure } from './lib/provable/types/provable-intf.js';
export { Ledger, initializeBindings } from './snarky.js';
export { Field, Bool, Group, Scalar } from './lib/provable/wrapped.js';
export {
  createForeignField,
  ForeignField,
  AlmostForeignField,
  CanonicalForeignField,
} from './lib/provable/foreign-field.js';
export {
  createForeignCurve,
  ForeignCurve,
} from './lib/provable/crypto/foreign-curve.js';
export {
  createEcdsa,
  EcdsaSignature,
} from './lib/provable/crypto/foreign-ecdsa.js';
export { ScalarField } from './lib/provable/scalar-field.js';
export {
  Poseidon,
  TokenSymbol,
  ProvableHashable,
} from './lib/provable/crypto/poseidon.js';
export { Keccak } from './lib/provable/crypto/keccak.js';
export { Hash } from './lib/provable/crypto/hash.js';

export { assert } from './lib/provable/gadgets/common.js';

export * from './lib/provable/crypto/signature.js';
export type {
  ProvableExtended,
  FlexibleProvable,
  FlexibleProvablePure,
  InferProvable,
} from './lib/provable/types/struct.js';
export {
  From,
  InferValue,
  InferJson,
  IsPure,
} from './bindings/lib/provable-generic.js';
export { ProvableType } from './lib/provable/types/provable-intf.js';
export {
  provable,
  provablePure,
} from './lib/provable/types/provable-derivers.js';
export { Struct } from './lib/provable/types/struct.js';
export { Unconstrained } from './lib/provable/types/unconstrained.js';
export { Provable } from './lib/provable/provable.js';
export {
  Circuit,
  Keypair,
  public_,
  circuitMain,
} from './lib/proof-system/circuit.js';
export { UInt32, UInt64, Int64, Sign, UInt8 } from './lib/provable/int.js';
export { Bytes } from './lib/provable/wrapped-classes.js';
export { Packed, Hashed } from './lib/provable/packed.js';
export { Gadgets } from './lib/provable/gadgets/gadgets.js';
export { Types } from './bindings/mina-transaction/types.js';

export { MerkleList, MerkleListIterator } from './lib/provable/merkle-list.js';
import {
  IndexedMerkleMap,
  IndexedMerkleMapBase,
} from './lib/provable/merkle-tree-indexed.js';
export { Option } from './lib/provable/option.js';

export * as Mina from './lib/mina/mina.js';
export {
  Transaction,
  type TransactionPromise,
  type PendingTransaction,
  type IncludedTransaction,
  type RejectedTransaction,
  type PendingTransactionPromise,
} from './lib/mina/transaction.js';
export type { DeployArgs } from './lib/mina/zkapp.js';
export { SmartContract, method, declareMethods } from './lib/mina/zkapp.js';
export { Reducer } from './lib/mina/actions/reducer.js';
export { state, State, declareState } from './lib/mina/state.js';

export type { JsonProof } from './lib/proof-system/zkprogram.js';
export {
  SelfProof,
  verify,
  Empty,
  Undefined,
  Void,
  VerificationKey,
} from './lib/proof-system/zkprogram.js';
export {
  type ProofBase,
  Proof,
  DynamicProof,
} from './lib/proof-system/proof.js';
export { FeatureFlags } from './lib/proof-system/feature-flags.js';
export { Cache, CacheHeader } from './lib/proof-system/cache.js';

export { Account } from './lib/mina/account.js';
export {
  TokenId,
  AccountUpdate,
  Permissions,
  ZkappPublicInput,
  TransactionVersion,
  AccountUpdateForest,
  AccountUpdateTree,
} from './lib/mina/account-update.js';

export { TokenAccountUpdateIterator } from './lib/mina/token/forest-iterator.js';
export { TokenContract } from './lib/mina/token/token-contract.js';

export type { TransactionStatus } from './lib/mina/graphql.js';
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
} from './lib/mina/fetch.js';
export * as Encryption from './lib/provable/crypto/encryption.js';
export * as Encoding from './bindings/lib/encoding.js';
export { Character, CircuitString } from './lib/provable/string.js';
export { MerkleTree, MerkleWitness } from './lib/provable/merkle-tree.js';
export { MerkleMap, MerkleMapWitness } from './lib/provable/merkle-map.js';

export { Nullifier } from './lib/provable/crypto/nullifier.js';

export { ZkProgram } from './lib/proof-system/zkprogram.js';

export { Crypto } from './lib/provable/crypto/crypto.js';

export type { NetworkId } from './mina-signer/mina-signer.js';

export { setNumberOfWorkers } from './lib/proof-system/workers.js';

// experimental APIs
import { memoizeWitness } from './lib/provable/provable.js';
import * as OffchainState_ from './lib/mina/actions/offchain-state.js';
import * as BatchReducer_ from './lib/mina/actions/batch-reducer.js';
import { Actionable } from './lib/mina/actions/offchain-state-serialization.js';
import { InferProvable } from './lib/provable/types/struct.js';
import { Recursive as Recursive_ } from './lib/proof-system/recursive.js';
export { Experimental };

const Experimental_ = {
  memoizeWitness,
  IndexedMerkleMap,
};

/**
 * This module exposes APIs that are unstable, in the sense that the API surface is expected to change.
 * (Not unstable in the sense that they are less functional or tested than other parts.)
 */
namespace Experimental {
  export let memoizeWitness = Experimental_.memoizeWitness;

  export let Recursive = Recursive_;

  // indexed merkle map
  export let IndexedMerkleMap = Experimental_.IndexedMerkleMap;
  export type IndexedMerkleMap = IndexedMerkleMapBase;

  // offchain state
  export let OffchainState = OffchainState_.OffchainState;

  /**
   * Commitments that keep track of the current state of an offchain Merkle tree constructed from actions.
   * Intended to be stored on-chain.
   *
   * Fields:
   * - `root`: The root of the current Merkle tree
   * - `actionState`: The hash pointing to the list of actions that have been applied to form the current Merkle tree
   */
  export class OffchainStateCommitments extends OffchainState_.OffchainStateCommitments {}

  // batch reducer

  /**
   * A reducer to process actions in fixed-size batches.
   *
   * ```ts
   * let batchReducer = new BatchReducer({ actionType: Action, batchSize: 5 });
   *
   * // in contract: concurrent dispatching of actions
   * batchReducer.dispatch(action);
   *
   * // reducer logic
   * // outside contract: prepare a list of { batch, proof } objects which cover all pending actions
   * let batches = await batchReducer.prepareBatches();
   *
   * // in contract: process a single batch
   * // create one transaction that does this for each batch!
   * batchReducer.processBatch({ batch, proof }, (action, isDummy) => {
   *   // ...
   * });
   * ```
   */
  export class BatchReducer<
    ActionType extends Actionable<any>,
    BatchSize extends number = number,
    Action = InferProvable<ActionType>
  > extends BatchReducer_.BatchReducer<ActionType, BatchSize, Action> {}

  /**
   * Provable type that represents a batch of actions.
   */
  export let ActionBatch = BatchReducer_.ActionBatch;
  export type ActionBatch<Action> = BatchReducer_.ActionBatch<Action>;
}

Error.stackTraceLimit = 100000;
