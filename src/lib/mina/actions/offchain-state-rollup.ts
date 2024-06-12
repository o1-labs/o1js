import { Proof, ZkProgram } from '../../proof-system/zkprogram.js';
import { Bool, Field } from '../../provable/wrapped.js';
import { MerkleList, MerkleListIterator } from '../../provable/merkle-list.js';
import { Actions } from '../../../bindings/mina-transaction/transaction-leaves.js';
import {
  IndexedMerkleMap,
  IndexedMerkleMapBase,
} from '../../provable/merkle-tree-indexed.js';
import { Struct } from '../../provable/types/struct.js';
import { SelfProof } from '../../proof-system/zkprogram.js';
import { Provable } from '../../provable/provable.js';
import { assert } from '../../provable/gadgets/common.js';
import {
  ActionList,
  LinearizedAction,
  LinearizedActionList,
  MerkleLeaf,
  updateMerkleMap,
} from './offchain-state-serialization.js';
import { getProofsEnabled } from '../mina.js';

export { OffchainStateRollup, OffchainStateCommitments };

class ActionIterator extends MerkleListIterator.create(
  ActionList.provable,
  (hash: Field, actions: ActionList) =>
    Actions.updateSequenceState(hash, actions.hash),
  // we don't have to care about the initial hash here because we will just step forward
  Actions.emptyActionState()
) {}

/**
 * Commitments that keep track of the current state of an offchain Merkle tree constructed from actions.
 * Intended to be stored on-chain.
 *
 * Fields:
 * - `root`: The root of the current Merkle tree
 * - `actionState`: The hash pointing to the list of actions that have been applied to form the current Merkle tree
 */
class OffchainStateCommitments extends Struct({
  // this should just be a MerkleTree type that carries the full tree as aux data
  root: Field,
  // TODO: make zkprogram support auxiliary data in public inputs
  // actionState: ActionIterator.provable,
  actionState: Field,
}) {
  static emptyFromHeight(height: number) {
    let emptyMerkleRoot = new (IndexedMerkleMap(height))().root;
    return new OffchainStateCommitments({
      root: emptyMerkleRoot,
      actionState: Actions.emptyActionState(),
    });
  }
}

// TODO: it would be nice to abstract the logic for proving a chain of state transition proofs

/**
 * Common logic for the proof that we can go from OffchainStateCommitments A -> B
 */
