export { TupleN } from './lib/util/types.js';
export { Ledger, initializeBindings, switchBackend, getCurrentBackend } from './bindings.js';
export { Field, Bool, Group, Scalar } from './lib/provable/wrapped.js';
export { createForeignField } from './lib/provable/foreign-field.js';
export { createForeignCurve, ForeignCurve, toPoint } from './lib/provable/crypto/foreign-curve.js';
export { createEcdsa, EcdsaSignature } from './lib/provable/crypto/foreign-ecdsa.js';
export { ScalarField } from './lib/provable/scalar-field.js';
export { Poseidon, TokenSymbol } from './lib/provable/crypto/poseidon.js';
export { Keccak } from './lib/provable/crypto/keccak.js';
export { Hash } from './lib/provable/crypto/hash.js';
export { assert } from './lib/provable/gadgets/common.js';
export * from './lib/provable/crypto/signature.js';
export { provableFromClass } from './lib/provable/types/provable-derivers.js';
export { ProvableType } from './lib/provable/types/provable-intf.js';
export { provable, provablePure } from './lib/provable/types/provable-derivers.js';
export { Struct } from './lib/provable/types/struct.js';
export { Unconstrained } from './lib/provable/types/unconstrained.js';
export { Provable } from './lib/provable/provable.js';
export { Circuit, Keypair, public_, circuitMain } from './lib/proof-system/circuit.js';
export { UInt32, UInt64, Int64, Sign, UInt8 } from './lib/provable/int.js';
export { Bytes } from './lib/provable/wrapped-classes.js';
export { Packed, Hashed } from './lib/provable/packed.js';
export { Gadgets } from './lib/provable/gadgets/gadgets.js';
export { Types } from './bindings/mina-transaction/v1/types.js';
export { DynamicArray } from './lib/provable/dynamic-array.js';
export { MerkleList, MerkleListIterator } from './lib/provable/merkle-list.js';
import { IndexedMerkleMap } from './lib/provable/merkle-tree-indexed.js';
export { Option } from './lib/provable/option.js';
export * as Mina from './lib/mina/v1/mina.js';
export { Transaction, } from './lib/mina/v1/transaction.js';
export { SmartContract, method, declareMethods } from './lib/mina/v1/zkapp.js';
export { Reducer } from './lib/mina/v1/actions/reducer.js';
export { state, State, declareState } from './lib/mina/v1/state.js';
export { SelfProof, verify, Empty, Undefined, Void } from './lib/proof-system/zkprogram.js';
export { VerificationKey } from './lib/proof-system/verification-key.js';
export { Proof, DynamicProof } from './lib/proof-system/proof.js';
export { FeatureFlags } from './lib/proof-system/feature-flags.js';
export { Cache } from './lib/proof-system/cache.js';
export { Account } from './lib/mina/v1/account.js';
export { TokenId, AccountUpdate, Permissions, ZkappPublicInput, TransactionVersion, AccountUpdateForest, AccountUpdateTree, } from './lib/mina/v1/account-update.js';
export { TokenAccountUpdateIterator } from './lib/mina/v1/token/forest-iterator.js';
export { TokenContract } from './lib/mina/v1/token/token-contract.js';
export { fetchAccount, fetchLastBlock, fetchTransactionStatus, checkZkappTransaction, fetchEvents, addCachedAccount, setGraphqlEndpoint, setGraphqlEndpoints, setArchiveGraphqlEndpoint, sendZkapp, Lightnet, } from './lib/mina/v1/fetch.js';
export * as Encryption from './lib/provable/crypto/encryption.js';
export * as Encoding from './bindings/lib/encoding.js';
export { Character, CircuitString } from './lib/provable/string.js';
export { MerkleTree, MerkleWitness } from './lib/provable/merkle-tree.js';
export { MerkleMap, MerkleMapWitness } from './lib/provable/merkle-map.js';
export { Nullifier } from './lib/provable/crypto/nullifier.js';
export { ZkProgram } from './lib/proof-system/zkprogram.js';
export { Crypto } from './lib/provable/crypto/crypto.js';
export { setNumberOfWorkers } from './lib/proof-system/workers.js';
// experimental APIs
import { memoizeWitness } from './lib/provable/provable.js';
import * as OffchainState_ from './lib/mina/v1/actions/offchain-state.js';
import * as BatchReducer_ from './lib/mina/v1/actions/batch-reducer.js';
import { Recursive as Recursive_ } from './lib/proof-system/recursive.js';
import { ProvableBigInt as ProvableBigInt_, createProvableBigInt as createProvableBigInt_, } from './lib/provable/bigint.js';
export { Experimental };
import * as V2_ from './lib/mina/v2/index.js';
const Experimental_ = {
    memoizeWitness,
    IndexedMerkleMap,
    V2: V2_,
};
/**
 * This module exposes APIs that are unstable, in the sense that the API surface is expected to change.
 * (Not unstable in the sense that they are less functional or tested than other parts.)
 */
var Experimental;
(function (Experimental) {
    Experimental.V2 = Experimental_.V2;
    Experimental.memoizeWitness = Experimental_.memoizeWitness;
    Experimental.Recursive = Recursive_;
    Experimental.ProvableBigInt = ProvableBigInt_;
    Experimental.createProvableBigInt = createProvableBigInt_;
    // indexed merkle map
    Experimental.IndexedMerkleMap = Experimental_.IndexedMerkleMap;
    // offchain state
    Experimental.OffchainState = OffchainState_.OffchainState;
    /**
     * Commitments that keep track of the current state of an offchain Merkle tree constructed from actions.
     * Intended to be stored on-chain.
     *
     * Fields:
     * - `root`: The root of the current Merkle tree
     * - `actionState`: The hash pointing to the list of actions that have been applied to form the current Merkle tree
     */
    class OffchainStateCommitments extends OffchainState_.OffchainStateCommitments {
    }
    Experimental.OffchainStateCommitments = OffchainStateCommitments;
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
    class BatchReducer extends BatchReducer_.BatchReducer {
    }
    Experimental.BatchReducer = BatchReducer;
    /**
     * Provable type that represents a batch of actions.
     */
    Experimental.ActionBatch = BatchReducer_.ActionBatch;
})(Experimental || (Experimental = {}));
Error.stackTraceLimit = 100000;
// export parts of the low-level bindings interface for advanced users
export * as Core from './bindings/index.js';
