/**
 * Comprehensive ZkProgram Compilation Tests
 * 
 * Real ZkProgram compilation tests that compile non-trivial programs
 * and compare results between Snarky and Sparky backends.
 */

export interface ZkProgramTestCase {
  name: string;
  type: 'compilation' | 'cross-backend-comparison';
  testFn: (backend?: string) => Promise<any>;
  timeout?: number;
  memoryLimit?: number;
}

export const tests: ZkProgramTestCase[] = [
  {
    name: 'merkle-tree-zkprogram-compilation',
    type: 'compilation',
    testFn: async (backend) => {
      const o1js = (global as any).o1js;
      const { ZkProgram, Field, Poseidon, MerkleWitness } = o1js;
      
      class MerkleTree10 extends MerkleWitness(10) {}
      
      const MerkleProgram = ZkProgram({
        name: 'merkle-verification',
        publicInput: Field, // merkle root
        publicOutput: Field, // leaf value
        
        methods: {
          verifyInclusion: {
            privateInputs: [Field, MerkleTree10], // leaf, witness
            method(root: Field, leaf: Field, witness: MerkleTree10) {
              // Calculate the root from the witness
              const calculatedRoot = witness.calculateRoot(leaf);
              
              // Verify it matches the expected root
              calculatedRoot.assertEquals(root);
              
              // Output the verified leaf
              return leaf;
            }
          },
          
          verifyUpdate: {
            privateInputs: [Field, Field, MerkleTree10], // oldLeaf, newLeaf, witness
            method(oldRoot: Field, oldLeaf: Field, newLeaf: Field, witness: MerkleTree10) {
              // Verify the old leaf was in the tree
              const calculatedOldRoot = witness.calculateRoot(oldLeaf);
              calculatedOldRoot.assertEquals(oldRoot);
              
              // Calculate new root with updated leaf
              const newRoot = witness.calculateRoot(newLeaf);
              
              // Return the new root
              return newRoot;
            }
          }
        }
      });
      
      const startTime = Date.now();
      await MerkleProgram.compile();
      const endTime = Date.now();
      
      return {
        backend,
        programName: 'MerkleProgram',
        verificationKey: MerkleProgram.verificationKey.data,
        verificationKeyHash: MerkleProgram.verificationKey.hash,
        methodNames: Object.keys(MerkleProgram._methods || {}),
        compilationTime: endTime - startTime,
        maxProofsVerified: 0, // No recursion in this program
        programType: 'merkle-tree-verification'
      };
    },
    timeout: 150000, // 2.5 minutes
    memoryLimit: 1200
  },

  {
    name: 'recursive-zkprogram-compilation',
    type: 'compilation',
    testFn: async (backend) => {
      const o1js = (global as any).o1js;
      const { ZkProgram, Field, SelfProof, Poseidon } = o1js;
      
      const RecursiveProgram = ZkProgram({
        name: 'recursive-hash-chain',
        publicInput: Field,
        publicOutput: Field,
        
        methods: {
          baseCase: {
            privateInputs: [Field], // initial value
            method(publicInput: Field, initialValue: Field) {
              // Verify the initial value
              initialValue.assertEquals(publicInput);
              
              // Hash it once
              const hash = Poseidon.hash([initialValue]);
              return hash;
            }
          },
          
          step: {
            privateInputs: [SelfProof, Field], // previous proof, new value
            method(publicInput: Field, earlierProof: SelfProof<Field, Field>, newValue: Field) {
              // Verify the earlier proof
              earlierProof.verify();
              
              // Ensure continuity: publicInput should be the previous output
              earlierProof.publicOutput.assertEquals(publicInput);
              
              // Hash the current input with the new value
              const newHash = Poseidon.hash([publicInput, newValue]);
              
              return newHash;
            }
          },
          
          doubleStep: {
            privateInputs: [SelfProof, SelfProof], // two previous proofs
            method(publicInput: Field, proof1: SelfProof<Field, Field>, proof2: SelfProof<Field, Field>) {
              // Verify both proofs
              proof1.verify();
              proof2.verify();
              
              // Chain them: proof1.output should equal proof2.input
              proof1.publicOutput.assertEquals(proof2.publicInput);
              
              // Current input should match first proof's input
              proof1.publicInput.assertEquals(publicInput);
              
              // Combine the outputs
              const combinedHash = Poseidon.hash([proof1.publicOutput, proof2.publicOutput]);
              
              return combinedHash;
            }
          }
        }
      });
      
      const startTime = Date.now();
      await RecursiveProgram.compile();
      const endTime = Date.now();
      
      return {
        backend,
        programName: 'RecursiveProgram',
        verificationKey: RecursiveProgram.verificationKey.data,
        verificationKeyHash: RecursiveProgram.verificationKey.hash,
        methodNames: Object.keys(RecursiveProgram._methods || {}),
        compilationTime: endTime - startTime,
        maxProofsVerified: 2, // doubleStep verifies 2 proofs
        programType: 'recursive-hash-chain'
      };
    },
    timeout: 240000, // 4 minutes for recursive compilation
    memoryLimit: 1800
  },

  {
    name: 'complex-math-zkprogram-compilation',
    type: 'compilation',
    testFn: async (backend) => {
      const o1js = (global as any).o1js;
      const { ZkProgram, Field, Bool, Provable } = o1js;
      
      const MathProgram = ZkProgram({
        name: 'complex-mathematics',
        publicInput: Field,
        publicOutput: Field,
        
        methods: {
          quadraticCheck: {
            privateInputs: [Field, Field, Field], // a, b, c coefficients
            method(x: Field, a: Field, b: Field, c: Field) {
              // Verify that ax² + bx + c = publicInput
              const xSquared = x.mul(x);
              const ax2 = a.mul(xSquared);
              const bx = b.mul(x);
              const result = ax2.add(bx).add(c);
              
              result.assertEquals(x); // This creates a constraint
              
              // Return a hash of the coefficients
              return Poseidon.hash([a, b, c]);
            }
          },
          
          conditionalComputation: {
            privateInputs: [Bool, Field, Field], // condition, value1, value2
            method(publicInput: Field, condition: Bool, value1: Field, value2: Field) {
              // Complex conditional logic
              const selectedValue = Provable.if(condition, value1, value2);
              
              // Ensure selected value relates to public input
              const sum = selectedValue.add(publicInput);
              const product = selectedValue.mul(publicInput);
              
              // Create complex constraint: sum * product must equal a specific pattern
              const constraint = sum.mul(product);
              
              // Multiple conditional branches
              const branch1 = Provable.if(condition, constraint.add(Field(1)), constraint.sub(Field(1)));
              const branch2 = Provable.if(condition.not(), branch1.mul(Field(2)), branch1.add(Field(5)));
              
              return branch2;
            }
          },
          
          iterativeComputation: {
            privateInputs: [Field, Field], // iterations, multiplier
            method(publicInput: Field, iterations: Field, multiplier: Field) {
              // Simulate iterative computation with provable arithmetic
              let current = publicInput;
              
              // Unroll a fixed number of iterations (since we can't use dynamic loops)
              for (let i = 0; i < 10; i++) {
                const shouldContinue = iterations.greaterThan(Field(i));
                const nextValue = current.mul(multiplier).add(Field(i + 1));
                current = Provable.if(shouldContinue, nextValue, current);
              }
              
              return current;
            }
          }
        }
      });
      
      const startTime = Date.now();
      await MathProgram.compile();
      const endTime = Date.now();
      
      return {
        backend,
        programName: 'MathProgram',
        verificationKey: MathProgram.verificationKey.data,
        verificationKeyHash: MathProgram.verificationKey.hash,
        methodNames: Object.keys(MathProgram._methods || {}),
        compilationTime: endTime - startTime,
        maxProofsVerified: 0,
        programType: 'complex-mathematics'
      };
    },
    timeout: 180000, // 3 minutes
    memoryLimit: 1500
  },

  {
    name: 'multi-layer-recursive-zkprogram-compilation',
    type: 'compilation',
    testFn: async (backend) => {
      const o1js = (global as any).o1js;
      const { ZkProgram, Field, SelfProof, Poseidon, Bool } = o1js;
      
      const MultiLayerProgram = ZkProgram({
        name: 'multi-layer-recursive',
        publicInput: Field,
        publicOutput: Field,
        
        methods: {
          init: {
            privateInputs: [Field, Field], // salt, initial_value
            method(publicInput: Field, salt: Field, initialValue: Field) {
              // Initialize with salted hash
              const saltedInput = Poseidon.hash([publicInput, salt]);
              saltedInput.assertEquals(initialValue);
              
              return Poseidon.hash([initialValue, Field(1)]);
            }
          },
          
          singleRecursion: {
            privateInputs: [SelfProof, Field], // previous proof, increment
            method(publicInput: Field, proof: SelfProof<Field, Field>, increment: Field) {
              proof.verify();
              proof.publicOutput.assertEquals(publicInput);
              
              const incremented = publicInput.add(increment);
              return Poseidon.hash([incremented, Field(2)]);
            }
          },
          
          doubleRecursion: {
            privateInputs: [SelfProof, SelfProof, Bool], // two proofs, selector
            method(publicInput: Field, proof1: SelfProof<Field, Field>, proof2: SelfProof<Field, Field>, selector: Bool) {
              proof1.verify();
              proof2.verify();
              
              // Conditional selection of which proof's output to use
              const selectedOutput = Provable.if(selector, proof1.publicOutput, proof2.publicOutput);
              selectedOutput.assertEquals(publicInput);
              
              // Complex combination of both proof outputs
              const combined = proof1.publicOutput.add(proof2.publicOutput);
              return Poseidon.hash([combined, Field(3)]);
            }
          },
          
          tripleRecursion: {
            privateInputs: [SelfProof, SelfProof, SelfProof], // three proofs
            method(publicInput: Field, proof1: SelfProof<Field, Field>, proof2: SelfProof<Field, Field>, proof3: SelfProof<Field, Field>) {
              proof1.verify();
              proof2.verify();
              proof3.verify();
              
              // Create complex relationships between all three proofs
              const sum = proof1.publicOutput.add(proof2.publicOutput).add(proof3.publicOutput);
              sum.assertEquals(publicInput.mul(Field(3))); // Constraint: sum must be 3x public input
              
              // Hierarchical hashing
              const hash1 = Poseidon.hash([proof1.publicOutput, proof2.publicOutput]);
              const hash2 = Poseidon.hash([hash1, proof3.publicOutput]);
              
              return Poseidon.hash([hash2, Field(4)]);
            }
          }
        }
      });
      
      const startTime = Date.now();
      await MultiLayerProgram.compile();
      const endTime = Date.now();
      
      return {
        backend,
        programName: 'MultiLayerProgram',
        verificationKey: MultiLayerProgram.verificationKey.data,
        verificationKeyHash: MultiLayerProgram.verificationKey.hash,
        methodNames: Object.keys(MultiLayerProgram._methods || {}),
        compilationTime: endTime - startTime,
        maxProofsVerified: 3, // tripleRecursion verifies 3 proofs
        programType: 'multi-layer-recursive'
      };
    },
    timeout: 300000, // 5 minutes for complex recursive compilation
    memoryLimit: 2500 // 2.5GB for complex recursive compilation
  }
];

export default { tests };