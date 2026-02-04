/**
 * Include in this file all the exports that should be part of the public API.
 */
export { initializeBindings, Ledger } from './bindings.js';
export { createForeignCurve, ForeignCurve, toPoint } from './lib/provable/crypto/foreign-curve.js';
export type { FlexiblePoint } from './lib/provable/crypto/foreign-curve.js';
export { createEcdsa, EcdsaSignature } from './lib/provable/crypto/foreign-ecdsa.js';
export { Hash } from './lib/provable/crypto/hash.js';
export { Keccak } from './lib/provable/crypto/keccak.js';
export { Poseidon, ProvableHashable, TokenSymbol } from './lib/provable/crypto/poseidon.js';
export {
  AlmostForeignField,
  CanonicalForeignField,
  createForeignField,
  ForeignField,
} from './lib/provable/foreign-field.js';
export { ScalarField } from './lib/provable/scalar-field.js';
export type { ProvablePure } from './lib/provable/types/provable-intf.js';
export { Bool, Field, Group, Scalar } from './lib/provable/wrapped.js';
export { TupleN } from './lib/util/types.js';

export { assert } from './lib/provable/gadgets/common.js';

export * from './lib/provable/crypto/signature.js';
export type {
  FlexibleProvable,
  FlexibleProvablePure,
  InferProvable,
  ProvableExtended,
} from './lib/provable/types/struct.js';

export { provableFromClass } from './lib/provable/types/provable-derivers.js';
export type { ProvablePureExtended } from './lib/provable/types/struct.js';

export { From, InferJson, InferValue, IsPure } from './bindings/lib/provable-generic.js';
export { Types } from './bindings/mina-transaction/v1/types.js';
export { Circuit, circuitMain, Keypair, public_ } from './lib/proof-system/circuit.js';
export { DynamicArray } from './lib/provable/dynamic-array.js';
export { Gadgets } from './lib/provable/gadgets/gadgets.js';
export { RuntimeTable } from './lib/provable/gadgets/runtime-table.js';
export { Int64, Sign, UInt32, UInt64, UInt8 } from './lib/provable/int.js';
export { Hashed, Packed } from './lib/provable/packed.js';
export { Provable } from './lib/provable/provable.js';
export { provable, provablePure } from './lib/provable/types/provable-derivers.js';
export { ProvableType } from './lib/provable/types/provable-intf.js';
export { Struct } from './lib/provable/types/struct.js';
export { Unconstrained } from './lib/provable/types/unconstrained.js';
export { Bytes, FlexibleBytes } from './lib/provable/wrapped-classes.js';

export { MerkleList, MerkleListIterator } from './lib/provable/merkle-list.js';
export { Option } from './lib/provable/option.js';
import {
  IndexedMerkleMap as IndexedMerkleMap_,
  IndexedMerkleMapBase,
} from './lib/provable/merkle-tree-indexed.js';
export let IndexedMerkleMap = IndexedMerkleMap_;
export type IndexedMerkleMap = IndexedMerkleMapBase;

export { Reducer } from './lib/mina/v1/actions/reducer.js';
export * as Mina from './lib/mina/v1/mina.js';
export { declareState, state, State } from './lib/mina/v1/state.js';
export {
  Transaction,
  type IncludedTransaction,
  type PendingTransaction,
  type PendingTransactionPromise,
  type RejectedTransaction,
  type TransactionPromise,
} from './lib/mina/v1/transaction.js';
export { declareMethods, method, SmartContract } from './lib/mina/v1/zkapp.js';
export type { DeployArgs } from './lib/mina/v1/zkapp.js';

export { Cache, CacheHeader } from './lib/proof-system/cache.js';
export { FeatureFlags } from './lib/proof-system/feature-flags.js';
export { DynamicProof, Proof, type ProofBase } from './lib/proof-system/proof.js';
export { VerificationKey } from './lib/proof-system/verification-key.js';
export { Empty, SelfProof, Undefined, verify, Void } from './lib/proof-system/zkprogram.js';
export type { JsonProof } from './lib/proof-system/zkprogram.js';

export {
  AccountUpdate,
  AccountUpdateForest,
  AccountUpdateTree,
  Permissions,
  TokenId,
  TransactionVersion,
  ZkappPublicInput,
} from './lib/mina/v1/account-update.js';
export { Account } from './lib/mina/v1/account.js';

export { TokenAccountUpdateIterator } from './lib/mina/v1/token/forest-iterator.js';
export { TokenContract } from './lib/mina/v1/token/token-contract.js';

