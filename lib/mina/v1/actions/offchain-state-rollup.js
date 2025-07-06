"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OffchainStateCommitments = exports.OffchainStateRollup = void 0;
const zkprogram_js_1 = require("../../../proof-system/zkprogram.js");
const wrapped_js_1 = require("../../../provable/wrapped.js");
const merkle_list_js_1 = require("../../../provable/merkle-list.js");
const transaction_leaves_js_1 = require("../../../../bindings/mina-transaction/v1/transaction-leaves.js");
const merkle_tree_indexed_js_1 = require("../../../provable/merkle-tree-indexed.js");
const struct_js_1 = require("../../../provable/types/struct.js");
const zkprogram_js_2 = require("../../../proof-system/zkprogram.js");
const provable_js_1 = require("../../../provable/provable.js");
const common_js_1 = require("../../../provable/gadgets/common.js");
const offchain_state_serialization_js_1 = require("./offchain-state-serialization.js");
const mina_js_1 = require("../mina.js");
class ActionIterator extends merkle_list_js_1.MerkleListIterator.create(offchain_state_serialization_js_1.ActionList, (hash, actions) => transaction_leaves_js_1.Actions.updateSequenceState(hash, actions.hash), 
// we don't have to care about the initial hash here because we will just step forward
transaction_leaves_js_1.Actions.emptyActionState()) {
}
/**
 * Commitments that keep track of the current state of an offchain Merkle tree constructed from actions.
 * Intended to be stored on-chain.
 *
 * Fields:
 * - `root`: The root of the current Merkle tree
 * - `length`: The number of elements in the current Merkle tree
 * - `actionState`: The hash pointing to the list of actions that have been applied to form the current Merkle tree
 */
class OffchainStateCommitments extends (0, struct_js_1.Struct)({
    // this should just be a MerkleTree type that carries the full tree as aux data
    root: wrapped_js_1.Field,
    length: wrapped_js_1.Field,
    // TODO: make zkprogram support auxiliary data in public inputs
    // actionState: ActionIterator,
    actionState: wrapped_js_1.Field,
}) {
    static emptyFromHeight(height) {
        let emptyMerkleTree = new ((0, merkle_tree_indexed_js_1.IndexedMerkleMap)(height))();
        return new OffchainStateCommitments({
            root: emptyMerkleTree.root,
            length: emptyMerkleTree.length,
            actionState: transaction_leaves_js_1.Actions.emptyActionState(),
        });
    }
}
exports.OffchainStateCommitments = OffchainStateCommitments;
// TODO: it would be nice to abstract the logic for proving a chain of state transition proofs
/**
 * Common logic for the proof that we can go from OffchainStateCommitments A -> B
 */
function merkleUpdateBatch({ maxActionsPerProof, maxActionsPerUpdate, }, stateA, actions, tree) {
    // this would be unnecessary if the iterator could just be the public input
    actions.currentHash.assertEquals(stateA.actionState);
    // linearize actions into a flat MerkleList, so we don't process an insane amount of dummy actions
    let linearActions = offchain_state_serialization_js_1.LinearizedActionList.empty();
    for (let i = 0; i < maxActionsPerProof; i++) {
        let inner = actions.next().startIterating();
        let isAtEnd = (0, wrapped_js_1.Bool)(false);
        for (let i = 0; i < maxActionsPerUpdate; i++) {
            let { element: action, isDummy } = inner.Unsafe.next();
            let isCheckPoint = inner.isAtEnd();
            [isAtEnd, isCheckPoint] = [isAtEnd.or(isCheckPoint), isCheckPoint.and(isAtEnd.not())];
            linearActions.pushIf(isDummy.not(), new offchain_state_serialization_js_1.LinearizedAction({ action, isCheckPoint }));
        }
        inner.assertAtEnd(`Expected at most ${maxActionsPerUpdate} actions per account update.`);
    }
    actions.assertAtEnd();
    // tree must match the public Merkle root and length; the method operates on the tree internally
    // TODO: this would be simpler if the tree was the public input directly
    stateA.root.assertEquals(tree.root);
    stateA.length.assertEquals(tree.length);
    let intermediateTree = tree.clone();
    let isValidUpdate = (0, wrapped_js_1.Bool)(true);
    linearActions.forEach(maxActionsPerProof, (element, isDummy) => {
        let { action, isCheckPoint } = element;
        let { key, value, usesPreviousValue, previousValue } = action;
        // set (key, value) in the intermediate tree - if the action is not a dummy
        let actualPreviousValue = intermediateTree.setIf(isDummy.not(), key, value);
        // if an expected previous value was provided, check whether it matches the actual previous value
        // otherwise, the entire update in invalidated
        let matchesPreviousValue = actualPreviousValue.orElse(0n).equals(previousValue);
        let isValidAction = usesPreviousValue.implies(matchesPreviousValue);
        isValidUpdate = isValidUpdate.and(isValidAction);
        // at checkpoints, update the tree, if the entire update was valid
        tree.overwriteIf(isCheckPoint.and(isValidUpdate), intermediateTree);
        // at checkpoints, reset intermediate values
        isValidUpdate = provable_js_1.Provable.if(isCheckPoint, (0, wrapped_js_1.Bool)(true), isValidUpdate);
        intermediateTree.overwriteIf(isCheckPoint, tree);
    });
    return {
        commitments: {
            root: tree.root,
            length: tree.length,
            actionState: actions.currentHash,
        },
        tree,
    };
}
/**
 * This program represents a proof that we can go from OffchainStateCommitments A -> B
 */