function merkleUpdateBatch(
  {
    maxActionsPerProof,
    maxActionsPerUpdate,
  }: {
    maxActionsPerProof: number;
    maxActionsPerUpdate: number;
  },
  stateA: OffchainStateCommitments,
  actions: ActionIterator,
  tree: IndexedMerkleMapBase
): OffchainStateCommitments {
  // this would be unnecessary if the iterator could just be the public input
  actions.currentHash.assertEquals(stateA.actionState);

  // linearize actions into a flat MerkleList, so we don't process an insane amount of dummy actions
  let linearActions = LinearizedActionList.empty();

  for (let i = 0; i < maxActionsPerProof; i++) {
    let inner = actions.next().startIterating();
    let isAtEnd = Bool(false);
    for (let i = 0; i < maxActionsPerUpdate; i++) {
      let { element: action, isDummy } = inner.Unsafe.next();
      let isCheckPoint = inner.isAtEnd();
      [isAtEnd, isCheckPoint] = [
        isAtEnd.or(isCheckPoint),
        isCheckPoint.and(isAtEnd.not()),
      ];
      linearActions.pushIf(
        isDummy.not(),
        new LinearizedAction({ action, isCheckPoint })
      );
    }
    inner.assertAtEnd(
      `Expected at most ${maxActionsPerUpdate} actions per account update.`
    );
  }
  actions.assertAtEnd();

  // tree must match the public Merkle root; the method operates on the tree internally
  // TODO: this would be simpler if the tree was the public input directly
  stateA.root.assertEquals(tree.root);

  let intermediateTree = tree.clone();
  let isValidUpdate = Bool(true);

  linearActions.forEach(maxActionsPerProof, (element, isDummy) => {
    let { action, isCheckPoint } = element;
    let { key, value, usesPreviousValue, previousValue } = action;

    // make sure that if this is a dummy action, we use the canonical dummy (key, value) pair
    key = Provable.if(isDummy, Field(0n), key);
    value = Provable.if(isDummy, Field(0n), value);

    // set (key, value) in the intermediate tree
    // note: this just works if (key, value) is a (0,0) dummy, because the value at the 0 key will always be 0
    let actualPreviousValue = intermediateTree.set(key, value);

    // if an expected previous value was provided, check whether it matches the actual previous value
    // otherwise, the entire update in invalidated
    let matchesPreviousValue = actualPreviousValue
      .orElse(0n)
      .equals(previousValue);
    let isValidAction = usesPreviousValue.implies(matchesPreviousValue);
    isValidUpdate = isValidUpdate.and(isValidAction);

    // at checkpoints, update the tree, if the entire update was valid
    tree.overwriteIf(isCheckPoint.and(isValidUpdate), intermediateTree);

    // at checkpoints, reset intermediate values
    isValidUpdate = Provable.if(isCheckPoint, Bool(true), isValidUpdate);
    intermediateTree.overwriteIf(isCheckPoint, tree);
  });

  return { root: tree.root, actionState: actions.currentHash };
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
  maxActionsPerProof = 22,
  maxActionsPerUpdate = 4,
  logTotalCapacity = 30,
} = {}) {
  class IndexedMerkleMapN extends IndexedMerkleMap(logTotalCapacity + 1) {}

  let offchainStateRollup = ZkProgram({
    name: 'merkle-map-rollup',
    publicInput: OffchainStateCommitments,
    publicOutput: OffchainStateCommitments,
    methods: {
      /**
       * `firstBatch()` creates the initial proof A -> B
       */
      firstBatch: {
        // [actions, tree]
        privateInputs: [ActionIterator.provable, IndexedMerkleMapN.provable],

        async method(
          stateA: OffchainStateCommitments,
          actions: ActionIterator,
          tree: IndexedMerkleMapN
        ): Promise<OffchainStateCommitments> {
          return merkleUpdateBatch(
            { maxActionsPerProof, maxActionsPerUpdate },
            stateA,
            actions,
            tree
          );
        },
      },
      /**
       * `nextBatch()` takes an existing proof A -> B, adds its own logic to prove B -> B', so that the output is a proof A -> B'
       */
      nextBatch: {
        // [actions, tree, proof]
        privateInputs: [
          ActionIterator.provable,
          IndexedMerkleMapN.provable,
          SelfProof,
        ],

        async method(
          stateA: OffchainStateCommitments,
          actions: ActionIterator,
          tree: IndexedMerkleMapN,
          recursiveProof: Proof<
            OffchainStateCommitments,
            OffchainStateCommitments
          >
        ): Promise<OffchainStateCommitments> {
          recursiveProof.verify();

          // in the recursive case, the recursive proof's initial state has to match this proof's initial state
          Provable.assertEqual(
            OffchainStateCommitments,
            recursiveProof.publicInput,
            stateA
          );

          // the state we start with
          let stateB = recursiveProof.publicOutput;

          return merkleUpdateBatch(
            { maxActionsPerProof, maxActionsPerUpdate },
            stateB,
            actions,
            tree
          );
        },
      },
    },
  });

  let RollupProof = ZkProgram.Proof(offchainStateRollup);

  let isCompiled = false;

  return {
    Proof: RollupProof,
    program: offchainStateRollup,

    async compile() {
      if (isCompiled) return;
      let result = await offchainStateRollup.compile();
      isCompiled = true;
      return result;
    },

    async prove(
      tree: IndexedMerkleMapN,
      actions: MerkleList<MerkleList<MerkleLeaf>>
    ) {
      assert(tree.height === logTotalCapacity + 1, 'Tree height must match');
      if (getProofsEnabled()) await this.compile();
      // clone the tree so we don't modify the input
      tree = tree.clone();

      // input state
      let iterator = actions.startIterating();
      let inputState = new OffchainStateCommitments({
        root: tree.root,
        actionState: iterator.currentHash,
      });

      // if proofs are disabled, create a dummy proof and final state, and return
      if (!getProofsEnabled()) {
        // convert actions to nested array
        let actionsList = actions.data
          .get()
          .map(({ element: actionsList }) =>
            actionsList.data
              .get()
              .map(({ element }) => element)
              // TODO reverse needed because of bad internal merkle list representation
              .reverse()
          )
          // TODO reverse needed because of bad internal merkle list representation
          .reverse();

        // update the tree outside the circuit
        updateMerkleMap(actionsList, tree);

        let finalState = new OffchainStateCommitments({
          root: tree.root,
          actionState: iterator.hash,
        });
        let proof = await RollupProof.dummy(inputState, finalState, 2, 15);
        return { proof, tree, nProofs: 0 };
      }

      // base proof
      let slice = sliceActions(iterator, maxActionsPerProof);
      let proof = await offchainStateRollup.firstBatch(inputState, slice, tree);

      // update tree root/length again, they aren't mutated :(
      // TODO: this shows why the full tree should be the public output
      tree.root = proof.publicOutput.root;
      tree.length = Field(tree.data.get().sortedLeaves.length);

      // recursive proofs
      let nProofs = 1;
      for (let i = 1; ; i++) {
        if (iterator.isAtEnd().toBoolean()) break;
        nProofs++;

        let slice = sliceActions(iterator, maxActionsPerProof);
        proof = await offchainStateRollup.nextBatch(
          inputState,
          slice,
          tree,
          proof
        );

        // update tree root/length again, they aren't mutated :(
        tree.root = proof.publicOutput.root;
        tree.length = Field(tree.data.get().sortedLeaves.length);
      }

      return { proof, tree, nProofs };
    },
  };
}

// from a nested list of actions, create a slice (iterator) starting at `index` that has at most `batchSize` actions in it.
// also moves the original iterator forward to start after the slice
function sliceActions(actions: ActionIterator, batchSize: number) {
  class ActionListsList extends MerkleList.create(
    ActionList.provable,
    (hash: Field, actions: ActionList) =>
      Actions.updateSequenceState(hash, actions.hash),
    actions.currentHash
  ) {}

  let slice = ActionListsList.empty();
  let totalSize = 0;

  while (true) {
    // stop if we reach the end of the list
    if (actions.isAtEnd().toBoolean()) break;

    let nextList = actions.data.get()[actions._index('next')].element;
    let nextSize = nextList.data.get().length;
    assert(
      nextSize <= batchSize,
      'Actions in one update exceed maximum batch size'
    );
    if (totalSize + nextSize > batchSize) break;

    let nextMerkleList = actions.next();
    slice.push(nextMerkleList);
    totalSize += nextSize;
  }

  return slice.startIterating();
}
