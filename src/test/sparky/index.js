"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Option = exports.MerkleListIterator = exports.MerkleList = exports.DynamicArray = exports.Types = exports.Gadgets = exports.Hashed = exports.Packed = exports.Bytes = exports.UInt8 = exports.Sign = exports.Int64 = exports.UInt64 = exports.UInt32 = exports.circuitMain = exports.public_ = exports.Keypair = exports.Circuit = exports.Provable = exports.Unconstrained = exports.Struct = exports.provablePure = exports.provable = exports.ProvableType = exports.provableFromClass = exports.assert = exports.Hash = exports.Keccak = exports.TokenSymbol = exports.Poseidon = exports.ScalarField = exports.EcdsaSignature = exports.createEcdsa = exports.toPoint = exports.ForeignCurve = exports.createForeignCurve = exports.createForeignField = exports.Scalar = exports.Group = exports.Bool = exports.Field = exports.isExtensionAvailable = exports.getAvailableExtensions = exports.getExtension = exports.getSparkyExtensions = exports.getCurrentBackend = exports.switchBackend = exports.initializeBindings = exports.Ledger = exports.TupleN = void 0;
exports.ZkProgram = exports.Nullifier = exports.MerkleMapWitness = exports.MerkleMap = exports.MerkleWitness = exports.MerkleTree = exports.CircuitString = exports.Character = exports.Encoding = exports.Encryption = exports.Lightnet = exports.sendZkapp = exports.setArchiveGraphqlEndpoint = exports.setGraphqlEndpoints = exports.setGraphqlEndpoint = exports.addCachedAccount = exports.fetchEvents = exports.checkZkappTransaction = exports.fetchTransactionStatus = exports.fetchLastBlock = exports.fetchAccount = exports.TokenContract = exports.TokenAccountUpdateIterator = exports.AccountUpdateTree = exports.AccountUpdateForest = exports.TransactionVersion = exports.ZkappPublicInput = exports.Permissions = exports.AccountUpdate = exports.TokenId = exports.Account = exports.Cache = exports.FeatureFlags = exports.DynamicProof = exports.Proof = exports.VerificationKey = exports.Void = exports.Undefined = exports.Empty = exports.verify = exports.SelfProof = exports.declareState = exports.State = exports.state = exports.Reducer = exports.declareMethods = exports.method = exports.SmartContract = exports.Transaction = exports.Mina = void 0;
exports.Core = exports.Experimental = exports.setNumberOfWorkers = exports.Crypto = void 0;
var types_js_1 = require("./lib/util/types.js");
Object.defineProperty(exports, "TupleN", { enumerable: true, get: function () { return types_js_1.TupleN; } });
var bindings_js_1 = require("./bindings.js");
Object.defineProperty(exports, "Ledger", { enumerable: true, get: function () { return bindings_js_1.Ledger; } });
Object.defineProperty(exports, "initializeBindings", { enumerable: true, get: function () { return bindings_js_1.initializeBindings; } });
Object.defineProperty(exports, "switchBackend", { enumerable: true, get: function () { return bindings_js_1.switchBackend; } });
Object.defineProperty(exports, "getCurrentBackend", { enumerable: true, get: function () { return bindings_js_1.getCurrentBackend; } });
// SPARKY EXTENSIONS - Available only when Sparky backend is active
var index_js_1 = require("./bindings/sparky-adapter/index.js");
Object.defineProperty(exports, "getSparkyExtensions", { enumerable: true, get: function () { return index_js_1.getSparkyExtensions; } });
Object.defineProperty(exports, "getExtension", { enumerable: true, get: function () { return index_js_1.getExtension; } });
Object.defineProperty(exports, "getAvailableExtensions", { enumerable: true, get: function () { return index_js_1.getAvailableExtensions; } });
Object.defineProperty(exports, "isExtensionAvailable", { enumerable: true, get: function () { return index_js_1.isExtensionAvailable; } });
var wrapped_js_1 = require("./lib/provable/wrapped.js");
Object.defineProperty(exports, "Field", { enumerable: true, get: function () { return wrapped_js_1.Field; } });
Object.defineProperty(exports, "Bool", { enumerable: true, get: function () { return wrapped_js_1.Bool; } });
Object.defineProperty(exports, "Group", { enumerable: true, get: function () { return wrapped_js_1.Group; } });
Object.defineProperty(exports, "Scalar", { enumerable: true, get: function () { return wrapped_js_1.Scalar; } });
var foreign_field_js_1 = require("./lib/provable/foreign-field.js");
Object.defineProperty(exports, "createForeignField", { enumerable: true, get: function () { return foreign_field_js_1.createForeignField; } });
var foreign_curve_js_1 = require("./lib/provable/crypto/foreign-curve.js");
Object.defineProperty(exports, "createForeignCurve", { enumerable: true, get: function () { return foreign_curve_js_1.createForeignCurve; } });
Object.defineProperty(exports, "ForeignCurve", { enumerable: true, get: function () { return foreign_curve_js_1.ForeignCurve; } });
Object.defineProperty(exports, "toPoint", { enumerable: true, get: function () { return foreign_curve_js_1.toPoint; } });
var foreign_ecdsa_js_1 = require("./lib/provable/crypto/foreign-ecdsa.js");
Object.defineProperty(exports, "createEcdsa", { enumerable: true, get: function () { return foreign_ecdsa_js_1.createEcdsa; } });
Object.defineProperty(exports, "EcdsaSignature", { enumerable: true, get: function () { return foreign_ecdsa_js_1.EcdsaSignature; } });
var scalar_field_js_1 = require("./lib/provable/scalar-field.js");
Object.defineProperty(exports, "ScalarField", { enumerable: true, get: function () { return scalar_field_js_1.ScalarField; } });
var poseidon_js_1 = require("./lib/provable/crypto/poseidon.js");
Object.defineProperty(exports, "Poseidon", { enumerable: true, get: function () { return poseidon_js_1.Poseidon; } });
Object.defineProperty(exports, "TokenSymbol", { enumerable: true, get: function () { return poseidon_js_1.TokenSymbol; } });
var keccak_js_1 = require("./lib/provable/crypto/keccak.js");
Object.defineProperty(exports, "Keccak", { enumerable: true, get: function () { return keccak_js_1.Keccak; } });
var hash_js_1 = require("./lib/provable/crypto/hash.js");
Object.defineProperty(exports, "Hash", { enumerable: true, get: function () { return hash_js_1.Hash; } });
var common_js_1 = require("./lib/provable/gadgets/common.js");
Object.defineProperty(exports, "assert", { enumerable: true, get: function () { return common_js_1.assert; } });
__exportStar(require("./lib/provable/crypto/signature.js"), exports);
var provable_derivers_js_1 = require("./lib/provable/types/provable-derivers.js");
Object.defineProperty(exports, "provableFromClass", { enumerable: true, get: function () { return provable_derivers_js_1.provableFromClass; } });
var provable_intf_js_1 = require("./lib/provable/types/provable-intf.js");
Object.defineProperty(exports, "ProvableType", { enumerable: true, get: function () { return provable_intf_js_1.ProvableType; } });
var provable_derivers_js_2 = require("./lib/provable/types/provable-derivers.js");
Object.defineProperty(exports, "provable", { enumerable: true, get: function () { return provable_derivers_js_2.provable; } });
Object.defineProperty(exports, "provablePure", { enumerable: true, get: function () { return provable_derivers_js_2.provablePure; } });
var struct_js_1 = require("./lib/provable/types/struct.js");
Object.defineProperty(exports, "Struct", { enumerable: true, get: function () { return struct_js_1.Struct; } });
var unconstrained_js_1 = require("./lib/provable/types/unconstrained.js");
Object.defineProperty(exports, "Unconstrained", { enumerable: true, get: function () { return unconstrained_js_1.Unconstrained; } });
var provable_js_1 = require("./lib/provable/provable.js");
Object.defineProperty(exports, "Provable", { enumerable: true, get: function () { return provable_js_1.Provable; } });
var circuit_js_1 = require("./lib/proof-system/circuit.js");
Object.defineProperty(exports, "Circuit", { enumerable: true, get: function () { return circuit_js_1.Circuit; } });
Object.defineProperty(exports, "Keypair", { enumerable: true, get: function () { return circuit_js_1.Keypair; } });
Object.defineProperty(exports, "public_", { enumerable: true, get: function () { return circuit_js_1.public_; } });
Object.defineProperty(exports, "circuitMain", { enumerable: true, get: function () { return circuit_js_1.circuitMain; } });
var int_js_1 = require("./lib/provable/int.js");
Object.defineProperty(exports, "UInt32", { enumerable: true, get: function () { return int_js_1.UInt32; } });
Object.defineProperty(exports, "UInt64", { enumerable: true, get: function () { return int_js_1.UInt64; } });
Object.defineProperty(exports, "Int64", { enumerable: true, get: function () { return int_js_1.Int64; } });
Object.defineProperty(exports, "Sign", { enumerable: true, get: function () { return int_js_1.Sign; } });
Object.defineProperty(exports, "UInt8", { enumerable: true, get: function () { return int_js_1.UInt8; } });
var wrapped_classes_js_1 = require("./lib/provable/wrapped-classes.js");
Object.defineProperty(exports, "Bytes", { enumerable: true, get: function () { return wrapped_classes_js_1.Bytes; } });
var packed_js_1 = require("./lib/provable/packed.js");
Object.defineProperty(exports, "Packed", { enumerable: true, get: function () { return packed_js_1.Packed; } });
Object.defineProperty(exports, "Hashed", { enumerable: true, get: function () { return packed_js_1.Hashed; } });
var gadgets_js_1 = require("./lib/provable/gadgets/gadgets.js");
Object.defineProperty(exports, "Gadgets", { enumerable: true, get: function () { return gadgets_js_1.Gadgets; } });
var types_js_2 = require("./bindings/mina-transaction/v1/types.js");
Object.defineProperty(exports, "Types", { enumerable: true, get: function () { return types_js_2.Types; } });
var dynamic_array_js_1 = require("./lib/provable/dynamic-array.js");
Object.defineProperty(exports, "DynamicArray", { enumerable: true, get: function () { return dynamic_array_js_1.DynamicArray; } });
var merkle_list_js_1 = require("./lib/provable/merkle-list.js");
Object.defineProperty(exports, "MerkleList", { enumerable: true, get: function () { return merkle_list_js_1.MerkleList; } });
Object.defineProperty(exports, "MerkleListIterator", { enumerable: true, get: function () { return merkle_list_js_1.MerkleListIterator; } });
const merkle_tree_indexed_js_1 = require("./lib/provable/merkle-tree-indexed.js");
var option_js_1 = require("./lib/provable/option.js");
Object.defineProperty(exports, "Option", { enumerable: true, get: function () { return option_js_1.Option; } });
exports.Mina = require("./lib/mina/v1/mina.js");
var transaction_js_1 = require("./lib/mina/v1/transaction.js");
Object.defineProperty(exports, "Transaction", { enumerable: true, get: function () { return transaction_js_1.Transaction; } });
var zkapp_js_1 = require("./lib/mina/v1/zkapp.js");
Object.defineProperty(exports, "SmartContract", { enumerable: true, get: function () { return zkapp_js_1.SmartContract; } });
Object.defineProperty(exports, "method", { enumerable: true, get: function () { return zkapp_js_1.method; } });
Object.defineProperty(exports, "declareMethods", { enumerable: true, get: function () { return zkapp_js_1.declareMethods; } });
var reducer_js_1 = require("./lib/mina/v1/actions/reducer.js");
Object.defineProperty(exports, "Reducer", { enumerable: true, get: function () { return reducer_js_1.Reducer; } });
var state_js_1 = require("./lib/mina/v1/state.js");
Object.defineProperty(exports, "state", { enumerable: true, get: function () { return state_js_1.state; } });
Object.defineProperty(exports, "State", { enumerable: true, get: function () { return state_js_1.State; } });
Object.defineProperty(exports, "declareState", { enumerable: true, get: function () { return state_js_1.declareState; } });
var zkprogram_js_1 = require("./lib/proof-system/zkprogram.js");
Object.defineProperty(exports, "SelfProof", { enumerable: true, get: function () { return zkprogram_js_1.SelfProof; } });
Object.defineProperty(exports, "verify", { enumerable: true, get: function () { return zkprogram_js_1.verify; } });
Object.defineProperty(exports, "Empty", { enumerable: true, get: function () { return zkprogram_js_1.Empty; } });
Object.defineProperty(exports, "Undefined", { enumerable: true, get: function () { return zkprogram_js_1.Undefined; } });
Object.defineProperty(exports, "Void", { enumerable: true, get: function () { return zkprogram_js_1.Void; } });
var verification_key_js_1 = require("./lib/proof-system/verification-key.js");
Object.defineProperty(exports, "VerificationKey", { enumerable: true, get: function () { return verification_key_js_1.VerificationKey; } });
var proof_js_1 = require("./lib/proof-system/proof.js");
Object.defineProperty(exports, "Proof", { enumerable: true, get: function () { return proof_js_1.Proof; } });
Object.defineProperty(exports, "DynamicProof", { enumerable: true, get: function () { return proof_js_1.DynamicProof; } });
var feature_flags_js_1 = require("./lib/proof-system/feature-flags.js");
Object.defineProperty(exports, "FeatureFlags", { enumerable: true, get: function () { return feature_flags_js_1.FeatureFlags; } });
var cache_js_1 = require("./lib/proof-system/cache.js");
Object.defineProperty(exports, "Cache", { enumerable: true, get: function () { return cache_js_1.Cache; } });
var account_js_1 = require("./lib/mina/v1/account.js");
Object.defineProperty(exports, "Account", { enumerable: true, get: function () { return account_js_1.Account; } });
var account_update_js_1 = require("./lib/mina/v1/account-update.js");
Object.defineProperty(exports, "TokenId", { enumerable: true, get: function () { return account_update_js_1.TokenId; } });
Object.defineProperty(exports, "AccountUpdate", { enumerable: true, get: function () { return account_update_js_1.AccountUpdate; } });
Object.defineProperty(exports, "Permissions", { enumerable: true, get: function () { return account_update_js_1.Permissions; } });
Object.defineProperty(exports, "ZkappPublicInput", { enumerable: true, get: function () { return account_update_js_1.ZkappPublicInput; } });
Object.defineProperty(exports, "TransactionVersion", { enumerable: true, get: function () { return account_update_js_1.TransactionVersion; } });
Object.defineProperty(exports, "AccountUpdateForest", { enumerable: true, get: function () { return account_update_js_1.AccountUpdateForest; } });
Object.defineProperty(exports, "AccountUpdateTree", { enumerable: true, get: function () { return account_update_js_1.AccountUpdateTree; } });
var forest_iterator_js_1 = require("./lib/mina/v1/token/forest-iterator.js");
Object.defineProperty(exports, "TokenAccountUpdateIterator", { enumerable: true, get: function () { return forest_iterator_js_1.TokenAccountUpdateIterator; } });
var token_contract_js_1 = require("./lib/mina/v1/token/token-contract.js");
Object.defineProperty(exports, "TokenContract", { enumerable: true, get: function () { return token_contract_js_1.TokenContract; } });
var fetch_js_1 = require("./lib/mina/v1/fetch.js");
Object.defineProperty(exports, "fetchAccount", { enumerable: true, get: function () { return fetch_js_1.fetchAccount; } });
Object.defineProperty(exports, "fetchLastBlock", { enumerable: true, get: function () { return fetch_js_1.fetchLastBlock; } });
Object.defineProperty(exports, "fetchTransactionStatus", { enumerable: true, get: function () { return fetch_js_1.fetchTransactionStatus; } });
Object.defineProperty(exports, "checkZkappTransaction", { enumerable: true, get: function () { return fetch_js_1.checkZkappTransaction; } });
Object.defineProperty(exports, "fetchEvents", { enumerable: true, get: function () { return fetch_js_1.fetchEvents; } });
Object.defineProperty(exports, "addCachedAccount", { enumerable: true, get: function () { return fetch_js_1.addCachedAccount; } });
Object.defineProperty(exports, "setGraphqlEndpoint", { enumerable: true, get: function () { return fetch_js_1.setGraphqlEndpoint; } });
Object.defineProperty(exports, "setGraphqlEndpoints", { enumerable: true, get: function () { return fetch_js_1.setGraphqlEndpoints; } });
Object.defineProperty(exports, "setArchiveGraphqlEndpoint", { enumerable: true, get: function () { return fetch_js_1.setArchiveGraphqlEndpoint; } });
Object.defineProperty(exports, "sendZkapp", { enumerable: true, get: function () { return fetch_js_1.sendZkapp; } });
Object.defineProperty(exports, "Lightnet", { enumerable: true, get: function () { return fetch_js_1.Lightnet; } });
exports.Encryption = require("./lib/provable/crypto/encryption.js");
exports.Encoding = require("./bindings/lib/encoding.js");
var string_js_1 = require("./lib/provable/string.js");
Object.defineProperty(exports, "Character", { enumerable: true, get: function () { return string_js_1.Character; } });
Object.defineProperty(exports, "CircuitString", { enumerable: true, get: function () { return string_js_1.CircuitString; } });
var merkle_tree_js_1 = require("./lib/provable/merkle-tree.js");
Object.defineProperty(exports, "MerkleTree", { enumerable: true, get: function () { return merkle_tree_js_1.MerkleTree; } });
Object.defineProperty(exports, "MerkleWitness", { enumerable: true, get: function () { return merkle_tree_js_1.MerkleWitness; } });
var merkle_map_js_1 = require("./lib/provable/merkle-map.js");
Object.defineProperty(exports, "MerkleMap", { enumerable: true, get: function () { return merkle_map_js_1.MerkleMap; } });
Object.defineProperty(exports, "MerkleMapWitness", { enumerable: true, get: function () { return merkle_map_js_1.MerkleMapWitness; } });
var nullifier_js_1 = require("./lib/provable/crypto/nullifier.js");
Object.defineProperty(exports, "Nullifier", { enumerable: true, get: function () { return nullifier_js_1.Nullifier; } });
var zkprogram_js_2 = require("./lib/proof-system/zkprogram.js");
Object.defineProperty(exports, "ZkProgram", { enumerable: true, get: function () { return zkprogram_js_2.ZkProgram; } });
var crypto_js_1 = require("./lib/provable/crypto/crypto.js");
Object.defineProperty(exports, "Crypto", { enumerable: true, get: function () { return crypto_js_1.Crypto; } });
var workers_js_1 = require("./lib/proof-system/workers.js");
Object.defineProperty(exports, "setNumberOfWorkers", { enumerable: true, get: function () { return workers_js_1.setNumberOfWorkers; } });
// experimental APIs
const provable_js_2 = require("./lib/provable/provable.js");
const OffchainState_ = require("./lib/mina/v1/actions/offchain-state.js");
const BatchReducer_ = require("./lib/mina/v1/actions/batch-reducer.js");
const recursive_js_1 = require("./lib/proof-system/recursive.js");
const bigint_js_1 = require("./lib/provable/bigint.js");
const V2_ = require("./lib/mina/v2/index.js");
const Experimental_ = {
    memoizeWitness: provable_js_2.memoizeWitness,
    IndexedMerkleMap: merkle_tree_indexed_js_1.IndexedMerkleMap,
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
    Experimental.Recursive = recursive_js_1.Recursive;
    Experimental.ProvableBigInt = bigint_js_1.ProvableBigInt;
    Experimental.createProvableBigInt = bigint_js_1.createProvableBigInt;
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
})(Experimental || (exports.Experimental = Experimental = {}));
Error.stackTraceLimit = 100000;
// export parts of the low-level bindings interface for advanced users
exports.Core = require("./bindings/index.js");
