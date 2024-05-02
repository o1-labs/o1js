import { ZkProgram } from '../../proof-system/zkprogram.js';
import { Field, Bool } from '../../provable/wrapped.js';
import { Unconstrained } from '../../provable/types/unconstrained.js';
import { MerkleList, MerkleListIterator } from '../../provable/merkle-list.js';
import { Actions } from '../../../bindings/mina-transaction/transaction-leaves.js';
import { MerkleTree, MerkleWitness } from '../../provable/merkle-tree.js';
import { Struct } from '../../provable/types/struct.js';
import { SelfProof } from '../../proof-system/zkprogram.js';
import { Provable } from '../../provable/provable.js';
import { AnyTuple } from '../../util/types.js';
import { assert } from '../../provable/gadgets/common.js';

export { MerkleMapRollup };

// our action type
class MerkleLeaf extends Struct({ key: Field, value: Field }) {}

class ActionList extends MerkleList.create(
  MerkleLeaf,
  (hash: Field, action: MerkleLeaf) =>
    Actions.pushEvent({ hash, data: [] }, MerkleLeaf.toFields(action)).hash,
  Actions.empty().hash
) {}

class ActionIterator extends MerkleListIterator.create(
  ActionList.provable,
  (hash: Field, actions: ActionList) =>
    Actions.updateSequenceState(hash, actions.hash),
  // we don't have to care about the initial hash here because we will just step forward
  Actions.emptyActionState()
) {}

class MerkleMapState extends Struct({
  // this should just be a MerkleTree type that carries the full tree as aux data
  root: Field,
  // TODO: make zkprogram support auxiliary data in public inputs
  // actionState: ActionIterator.provable,
  actionState: Field,
}) {}

const TREE_HEIGHT = 256;
class MerkleMapWitness extends MerkleWitness(TREE_HEIGHT) {}

// TODO: it would be nice to abstract the logic for proving a chain of state transition proofs

/**
 * This function represents a proof that we can go from MerkleMapState A -> B
 * One call of `merkleUpdateBatch()` either
 * - creates an initial proof A -> B (this is the `isRecursive: false` case)
 * - or, takes an existing proof A -> B, adds its own logic to prove B -> B', so that the output is a proof A -> B'
 */
const merkleUpdateBatch = (
  maxUpdatesPerBatch: number,
  maxActionsPerUpdate: number
) => ({
  privateInputs: [
    // the actions to process
    ActionIterator.provable,
    // the merkle tree to update
    Unconstrained.provable,
    // flag to set whether this is a recursive call
    Bool,
    // recursive proof for A -> B
    SelfProof,
  ] satisfies AnyTuple,

  async method(
    stateA: MerkleMapState,
    actions: ActionIterator,
    tree: Unconstrained<MerkleTree>,
    isRecursive: Bool,
    recursiveProof: SelfProof<MerkleMapState, MerkleMapState>
  ): Promise<MerkleMapState> {
    // in the non-recursive case, this skips verifying the proof so we can pass in a dummy proof
    recursiveProof.verifyIf(isRecursive);

    // in the recursive case, the recursive proof's initial state has to match this proof's initial state
    stateA = Provable.if(
      isRecursive,
      MerkleMapState,
      stateA,
      recursiveProof.publicInput
    );
    Provable.assertEqual(MerkleMapState, recursiveProof.publicInput, stateA);

    // the state we start with
    let stateB = Provable.if(
      isRecursive,
      MerkleMapState,
      recursiveProof.publicOutput,
      stateA
    );
    // this would be unnecessary if the iterator could just be the public input
    actions.currentHash.assertEquals(stateB.actionState);
    let root = stateB.root;

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
  },
});

function MerkleMapRollup({
  maxUpdatesPerBatch = 10,
  maxActionsPerUpdate = 5,
} = {}) {
  let merkleMapRollup = ZkProgram({
    name: 'merkle-map-rollup',
    publicInput: MerkleMapState,
    publicOutput: MerkleMapState,
    methods: {
      nextBatch: merkleUpdateBatch(maxUpdatesPerBatch, maxActionsPerUpdate),
    },
  });

  let MerkleRollupProof = ZkProgram.Proof(merkleMapRollup);

  let isCompiled = true;

  return {
    async compile() {
      if (isCompiled) return;
      let result = await merkleMapRollup.compile();
      isCompiled = true;
      return result;
    },

    async prove(actions: MerkleList<MerkleList<MerkleLeaf>>, tree: MerkleTree) {
      assert(tree.height === TREE_HEIGHT, 'Tree height must match');
      await this.compile();

      let n = actions.data.get().length;
      let nBatches = Math.ceil(n / maxUpdatesPerBatch);

      // if there are no actions, we still need to create a valid proof for the empty transition
      if (n === 0) nBatches = 1;

      // input state
      let iterator = actions.startIterating();

      let inputState = new MerkleMapState({
        root: tree.getRoot(),
        actionState: iterator.currentHash,
      });

      // dummy proof
      console.time('dummy');
      let dummyState = MerkleMapState.empty();
      let dummy = await MerkleRollupProof.dummy(dummyState, dummyState, 1);
      console.timeEnd('dummy');

      // base proof
      console.time('batch 0');
      let proof = await merkleMapRollup.nextBatch(
        inputState,
        iterator,
        Unconstrained.from(tree),
        Bool(false),
        dummy
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
        proof = await merkleMapRollup.nextBatch(
          inputState,
          iterator,
          Unconstrained.from(tree),
          Bool(true),
          proof
        );
        console.timeEnd(`batch ${i}`);
      }

      return proof;
    },

    program: merkleMapRollup,
  };
}
