/**
 * Cross-Backend Compilation Comparison Tests
 * 
 * Compiles the same circuits on both Snarky and Sparky backends and compares:
 * - Verification Keys
 * - Constraint Counts
 * - Compilation Times
 * - Circuit Structure
 */

export interface CrossBackendTestCase {
  name: string;
  type: 'cross-backend-comparison';
  testFn: () => Promise<any>;
  timeout?: number;
  memoryLimit?: number;
}

export const tests: CrossBackendTestCase[] = [
  {
    name: 'basic-contract-cross-backend-comparison',
    type: 'cross-backend-comparison',
    testFn: async () => {
      const o1js = (global as any).o1js;
      const { SmartContract, State, state, Field, method, switchBackend } = o1js;
      
      class TestContract extends SmartContract {
        @state(Field) value = State<Field>();
        
        init() {
          super.init();
          this.value.set(Field(0));
        }
        
        @method update(newValue: Field) {
          const current = this.value.getAndRequireEquals();
          newValue.assertGreaterThan(current);
          this.value.set(newValue);
        }
        
        @method compute(a: Field, b: Field, c: Field) {
          const result = a.mul(b).add(c);
          this.value.set(result);
        }
      }
      
      const results: any = {};
      
      // Test with Snarky backend
      await switchBackend('snarky');
      const snarkyStartTime = Date.now();
      const snarkyResult = await TestContract.compile();
      const snarkyEndTime = Date.now();
      
      results.snarky = {
        backend: 'snarky',
        verificationKey: snarkyResult.verificationKey.data,
        verificationKeyHash: snarkyResult.verificationKey.hash,
        compilationTime: snarkyEndTime - snarkyStartTime,
        methodNames: Object.keys(snarkyResult.provers),
        constraintCounts: Object.fromEntries(
          Object.entries(snarkyResult.provers).map(([method, prover]) => [
            method, 
            (prover as any).constraintSystem?.length || 0
          ])
        )
      };
      
      // Test with Sparky backend
      await switchBackend('sparky');
      const sparkyStartTime = Date.now();
      const sparkyResult = await TestContract.compile();
      const sparkyEndTime = Date.now();
      
      results.sparky = {
        backend: 'sparky',
        verificationKey: sparkyResult.verificationKey.data,
        verificationKeyHash: sparkyResult.verificationKey.hash,
        compilationTime: sparkyEndTime - sparkyStartTime,
        methodNames: Object.keys(sparkyResult.provers),
        constraintCounts: Object.fromEntries(
          Object.entries(sparkyResult.provers).map(([method, prover]) => [
            method, 
            (prover as any).constraintSystem?.length || 0
          ])
        )
      };
      
      // Comparison analysis
      results.comparison = {
        verificationKeysMatch: results.snarky.verificationKeyHash === results.sparky.verificationKeyHash,
        constraintCountsMatch: JSON.stringify(results.snarky.constraintCounts) === JSON.stringify(results.sparky.constraintCounts),
        methodNamesMatch: JSON.stringify(results.snarky.methodNames.sort()) === JSON.stringify(results.sparky.methodNames.sort()),
        compilationTimeRatio: results.sparky.compilationTime / results.snarky.compilationTime,
        constraintDifferences: Object.fromEntries(
          Object.keys(results.snarky.constraintCounts).map(method => [
            method,
            {
              snarky: results.snarky.constraintCounts[method],
              sparky: results.sparky.constraintCounts[method],
              difference: results.sparky.constraintCounts[method] - results.snarky.constraintCounts[method]
            }
          ])
        )
      };
      
      return results;
    },
    timeout: 180000, // 3 minutes for both compilations
    memoryLimit: 2000
  },

  {
    name: 'crypto-zkprogram-cross-backend-comparison',
    type: 'cross-backend-comparison',
    testFn: async () => {
      const o1js = (global as any).o1js;
      const { ZkProgram, Field, Poseidon, MerkleWitness, SelfProof, switchBackend } = o1js;
      
      class MerkleTree8 extends MerkleWitness(8) {}
      
      const CryptoProgram = ZkProgram({
        name: 'crypto-comparison',
        publicInput: Field,
        publicOutput: Field,
        
        methods: {
          hashChain: {
            privateInputs: [Field, Field, Field],
            method(publicInput: Field, value1: Field, value2: Field, value3: Field) {
              const hash1 = Poseidon.hash([publicInput, value1]);
              const hash2 = Poseidon.hash([hash1, value2]);
              const hash3 = Poseidon.hash([hash2, value3]);
              return hash3;
            }
          },
          
          merkleVerify: {
            privateInputs: [Field, MerkleTree8],
            method(publicInput: Field, leaf: Field, witness: MerkleTree8) {
              const root = witness.calculateRoot(leaf);
              root.assertEquals(publicInput);
              return leaf;
            }
          },
          
          recursive: {
            privateInputs: [SelfProof, Field],
            method(publicInput: Field, proof: SelfProof<Field, Field>, newValue: Field) {
              proof.verify();
              proof.publicOutput.assertEquals(publicInput);
              const newHash = Poseidon.hash([publicInput, newValue]);
              return newHash;
            }
          }
        }
      });
      
      const results: any = {};
      
      // Test with Snarky backend
      await switchBackend('snarky');
      const snarkyStartTime = Date.now();
      await CryptoProgram.compile();
      const snarkyEndTime = Date.now();
      
      results.snarky = {
        backend: 'snarky',
        verificationKey: CryptoProgram.verificationKey.data,
        verificationKeyHash: CryptoProgram.verificationKey.hash,
        compilationTime: snarkyEndTime - snarkyStartTime,
        methodNames: Object.keys(CryptoProgram._methods || {}),
        programName: 'crypto-comparison'
      };
      
      // Test with Sparky backend  
      await switchBackend('sparky');
      const sparkyStartTime = Date.now();
      await CryptoProgram.compile();
      const sparkyEndTime = Date.now();
      
      results.sparky = {
        backend: 'sparky',
        verificationKey: CryptoProgram.verificationKey.data,
        verificationKeyHash: CryptoProgram.verificationKey.hash,
        compilationTime: sparkyEndTime - sparkyStartTime,
        methodNames: Object.keys(CryptoProgram._methods || {}),
        programName: 'crypto-comparison'
      };
      
      // Comparison analysis
      results.comparison = {
        verificationKeysMatch: results.snarky.verificationKeyHash === results.sparky.verificationKeyHash,
        methodNamesMatch: JSON.stringify(results.snarky.methodNames.sort()) === JSON.stringify(results.sparky.methodNames.sort()),
        compilationTimeRatio: results.sparky.compilationTime / results.snarky.compilationTime,
        performanceImprovement: ((results.snarky.compilationTime - results.sparky.compilationTime) / results.snarky.compilationTime) * 100,
        fasterBackend: results.sparky.compilationTime < results.snarky.compilationTime ? 'sparky' : 'snarky'
      };
      
      return results;
    },
    timeout: 240000, // 4 minutes for both compilations
    memoryLimit: 2500
  },

  {
    name: 'complex-recursive-cross-backend-comparison',
    type: 'cross-backend-comparison',
    testFn: async () => {
      const o1js = (global as any).o1js;
      const { ZkProgram, Field, Poseidon, SelfProof, Bool, Provable, switchBackend } = o1js;
      
      const ComplexProgram = ZkProgram({
        name: 'complex-recursive-comparison',
        publicInput: Field,
        publicOutput: Field,
        
        methods: {
          base: {
            privateInputs: [Field],
            method(publicInput: Field, secret: Field) {
              const hash = Poseidon.hash([publicInput, secret]);
              return hash;
            }
          },
          
          step: {
            privateInputs: [SelfProof, Field, Bool],
            method(publicInput: Field, proof: SelfProof<Field, Field>, value: Field, condition: Bool) {
              proof.verify();
              proof.publicOutput.assertEquals(publicInput);
              
              const branch1 = Poseidon.hash([publicInput, value]);
              const branch2 = publicInput.add(value);
              const result = Provable.if(condition, branch1, branch2);
              
              return result;
            }
          },
          
          doubleRecursive: {
            privateInputs: [SelfProof, SelfProof],
            method(publicInput: Field, proof1: SelfProof<Field, Field>, proof2: SelfProof<Field, Field>) {
              proof1.verify();
              proof2.verify();
              
              const combined = proof1.publicOutput.add(proof2.publicOutput);
              combined.assertEquals(publicInput);
              
              return Poseidon.hash([proof1.publicOutput, proof2.publicOutput]);
            }
          }
        }
      });
      
      const results: any = {};
      
      // Test with Snarky backend
      await switchBackend('snarky');
      const snarkyStartTime = Date.now();
      await ComplexProgram.compile();
      const snarkyEndTime = Date.now();
      
      results.snarky = {
        backend: 'snarky',
        verificationKey: ComplexProgram.verificationKey.data,
        verificationKeyHash: ComplexProgram.verificationKey.hash,
        compilationTime: snarkyEndTime - snarkyStartTime,
        methodNames: Object.keys(ComplexProgram._methods || {}),
        maxProofsVerified: 2,
        programName: 'complex-recursive-comparison'
      };
      
      // Test with Sparky backend
      await switchBackend('sparky');
      const sparkyStartTime = Date.now();
      await ComplexProgram.compile();
      const sparkyEndTime = Date.now();
      
      results.sparky = {
        backend: 'sparky',
        verificationKey: ComplexProgram.verificationKey.data,
        verificationKeyHash: ComplexProgram.verificationKey.hash,
        compilationTime: sparkyEndTime - sparkyStartTime,
        methodNames: Object.keys(ComplexProgram._methods || {}),
        maxProofsVerified: 2,
        programName: 'complex-recursive-comparison'
      };
      
      // Deep comparison analysis
      results.comparison = {
        verificationKeysMatch: results.snarky.verificationKeyHash === results.sparky.verificationKeyHash,
        methodNamesMatch: JSON.stringify(results.snarky.methodNames.sort()) === JSON.stringify(results.sparky.methodNames.sort()),
        compilationTimeRatio: results.sparky.compilationTime / results.snarky.compilationTime,
        performanceImprovement: ((results.snarky.compilationTime - results.sparky.compilationTime) / results.snarky.compilationTime) * 100,
        fasterBackend: results.sparky.compilationTime < results.snarky.compilationTime ? 'sparky' : 'snarky',
        significantPerformanceDifference: Math.abs(results.sparky.compilationTime - results.snarky.compilationTime) > 1000, // > 1 second
        identicalStructure: results.snarky.verificationKeyHash === results.sparky.verificationKeyHash && 
                           JSON.stringify(results.snarky.methodNames.sort()) === JSON.stringify(results.sparky.methodNames.sort())
      };
      
      // Add warnings for significant differences
      results.warnings = [];
      if (!results.comparison.verificationKeysMatch) {
        results.warnings.push('Verification keys differ between backends - possible implementation divergence');
      }
      if (!results.comparison.methodNamesMatch) {
        results.warnings.push('Method names differ between backends - compilation structure mismatch');
      }
      if (Math.abs(results.comparison.performanceImprovement) > 50) {
        results.warnings.push(`Significant performance difference: ${results.comparison.performanceImprovement.toFixed(1)}%`);
      }
      
      return results;
    },
    timeout: 360000, // 6 minutes for complex recursive compilations
    memoryLimit: 3000
  }
];

export default { tests };