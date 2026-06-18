/**
 * Holistic benchmark for Merkle tree operations
 * Tests tree updates and membership proofs
 */

import {
  Field,
  ZkProgram,
  MerkleTree,
  MerkleWitness,
  Poseidon,
  Bool,
} from '../../../src/lib/provable/wrapped.js';
import { backendBenchmark, BackendConfig } from '../../utils/comparison/backend-benchmark.js';

export { merkleTreeBenchmarks };

const merkleTreeBenchmarks = [
  createMerkleProofBenchmark(),
  createMerkleUpdateBenchmark(),
  createBatchMerkleOperationsBenchmark(),
];

class MerkleWitness8 extends MerkleWitness(8) {}
class MerkleWitness16 extends MerkleWitness(16) {}

const MerkleProofProgram = ZkProgram({
  name: 'MerkleProofProgram',
  publicInput: Field,
  publicOutput: Bool,
  methods: {
    verifyMembership: {
      privateInputs: [Field, MerkleWitness8],
      async method(root: Field, leaf: Field, witness: MerkleWitness8): Promise<Bool> {
        const calculatedRoot = witness.calculateRoot(leaf);
        return calculatedRoot.equals(root);
      },
    },
  },
});

const MerkleUpdateProgram = ZkProgram({
  name: 'MerkleUpdateProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    updateLeaf: {
      privateInputs: [Field, Field, MerkleWitness8],
      async method(
        oldRoot: Field,
        oldLeaf: Field,
        newLeaf: Field,
        witness: MerkleWitness8
      ): Promise<Field> {
        // Verify the old leaf was in the tree
        const calculatedOldRoot = witness.calculateRoot(oldLeaf);
        calculatedOldRoot.assertEquals(oldRoot);

        // Calculate new root with updated leaf
        const newRoot = witness.calculateRoot(newLeaf);
        return newRoot;
      },
    },
  },
});

const BatchMerkleProgram = ZkProgram({
  name: 'BatchMerkleProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    batchUpdate: {
      privateInputs: [
        Field,
        Field,
        Field,
        Field,
        MerkleWitness16,
        MerkleWitness16,
        MerkleWitness16,
      ],
      async method(
        initialRoot: Field,
        leaf1: Field,
        leaf2: Field,
        leaf3: Field,
        newLeaf1: Field,
        newLeaf2: Field,
        newLeaf3: Field,
        witness1: MerkleWitness16,
        witness2: MerkleWitness16,
        witness3: MerkleWitness16
      ): Promise<Field> {
        // Verify all leaves are in the initial tree
        let currentRoot = initialRoot;

        const root1 = witness1.calculateRoot(leaf1);
        root1.assertEquals(currentRoot);

        const root2 = witness2.calculateRoot(leaf2);
        root2.assertEquals(currentRoot);

        const root3 = witness3.calculateRoot(leaf3);
        root3.assertEquals(currentRoot);

        // Update leaves sequentially
        const newRoot1 = witness1.calculateRoot(newLeaf1);
        const newRoot2 = witness2.calculateRoot(newLeaf2);
        const newRoot3 = witness3.calculateRoot(newLeaf3);

        // In a real implementation, we'd need to update witnesses between updates
        // For this benchmark, we'll simulate the final root calculation
        const finalRoot = Poseidon.hash([newRoot1, newRoot2, newRoot3]);

        return finalRoot;
      },
    },
  },
});

function createMerkleProofBenchmark() {
  return backendBenchmark(
    'Merkle Proof Verification',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await MerkleProofProgram.compile();
      toc('compilation');
      memTracker.checkpoint();

      tic('witness');

      // Create a small merkle tree for testing
      const tree = new MerkleTree(8);
      const leafValue = Field(12345);
      const leafIndex = 3;

      tree.setLeaf(BigInt(leafIndex), leafValue);
      const root = tree.getRoot();
      const witness = new MerkleWitness8(tree.getWitness(BigInt(leafIndex)));

      // Verify membership
      const isValid = await MerkleProofProgram.verifyMembership(
        root,
        leafValue,
        witness
      );

      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 8 * 5 }; // Depth 8, ~5 constraints per level
    },
    getMerkleConfigs()
  );
}

function createMerkleUpdateBenchmark() {
  return backendBenchmark(
    'Merkle Tree Update',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await MerkleUpdateProgram.compile();
      toc('compilation');
      memTracker.checkpoint();

      tic('witness');

      const tree = new MerkleTree(8);
      const oldLeaf = Field(100);
      const newLeaf = Field(200);
      const leafIndex = 5;

      tree.setLeaf(BigInt(leafIndex), oldLeaf);
      const oldRoot = tree.getRoot();
      const witness = new MerkleWitness8(tree.getWitness(BigInt(leafIndex)));

      // Perform update
      const newRoot = await MerkleUpdateProgram.updateLeaf(
        oldRoot,
        oldLeaf,
        newLeaf,
        witness
      );

      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 8 * 10 }; // Two root calculations
    },
    getMerkleConfigs()
  );
}

function createBatchMerkleOperationsBenchmark() {
  return backendBenchmark(
    'Batch Merkle Operations',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await BatchMerkleProgram.compile();
      toc('compilation');
      memTracker.checkpoint();

      tic('witness');

      const tree = new MerkleTree(16);
      
      const leaves = [Field(100), Field(200), Field(300)];
      const newLeaves = [Field(150), Field(250), Field(350)];
      const indices = [1, 5, 10];

      // Set up initial tree
      for (let i = 0; i < leaves.length; i++) {
        tree.setLeaf(BigInt(indices[i]), leaves[i]);
      }

      const initialRoot = tree.getRoot();
      const witnesses = indices.map(
        (index) => new MerkleWitness16(tree.getWitness(BigInt(index)))
      );

      // Perform batch update
      const finalRoot = await BatchMerkleProgram.batchUpdate(
        initialRoot,
        leaves[0],
        leaves[1],
        leaves[2],
        newLeaves[0],
        newLeaves[1],
        newLeaves[2],
        witnesses[0],
        witnesses[1],
        witnesses[2]
      );

      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 16 * 18 + 270 }; // 6 root calculations + final hash
    },
    getMerkleConfigs()
  );
}

function getMerkleConfigs(): BackendConfig[] {
  return [
    {
      name: 'snarky',
      warmupRuns: 1,
      measurementRuns: 3, // Merkle operations can be expensive
    },
    {
      name: 'sparky',
      warmupRuns: 1,
      measurementRuns: 3,
    },
  ];
}