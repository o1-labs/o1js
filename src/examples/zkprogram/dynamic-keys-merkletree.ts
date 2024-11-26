import {
  DynamicProof,
  FeatureFlags,
  Field,
  MerkleTree,
  MerkleWitness,
  Proof,
  SelfProof,
  Struct,
  VerificationKey,
  ZkProgram,
  verify,
} from 'o1js';

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

const tree = new MerkleTree(64);
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
      privateInputs: [
        SelfProof,
        VerificationKey,
        MerkleTreeWitness,
        SideloadedProgramProof,
      ],
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

console.log('Compiling circuits...');
const programVk = (await sideloadedProgram.compile()).verificationKey;
const mainVk = (await mainProgram.compile()).verificationKey;

console.log('Proving deployment of side-loaded key');
const rootBefore = tree.getRoot();
tree.setLeaf(1n, programVk.hash);
const witness = new MerkleTreeWitness(tree.getWitness(1n));

const { proof: proof1 } = await mainProgram.addSideloadedProgram(
  new MainProgramState({
    treeRoot: rootBefore,
    state: Field(0),
  }),
  programVk,
  witness
);

console.log('Proving child program execution');
const { proof: childProof } = await sideloadedProgram.compute(
  Field(0),
  Field(10)
);

console.log('Proving verification inside main program');
const { proof: proof2 } = await mainProgram.validateUsingTree(
  proof1.publicOutput,
  proof1,
  programVk,
  witness,
  SideloadedProgramProof.fromProof(childProof)
);

const validProof2 = await verify(proof2, mainVk);
console.log('ok?', validProof2);

console.log('Proving different method of child program');
const { proof: childProof2 } = await sideloadedProgram.assertAndAdd(
  Field(0),
  Field(10)
);

console.log('Proving verification inside main program');
const proof3 = await mainProgram.validateUsingTree(
  proof1.publicOutput,
  proof1,
  programVk,
  witness,
  SideloadedProgramProof.fromProof(childProof)
);

const validProof3 = await verify(proof2, mainVk);
console.log('ok?', validProof2);