export * as Encoding from './bindings/lib/encoding.js';
export {
  addCachedAccount,
  checkZkappTransaction,
  fetchAccount,
  fetchCurrentSlot,
  fetchEvents,
  fetchLastBlock,
  fetchTimedAccountInfo,
  fetchTransactionDepth,
  fetchTransactionStatus,
  Lightnet,
  sendZkapp,
  setArchiveGraphqlEndpoint,
  setGraphqlEndpoint,
  setGraphqlEndpoints,
} from './lib/mina/v1/fetch.js';
export type {
  DepthOptions,
  TransactionDepthInfo,
  TransactionStatus,
} from './lib/mina/v1/graphql.js';
export * as Encryption from './lib/provable/crypto/encryption.js';
export { MerkleMap, MerkleMapWitness } from './lib/provable/merkle-map.js';
export { MerkleTree, MerkleWitness } from './lib/provable/merkle-tree.js';
export { Character, CircuitString } from './lib/provable/string.js';

export { Nullifier } from './lib/provable/crypto/nullifier.js';

export { ZkProgram } from './lib/proof-system/zkprogram.js';

export { Crypto } from './lib/provable/crypto/crypto.js';

export type { NetworkId } from './mina-signer/mina-signer.js';

export { setNumberOfWorkers } from './lib/proof-system/workers.js';
export { Experimental };

// experimental APIs
import * as BatchReducer_ from './lib/mina/v1/actions/batch-reducer.js';
import { Actionable } from './lib/mina/v1/actions/offchain-state-serialization.js';
import * as OffchainState_ from './lib/mina/v1/actions/offchain-state.js';
import { Recursive as Recursive_ } from './lib/proof-system/recursive.js';
import {
  KimchiJsonProof as KimchiJsonProof_,
  KimchiProof as KimchiProof_,
  KimchiVerificationKey as KimchiVerificationKey_,
  ZkFunction as ZkFunction_,
} from './lib/proof-system/zkfunction.js';
import {
  createProvableBigInt as createProvableBigInt_,
  ProvableBigInt as ProvableBigInt_,
} from './lib/provable/bigint.js';
import { memoizeWitness } from './lib/provable/provable.js';
import { InferProvable } from './lib/provable/types/struct.js';

import * as V2_ from './lib/mina/v2/index.js';
import { Field } from './lib/provable/wrapped.js';

const Experimental_ = {
  memoizeWitness,
  V2: V2_,
};

/**
 * This module exposes APIs that are unstable, in the sense that the API surface is expected to change.
 * (Not unstable in the sense that they are less functional or tested than other parts.)
 */
namespace Experimental {
  export let V2 = Experimental_.V2;

  export namespace V2 {
    export type MinaProgramEnv<State extends V2_.StateLayout> = V2_.MinaProgramEnv<State>;
    export type StateLayout = V2_.StateLayout;
    export type MinaProgramMethodReturn<
      State extends V2_.StateLayout = 'GenericState',
      Event = Field[],
      Action = Field[],
    > = V2_.MinaProgramMethodReturn<State, Event, Action>;
    export type StateDefinition<State extends V2_.StateLayout> = V2_.StateDefinition<State>;
    export type ZkappCommandAuthorizationEnvironment = V2_.ZkappCommandAuthorizationEnvironment;
    export type MinaProgram<
      State extends StateLayout,
      Event,
      Action,
      MethodPrivateInputs extends { [key: string]: V2_.ProvableTuple },
    > = V2_.MinaProgram<State, Event, Action, MethodPrivateInputs>;
    export type DynamicProvable<P> = V2_.DynamicProvable<P>;
  }

  export let memoizeWitness = Experimental_.memoizeWitness;

  export let Recursive = Recursive_;

  export let ProvableBigInt = ProvableBigInt_;
  export let createProvableBigInt = createProvableBigInt_;

  export let ZkFunction = ZkFunction_;
  export type KimchiProof = KimchiProof_;
  export type KimchiVerificationKey = KimchiVerificationKey_;
  export let KimchiProof = KimchiProof_;
  export let KimchiVerificationKey = KimchiVerificationKey_;

  export type KimchiJsonProof = KimchiJsonProof_;

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
    Action = InferProvable<ActionType>,
  > extends BatchReducer_.BatchReducer<ActionType, BatchSize, Action> {}

  /**
   * Provable type that represents a batch of actions.
   */
  export let ActionBatch = BatchReducer_.ActionBatch;
  export type ActionBatch<Action> = BatchReducer_.ActionBatch<Action>;
}

Error.stackTraceLimit = 100000;

// export parts of the low-level bindings interface for advanced users
export * as Core from './bindings/index.js';
