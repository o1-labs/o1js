import { Proof, ZkProgram } from '../../proof-system/zkprogram.js';
import { Bool, Field } from '../../provable/wrapped.js';
import { Unconstrained } from '../../provable/types/unconstrained.js';
import { MerkleList, MerkleListIterator } from '../../provable/merkle-list.js';
import { Actions } from '../../../bindings/mina-transaction/transaction-leaves.js';
import { MerkleTree, MerkleWitness } from '../../provable/merkle-tree.js';
import { Struct } from '../../provable/types/struct.js';
import { SelfProof } from '../../proof-system/zkprogram.js';
import { Provable } from '../../provable/provable.js';
import { assert } from '../../provable/gadgets/common.js';
import {
  ActionList,
  LinearizedAction,
  LinearizedActionList,
  MerkleLeaf,
} from './offchain-state-serialization.js';
import { MerkleMap } from '../../provable/merkle-map.js';
import { getProofsEnabled } from '../mina.js';

export { OffchainStateRollup, OffchainStateCommitments };

class ActionIterator extends MerkleListIterator.create(
  ActionList.provable,
  (hash: Field, actions: ActionList) =>
    Actions.updateSequenceState(hash, actions.hash),
  // we don't have to care about the initial hash here because we will just step forward
  Actions.emptyActionState()
) {}

class OffchainStateCommitments extends Struct({
  // this should just be a MerkleTree type that carries the full tree as aux data
  root: Field,
  // TODO: make zkprogram support auxiliary data in public inputs
  // actionState: ActionIterator.provable,
  actionState: Field,
}) {
  static empty() {
    let emptyMerkleRoot = new MerkleMap().getRoot();
    return new OffchainStateCommitments({
      root: emptyMerkleRoot,
      actionState: Actions.emptyActionState(),
    });
  }
}

const TREE_HEIGHT = 256;
class MerkleMapWitness extends MerkleWitness(TREE_HEIGHT) {}

// TODO: it would be nice to abstract the logic for proving a chain of state transition proofs

/**
 * Common logic for the proof that we can go from OffchainStateCommitments A -> B
 */
