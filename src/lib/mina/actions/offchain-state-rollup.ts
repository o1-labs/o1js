import { Proof, ZkProgram } from '../../proof-system/zkprogram.js';
import { Field } from '../../provable/wrapped.js';
import { Unconstrained } from '../../provable/types/unconstrained.js';
import { MerkleList, MerkleListIterator } from '../../provable/merkle-list.js';
import { Actions } from '../../../bindings/mina-transaction/transaction-leaves.js';
import { MerkleTree, MerkleWitness } from '../../provable/merkle-tree.js';
import { Struct } from '../../provable/types/struct.js';
import { SelfProof } from '../../proof-system/zkprogram.js';
import { Provable } from '../../provable/provable.js';
import { assert } from '../../provable/gadgets/common.js';
import { ActionList, MerkleLeaf } from './offchain-state-serialization.js';
import { MerkleMap } from '../../provable/merkle-map.js';

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
 * Common logic for the proof that we can go from MerkleMapState A -> B
 */
function merkleUpdateBatch(
  {
    maxUpdatesPerBatch,
    maxActionsPerUpdate,
  }: {
    maxUpdatesPerBatch: number;
    maxActionsPerUpdate: number;
  },
  stateA: OffchainStateCommitments,
  actions: ActionIterator,
  tree: Unconstrained<MerkleTree>
): OffchainStateCommitments {
  // this would be unnecessary if the iterator could just be the public input
  actions.currentHash.assertEquals(stateA.actionState);
  let root = stateA.root;

  // TODO: would be more efficient to linearize the actions first and then iterate over them,
  // so we don't do the merkle lookup `maxActionsPerUpdate` times every time
  // update merkle root for each action
  for (let i = 0; i < maxUpdatesPerBatch; i++) {
    actions.next().forEach(maxActionsPerUpdate, ({ key, value }, isDummy) => {
      // merkle witness
      let witness = Provable.witness(
        MerkleMapWitness,
        () => new MerkleMapWitness(tree.get().getWitness(key.toBigInt()))
      );

      // previous value at the key
      let previousValue = Provable.witness(Field, () =>
        tree.get().getLeaf(key.toBigInt())
      );

      // prove that the witness is correct, by comparing the implied root and key
      // note: this just works if the (key, value) is a (0,0) dummy, because the value at the 0 key will always be 0
      witness.calculateIndex().assertEquals(key);
      witness.calculateRoot(previousValue).assertEquals(root);

      // store new value in at the key
      let newRoot = witness.calculateRoot(value);

      // update the tree, outside the circuit (this should all be part of a better merkle tree API)
      Provable.asProver(() => {
        // ignore dummy value
        if (isDummy.toBoolean()) return;
        tree.get().setLeaf(key.toBigInt(), value);
      });

      // update root
      root = Provable.if(isDummy, root, newRoot);
    });
  }

  return { root, actionState: actions.currentHash };
}

/**
 * This program represents a proof that we can go from MerkleMapState A -> B
 */
function OffchainStateRollup({
  maxUpdatesPerBatch = 2,
  maxActionsPerUpdate = 2,
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
            { maxUpdatesPerBatch, maxActionsPerUpdate },
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
            { maxUpdatesPerBatch, maxActionsPerUpdate },
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

    async compile() {
      if (isCompiled) return;
      let result = await offchainStateRollup.compile();
      isCompiled = true;
      return result;
    },

    async prove(tree: MerkleTree, actions: MerkleList<MerkleList<MerkleLeaf>>) {
      assert(tree.height === TREE_HEIGHT, 'Tree height must match');
      await this.compile();
      // clone the tree so we don't modify the input
      tree = tree.clone();

      let n = actions.data.get().length;
      let nBatches = Math.ceil(n / maxUpdatesPerBatch);

      // if there are no actions, we still need to create a valid proof for the empty transition
      if (n === 0) nBatches = 1;

      // input state
      let iterator = actions.startIterating();

      let inputState = new OffchainStateCommitments({
        root: tree.getRoot(),
        actionState: iterator.currentHash,
      });

      // base proof
      console.time('batch 0');
      let proof = await offchainStateRollup.firstBatch(
        inputState,
        iterator,
        Unconstrained.from(tree)
      );
      console.timeEnd('batch 0');

      // recursive proofs
      for (let i = 1; i < nBatches; i++) {
        // update iterator (would be nice if the method call would just return the updated one)
        iterator.currentHash = proof.publicOutput.actionState;
        for (let j = 0; j < maxUpdatesPerBatch; j++) {
          iterator._updateIndex('next');
        }

        console.time(`batch ${i}`);
        proof = await offchainStateRollup.nextBatch(
          inputState,
          iterator,
          Unconstrained.from(tree),
          proof
        );
        console.timeEnd(`batch ${i}`);
      }

      return { proof, tree };
    },

    program: offchainStateRollup,
  };
}

// TODO: do we have to repeat the merkle updates outside the circuit?

function merkleUpdateOutside(
  actions: MerkleList<MerkleList<MerkleLeaf>>,
  tree: MerkleTree,
  { maxUpdatesPerBatch = 10, maxActionsPerUpdate = 5 } = {}
) {
  tree = tree.clone();

  actions.forEach(maxUpdatesPerBatch, (actionsList, isDummy) => {
    if (isDummy.toBoolean()) return;

    actionsList.forEach(maxActionsPerUpdate, ({ key, value }, isDummy) => {
      if (isDummy.toBoolean()) return;

      tree.setLeaf(key.toBigInt(), value);
    });
  });

  return tree;
}
