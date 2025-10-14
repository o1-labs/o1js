import {
  DynamicProof,
  FeatureFlags,
  Field,
  MerkleWitness,
  Proof,
  SelfProof,
  Struct,
  VerificationKey,
  ZkProgram,
} from 'o1js';

export {
  mainProgram,
  sideloadedProgram,
  SideloadedProgramProof,
  MerkleTreeWitness,
  MainProgramState,
};

/**
 * This example showcases how DynamicProofs can be used along with a merkletree that stores
 * the verification keys that can be used to verify it.
 * The MainProgram has two methods, addSideloadedProgram that adds a given verification key
 * to the tree, and validateUsingTree that uses a given tree leaf to verify a given child-proof
 * using the verification tree stored under that leaf.
 */

const sideloadedProgram = ZkProgram({
  name: 'childProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field],
      async method(publicInput: Field, privateInput: Field) {
        return {
          publicOutput: publicInput.add(privateInput),
        };
      },
    },
    assertAndAdd: {
      privateInputs: [Field],
      async method(publicInput: Field, privateInput: Field) {
        // this uses assert to test range check gates and their feature flags
        publicInput.assertLessThanOrEqual(privateInput);
        return { publicOutput: publicInput.add(privateInput) };
      },
    },
  },
});

// given a zkProgram, we compute the feature flags that we need in order to verify proofs that were generated
const featureFlags = await FeatureFlags.fromZkProgram(sideloadedProgram);

class SideloadedProgramProof extends DynamicProof<Field, Field> {
  static publicInputType = Field;
  static publicOutputType = Field;
  static maxProofsVerified = 0 as const;

  // we use the feature flags that we computed from the `sideloadedProgram` ZkProgram
  static featureFlags = featureFlags;
}

class MerkleTreeWitness extends MerkleWitness(64) {}

class MainProgramState extends Struct({
  treeRoot: Field,
  state: Field,
}) {}

const mainProgram = ZkProgram({
  name: 'mainProgram',
  publicInput: MainProgramState,
  publicOutput: MainProgramState,
  methods: {
    addSideloadedProgram: {
      privateInputs: [VerificationKey, MerkleTreeWitness],
      async method(
        publicInput: MainProgramState,
        vk: VerificationKey,
        merkleWitness: MerkleTreeWitness
      ) {
        // In practice, this method would be guarded via some access control mechanism
        const currentRoot = merkleWitness.calculateRoot(Field(0));
        publicInput.treeRoot.assertEquals(
          currentRoot,
          'Provided merklewitness not correct or leaf not empty'
        );
        const newRoot = merkleWitness.calculateRoot(vk.hash);

        return {
          publicOutput: new MainProgramState({
            state: publicInput.state,
            treeRoot: newRoot,
          }),
        };
      },
    },
    validateUsingTree: {
      privateInputs: [SelfProof, VerificationKey, MerkleTreeWitness, SideloadedProgramProof],
      async method(
        publicInput: MainProgramState,
        previous: Proof<MainProgramState, MainProgramState>,
        vk: VerificationKey,
        merkleWitness: MerkleTreeWitness,
        proof: SideloadedProgramProof
      ) {
        // Verify previous program state
        previous.publicOutput.state.assertEquals(publicInput.state);
        previous.publicOutput.treeRoot.assertEquals(publicInput.treeRoot);

        // Verify inclusion of vk inside the tree
        const computedRoot = merkleWitness.calculateRoot(vk.hash);
        publicInput.treeRoot.assertEquals(
          computedRoot,
          'Tree witness with provided vk not correct'
        );

        proof.verify(vk);

        // Compute new state
        proof.publicInput.assertEquals(publicInput.state);
        const newState = proof.publicOutput;
        return {
          publicOutput: new MainProgramState({
            treeRoot: publicInput.treeRoot,
            state: newState,
          }),
        };
      },
    },
  },
});