function merkleUpdateBatch(
  {
    maxActionsPerBatch,
    maxActionsPerUpdate,
  }: {
    maxActionsPerBatch: number;
    maxActionsPerUpdate: number;
  },
  stateA: OffchainStateCommitments,
  actions: ActionIterator,
  tree: Unconstrained<MerkleTree>
): OffchainStateCommitments {
  // this would be unnecessary if the iterator could just be the public input
  actions.currentHash.assertEquals(stateA.actionState);

  // linearize actions into a flat MerkleList, so we don't process an insane amount of dummy actions
  let linearActions = LinearizedActionList.empty();

  for (let i = 0; i < maxActionsPerBatch; i++) {
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

  // update merkle root at once for the actions of each account update
  let root = stateA.root;
  let intermediateRoot = root;

  type TreeUpdate = { key: Field; value: Field };
  let intermediateUpdates: TreeUpdate[] = [];
  let intermediateTree = Unconstrained.witness(() => tree.get().clone());

  let isValidUpdate = Bool(true);

  linearActions.forEach(maxActionsPerBatch, (element, isDummy) => {
    let { action, isCheckPoint } = element;
    let { key, value, usesPreviousValue, previousValue } = action;
    // Provable.log({ key, value, isCheckPoint, isDummy });

    // merkle witness
    let witness = Provable.witness(
      MerkleMapWitness,
      () =>
        new MerkleMapWitness(intermediateTree.get().getWitness(key.toBigInt()))
    );

    // previous value at the key
    let actualPreviousValue = Provable.witness(Field, () =>
      tree.get().getLeaf(key.toBigInt())
    );

    // prove that the witness and `actualPreviousValue` is correct, by comparing the implied root and key
    // note: this just works if the (key, value) is a (0,0) dummy, because the value at the 0 key will always be 0
    witness.calculateIndex().assertEquals(key);
    witness.calculateRoot(actualPreviousValue).assertEquals(intermediateRoot);

    // if an expected previous value was provided, check whether it matches the actual previous value
    // otherwise, the entire update in invalidated
    let matchesPreviousValue = actualPreviousValue.equals(previousValue);
    let isValidAction = usesPreviousValue.implies(matchesPreviousValue);
    isValidUpdate = isValidUpdate.and(isValidAction);

    // store new value in at the key
    let newRoot = witness.calculateRoot(value);

    // update intermediate root if this wasn't a dummy action
    intermediateRoot = Provable.if(isDummy, intermediateRoot, newRoot);

    // at checkpoints, update the root, if the entire update was valid
    root = Provable.if(isCheckPoint.and(isValidUpdate), intermediateRoot, root);
    // at checkpoints, reset intermediate values
    isValidUpdate = Provable.if(isCheckPoint, Bool(true), isValidUpdate);
    intermediateRoot = Provable.if(isCheckPoint, root, intermediateRoot);

    // update the tree, outside the circuit (this should all be part of a better merkle tree API)
    Provable.asProver(() => {
      // ignore dummy value
      if (isDummy.toBoolean()) return;

      intermediateTree.get().setLeaf(key.toBigInt(), value);
      intermediateUpdates.push({ key, value });

      if (isCheckPoint.toBoolean()) {
        // if the update was valid, apply the intermediate updates to the actual tree
        if (isValidUpdate.toBoolean()) {
          intermediateUpdates.forEach(({ key, value }) => {
            tree.get().setLeaf(key.toBigInt(), value);
          });
          intermediateUpdates = [];
        }
        // otherwise, we have to roll back the intermediate tree (TODO: inefficient)
        else {
          intermediateTree.set(tree.get().clone());
        }
      }
    });
  });

  return { root, actionState: actions.currentHash };
}

/**
 * This program represents a proof that we can go from OffchainStateCommitments A -> B
 */
function OffchainStateRollup({
  // 1 action uses about 7.5k constraints
  // we can fit at most 7 * 7.5k = 52.5k constraints in one method next to proof verification
  // => we use `maxActionsPerBatch = 6` to safely stay below the constraint limit
  // the second parameter `maxActionsPerUpdate` only weakly affects # constraints, but has to be <= `maxActionsPerBatch`
  // => so we set it to the same value
  maxActionsPerBatch = 6,
  maxActionsPerUpdate = 6,
} = {}) {
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
        privateInputs: [ActionIterator.provable, Unconstrained.provable],

        async method(
          stateA: OffchainStateCommitments,
          actions: ActionIterator,
          tree: Unconstrained<MerkleTree>
        ): Promise<OffchainStateCommitments> {
          return merkleUpdateBatch(
            { maxActionsPerBatch, maxActionsPerUpdate },
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
          Unconstrained.provable,
          SelfProof,
        ],

        async method(
          stateA: OffchainStateCommitments,
          actions: ActionIterator,
          tree: Unconstrained<MerkleTree>,
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
            { maxActionsPerBatch, maxActionsPerUpdate },
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

    async prove(tree: MerkleTree, actions: MerkleList<MerkleList<MerkleLeaf>>) {
      assert(tree.height === TREE_HEIGHT, 'Tree height must match');
      if (getProofsEnabled()) await this.compile();
      // clone the tree so we don't modify the input
      tree = tree.clone();

      // input state
      let iterator = actions.startIterating();
      let inputState = new OffchainStateCommitments({
        root: tree.getRoot(),
        actionState: iterator.currentHash,
      });

      // if proofs are disabled, create a dummy proof and final state, and return
      if (!getProofsEnabled()) {
        tree = merkleUpdateOutside(actions, tree);
        let finalState = new OffchainStateCommitments({
          root: tree.getRoot(),
          actionState: iterator.hash,
        });
        let proof = await RollupProof.dummy(inputState, finalState, 2, 15);
        return { proof, tree };
      }

      // base proof
      console.time('batch 0');
      let slice = sliceActions(iterator, maxActionsPerBatch);
      let proof = await offchainStateRollup.firstBatch(
        inputState,
        slice,
        Unconstrained.from(tree)
      );
      console.timeEnd('batch 0');

      // recursive proofs
      for (let i = 1; ; i++) {
        if (iterator.isAtEnd().toBoolean()) break;

        console.time(`batch ${i}`);
        let slice = sliceActions(iterator, maxActionsPerBatch);
        proof = await offchainStateRollup.nextBatch(
          inputState,
          slice,
          Unconstrained.from(tree),
          proof
        );
        console.timeEnd(`batch ${i}`);
      }

      return { proof, tree };
    },
  };
}

// from a nested list of actions, create a slice (iterator) starting at `index` that has at most `batchSize` actions in it\
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

// TODO: do we have to repeat the merkle updates outside the circuit?

function merkleUpdateOutside(
  actions: MerkleList<MerkleList<MerkleLeaf>>,
  tree: MerkleTree
) {
  tree = tree.clone();

  actions.data.get().forEach(({ element: actionsList }) => {
    actionsList.data.get().forEach(({ element: { key, value } }) => {
      tree.setLeaf(key.toBigInt(), value);
    });
  });

  return tree;
}
