import { ZkProgram } from '../../proof-system/zkprogram.js';
import { Field, Bool } from '../../provable/wrapped.js';
import { Unconstrained } from '../../provable/types/unconstrained.js';
import { MerkleList, MerkleListIterator } from '../../provable/merkle-list.js';
import { Actions } from '../../../bindings/mina-transaction/transaction-leaves.js';
import { MerkleTree } from '../../provable/merkle-tree.js';
import { Struct } from '../../provable/types/struct.js';
import { SelfProof } from '../../proof-system/zkprogram.js';
import { Provable } from '../../provable/provable.js';
import { AnyTuple } from '../../util/types.js';

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
  merkleRoot: Field,
  // TODO: make zkprogram support auxiliary data in public inputs
  // actionState: ActionIterator.provable,
  actionState: Field,
}) {}

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
    let root = stateB.merkleRoot;

    // update merkle root for each action
    for (let i = 0; i < maxUpdatesPerBatch; i++) {
      let actionsList = actions.next();

      actionsList.forEach(maxActionsPerUpdate, ({ key, value }, isDummy) => {
        // TODO update root, using key, value and the tree
      });
    }

    return {
      merkleRoot: root,
      actionState: actions.currentHash,
    };
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

  // TODO: convenient interface for doing the entire chain of proofs
  return merkleMapRollup;
}