function OffchainStateRollup({ 
/**
 * the constraints used in one batch proof with a height-31 tree are:
 *
 * 1967*A + 87*A*U + 2
 *
 * where A = maxActionsPerProof and U = maxActionsPerUpdate.
 *
 * To determine defaults, we set U=4 which should cover most use cases while ensuring
 * that the main loop which is independent of U dominates.
 *
 * Targeting ~50k constraints, to leave room for recursive verification, yields A=22.
 */
maxActionsPerProof = 22, maxActionsPerUpdate = 4, logTotalCapacity = 30, } = {}) {
    class IndexedMerkleMapN extends (0, merkle_tree_indexed_js_1.IndexedMerkleMap)(logTotalCapacity + 1) {
    }
    let offchainStateRollup = (0, zkprogram_js_1.ZkProgram)({
        name: 'merkle-map-rollup',
        publicInput: OffchainStateCommitments,
        publicOutput: OffchainStateCommitments,
        methods: {
            /**
             * `firstBatch()` creates the initial proof A -> B
             */
            firstBatch: {
                // [actions, tree]
                privateInputs: [ActionIterator, IndexedMerkleMapN],
                auxiliaryOutput: IndexedMerkleMapN,
                async method(stateA, actions, tree) {
                    let result = merkleUpdateBatch({ maxActionsPerProof, maxActionsPerUpdate }, stateA, actions, tree);
                    return {
                        publicOutput: result.commitments,
                        auxiliaryOutput: result.tree,
                    };
                },
            },
            /**
             * `nextBatch()` takes an existing proof A -> B, adds its own logic to prove B -> B', so that the output is a proof A -> B'
             */
            nextBatch: {
                // [actions, tree, proof]
                privateInputs: [ActionIterator, IndexedMerkleMapN, zkprogram_js_2.SelfProof],
                auxiliaryOutput: IndexedMerkleMapN,
                async method(stateA, actions, tree, recursiveProof) {
                    recursiveProof.verify();
                    // in the recursive case, the recursive proof's initial state has to match this proof's initial state
                    provable_js_1.Provable.assertEqual(OffchainStateCommitments, recursiveProof.publicInput, stateA);
                    // the state we start with
                    let stateB = recursiveProof.publicOutput;
                    let result = merkleUpdateBatch({ maxActionsPerProof, maxActionsPerUpdate }, stateB, actions, tree);
                    return {
                        publicOutput: result.commitments,
                        auxiliaryOutput: result.tree,
                    };
                },
            },
        },
    });
    let RollupProof = offchainStateRollup.Proof;
    let isCompiled = false;
    return {
        Proof: RollupProof,
        program: offchainStateRollup,
        async compile(options) {
            if (isCompiled)
                return;
            let result = await offchainStateRollup.compile(options);
            isCompiled = true;
            return result;
        },
        async prove(tree, actions) {
            (0, common_js_1.assert)(tree.height === logTotalCapacity + 1, 'Tree height must match');
            if ((0, mina_js_1.getProofsEnabled)())
                await this.compile();
            // clone the tree so we don't modify the input
            tree = tree.clone();
            // input state
            let iterator = actions.startIterating();
            let inputState = new OffchainStateCommitments({
                root: tree.root,
                length: tree.length,
                actionState: iterator.currentHash,
            });
            // if proofs are disabled, create a dummy proof and final state, and return
            if (!(0, mina_js_1.getProofsEnabled)()) {
                // convert actions to nested array
                let actionsList = actions.data
                    .get()
                    .map(({ element: actionsList }) => actionsList.data
                    .get()
                    .map(({ element }) => element)
                    // TODO reverse needed because of bad internal merkle list representation
                    .reverse())
                    // TODO reverse needed because of bad internal merkle list representation
                    .reverse();
                // update the tree outside the circuit
                (0, offchain_state_serialization_js_1.updateMerkleMap)(actionsList, tree);
                let finalState = new OffchainStateCommitments({
                    root: tree.root,
                    length: tree.length,
                    actionState: iterator.hash,
                });
                let proof = await RollupProof.dummy(inputState, finalState, 2, 15);
                return { proof, tree, nProofs: 0 };
            }
            // base proof
            let slice = sliceActions(iterator, maxActionsPerProof);
            let { proof, auxiliaryOutput } = await offchainStateRollup.firstBatch(inputState, slice, tree);
            // overwrite the tree with its updated version
            tree = auxiliaryOutput;
            // recursive proofs
            let nProofs = 1;
            for (let i = 1;; i++) {
                if (iterator.isAtEnd().toBoolean())
                    break;
                nProofs++;
                let slice = sliceActions(iterator, maxActionsPerProof);
                // overwrite tree, proof
                ({ proof, auxiliaryOutput: tree } = await offchainStateRollup.nextBatch(inputState, slice, tree, proof));
            }
            return { proof, tree, nProofs };
        },
    };
}
exports.OffchainStateRollup = OffchainStateRollup;
// from a nested list of actions, create a slice (iterator) starting at `index` that has at most `batchSize` actions in it.
// also moves the original iterator forward to start after the slice
function sliceActions(actions, batchSize) {
    class ActionListsList extends merkle_list_js_1.MerkleList.create(offchain_state_serialization_js_1.ActionList, (hash, actions) => transaction_leaves_js_1.Actions.updateSequenceState(hash, actions.hash), actions.currentHash) {
    }
    let slice = ActionListsList.empty();
    let totalSize = 0;
    while (true) {
        // stop if we reach the end of the list
        if (actions.isAtEnd().toBoolean())
            break;
        let nextList = actions.data.get()[actions._index('next')].element;
        let nextSize = nextList.data.get().length;
        (0, common_js_1.assert)(nextSize <= batchSize, 'Actions in one update exceed maximum batch size');
        if (totalSize + nextSize > batchSize)
            break;
        let nextMerkleList = actions.next();
        slice.push(nextMerkleList);
        totalSize += nextSize;
    }
    return slice.startIterating();
}
