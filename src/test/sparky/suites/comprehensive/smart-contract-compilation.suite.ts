/**
 * Comprehensive SmartContract Compilation Tests
 * 
 * Real circuit compilation tests that compile non-trivial SmartContracts
 * and compare results between Snarky and Sparky backends.
 */

export interface CompilationTestCase {
  name: string;
  type: 'compilation' | 'cross-backend-comparison';
  testFn: (backend?: string) => Promise<any>;
  timeout?: number;
  memoryLimit?: number;
}

export const tests: CompilationTestCase[] = [
  {
    name: 'basic-smart-contract-compilation',
    type: 'compilation',
    testFn: async (backend) => {
      const o1js = (global as any).o1js;
      const { SmartContract, State, state, Field, method, PublicKey, Signature, Permissions } = o1js;
      
      class BasicContract extends SmartContract {
        @state(Field) value = State<Field>();
        @state(PublicKey) owner = State<PublicKey>();
        
        init() {
          super.init();
          this.value.set(Field(0));
          this.owner.set(this.sender);
          this.account.permissions.set({
            ...Permissions.default(),
            editState: Permissions.proofOrSignature(),
          });
        }
        
        @method updateValue(newValue: Field, signature: Signature) {
          // Verify owner signature
          const owner = this.owner.getAndRequireEquals();
          signature.verify(owner, [newValue]);
          
          // Get current value and ensure increment
          const currentValue = this.value.getAndRequireEquals();
          newValue.assertGreaterThan(currentValue);
          
          // Update state
          this.value.set(newValue);
        }
        
        @method addValues(a: Field, b: Field) {
          const sum = a.add(b);
          const currentValue = this.value.getAndRequireEquals();
          this.value.set(currentValue.add(sum));
        }
      }
      
      const startTime = Date.now();
      const compilationResult = await BasicContract.compile();
      const endTime = Date.now();
      
      return {
        backend,
        contractName: 'BasicContract',
        verificationKey: compilationResult.verificationKey.data,
        verificationKeyHash: compilationResult.verificationKey.hash,
        methodNames: Object.keys(compilationResult.provers),
        compilationTime: endTime - startTime,
        constraintCounts: Object.fromEntries(
          Object.entries(compilationResult.provers).map(([method, prover]) => [
            method, 
            (prover as any).constraintSystem?.length || 0
          ])
        )
      };
    },
    timeout: 120000, // 2 minutes for compilation
    memoryLimit: 1000 // 1GB for compilation
  },

  {
    name: 'crypto-smart-contract-compilation',
    type: 'compilation',
    testFn: async (backend) => {
      const o1js = (global as any).o1js;
      const { SmartContract, State, state, Field, method, Poseidon, MerkleWitness, Bool } = o1js;
      
      class MerkleTree8 extends MerkleWitness(8) {}
      
      class CryptoContract extends SmartContract {
        @state(Field) merkleRoot = State<Field>();
        @state(Field) hashValue = State<Field>();
        @state(Field) counter = State<Field>();
        
        init() {
          super.init();
          this.merkleRoot.set(Field(0));
          this.hashValue.set(Field(0));
          this.counter.set(Field(0));
        }
        
        @method updateMerkleRoot(
          newLeaf: Field,
          witness: MerkleTree8,
          currentRoot: Field
        ) {
          // Verify current root
          const storedRoot = this.merkleRoot.getAndRequireEquals();
          storedRoot.assertEquals(currentRoot);
          
          // Calculate new root
          const calculatedRoot = witness.calculateRoot(newLeaf);
          
          // Update state
          this.merkleRoot.set(calculatedRoot);
        }
        
        @method hashAndStore(preimage1: Field, preimage2: Field, preimage3: Field) {
          // Complex Poseidon hashing
          const hash1 = Poseidon.hash([preimage1, preimage2]);
          const hash2 = Poseidon.hash([hash1, preimage3]);
          const finalHash = Poseidon.hash([hash2, preimage1]);
          
          // Store result
          this.hashValue.set(finalHash);
          
          // Increment counter
          const currentCounter = this.counter.getAndRequireEquals();
          this.counter.set(currentCounter.add(Field(1)));
        }
        
        @method conditionalUpdate(condition: Bool, value1: Field, value2: Field) {
          const selectedValue = Bool.if(condition, value1, value2);
          const currentHash = this.hashValue.getAndRequireEquals();
          const newHash = Poseidon.hash([currentHash, selectedValue]);
          this.hashValue.set(newHash);
        }
      }
      
      const startTime = Date.now();
      const compilationResult = await CryptoContract.compile();
      const endTime = Date.now();
      
      return {
        backend,
        contractName: 'CryptoContract',
        verificationKey: compilationResult.verificationKey.data,
        verificationKeyHash: compilationResult.verificationKey.hash,
        methodNames: Object.keys(compilationResult.provers),
        compilationTime: endTime - startTime,
        constraintCounts: Object.fromEntries(
          Object.entries(compilationResult.provers).map(([method, prover]) => [
            method, 
            (prover as any).constraintSystem?.length || 0
          ])
        ),
        totalConstraints: Object.values(compilationResult.provers).reduce(
          (sum, prover) => sum + ((prover as any).constraintSystem?.length || 0), 
          0
        )
      };
    },
    timeout: 180000, // 3 minutes for complex compilation
    memoryLimit: 1500 // 1.5GB for complex compilation
  },

  {
    name: 'recursive-smart-contract-compilation',
    type: 'compilation',
    testFn: async (backend) => {
      const o1js = (global as any).o1js;
      const { SmartContract, State, state, Field, method, ZkProgram, SelfProof, verify } = o1js;
      
      // First create a simple ZkProgram for recursion
      const SimpleProgram = ZkProgram({
        name: 'simple-program',
        publicInput: Field,
        
        methods: {
          baseCase: {
            privateInputs: [],
            method(input: Field) {
              input.assertGreaterThan(Field(0));
            }
          },
          
          step: {
            privateInputs: [SelfProof],
            method(input: Field, earlierProof: SelfProof<Field, void>) {
              earlierProof.verify();
              input.assertGreaterThan(earlierProof.publicInput);
            }
          }
        }
      });
      
      class RecursiveContract extends SmartContract {
        @state(Field) verifiedValue = State<Field>();
        @state(Field) proofCount = State<Field>();
        
        init() {
          super.init();
          this.verifiedValue.set(Field(0));
          this.proofCount.set(Field(0));
        }
        
        @method verifyProof(proof: SelfProof<Field, void>, expectedValue: Field) {
          // Verify the recursive proof
          verify(proof, SimpleProgram.verificationKey);
          
          // Check the proof's public input matches expected value
          proof.publicInput.assertEquals(expectedValue);
          
          // Update state
          this.verifiedValue.set(expectedValue);
          const currentCount = this.proofCount.getAndRequireEquals();
          this.proofCount.set(currentCount.add(Field(1)));
        }
        
        @method complexVerification(
          value1: Field, 
          value2: Field,
          proof1: SelfProof<Field, void>,
          proof2: SelfProof<Field, void>
        ) {
          // Verify both proofs
          verify(proof1, SimpleProgram.verificationKey);
          verify(proof2, SimpleProgram.verificationKey);
          
          // Check values
          proof1.publicInput.assertEquals(value1);
          proof2.publicInput.assertEquals(value2);
          
          // Ensure value2 > value1
          value2.assertGreaterThan(value1);
          
          // Store the larger value
          this.verifiedValue.set(value2);
        }
      }
      
      // Compile the ZkProgram first
      const programStartTime = Date.now();
      await SimpleProgram.compile();
      const programEndTime = Date.now();
      
      // Then compile the contract
      const contractStartTime = Date.now();
      const compilationResult = await RecursiveContract.compile();
      const contractEndTime = Date.now();
      
      return {
        backend,
        contractName: 'RecursiveContract',
        programName: 'SimpleProgram',
        verificationKey: compilationResult.verificationKey.data,
        verificationKeyHash: compilationResult.verificationKey.hash,
        methodNames: Object.keys(compilationResult.provers),
        programCompilationTime: programEndTime - programStartTime,
        contractCompilationTime: contractEndTime - contractStartTime,
        totalCompilationTime: (contractEndTime - programStartTime),
        constraintCounts: Object.fromEntries(
          Object.entries(compilationResult.provers).map(([method, prover]) => [
            method, 
            (prover as any).constraintSystem?.length || 0
          ])
        ),
        totalConstraints: Object.values(compilationResult.provers).reduce(
          (sum, prover) => sum + ((prover as any).constraintSystem?.length || 0), 
          0
        )
      };
    },
    timeout: 300000, // 5 minutes for recursive compilation
    memoryLimit: 2000 // 2GB for recursive compilation
  }
];

export default { tests };