/**
 * VK Digest Test Suite
 * 
 * Tests constraint system digest functionality between Snarky and Sparky backends
 * to verify that Sparky's digest implementation produces proper MD5 hashes
 * instead of returning "2" as was previously observed.
 */

export interface VKDigestTestCase {
  name: string;
  type: 'digest' | 'comparison';
  testFn: (backend?: string) => Promise<any>;
  timeout?: number;
}

export const tests: VKDigestTestCase[] = [
  {
    name: 'simple-field-addition-digest',
    type: 'digest',
    testFn: async (backend) => {
      const o1js = await import('../../../../index.js');
      const { ZkProgram, Field, Provable } = o1js;
      
      // Create a simple ZkProgram with field addition
      const SimpleProgram = ZkProgram({
        name: 'simple-addition',
        publicInput: Field,
        
        methods: {
          add: {
            privateInputs: [Field],
            method(publicInput: any, privateInput: any) {
              const sum = publicInput.add(privateInput);
              sum.assertEquals(Field(10)); // Simple constraint
              return sum;
            }
          }
        }
      });
      
      let digestResult = '';
      let compilationSuccess = true;
      let errorMessage = '';
      let constraintSystemData = null;
      
      try {
        // Compile the program
        await SimpleProgram.compile();
        
        // Try to access the constraint system digest
        // This may require accessing internal compilation state
        if (SimpleProgram.analyzeMethods) {
          const analysis = await SimpleProgram.analyzeMethods();
          constraintSystemData = analysis;
        }
        
        // Try to access digest through global constraint bridge if available
        if (typeof globalThis !== 'undefined' && (globalThis as any).sparkyConstraintBridge) {
          const bridge = (globalThis as any).sparkyConstraintBridge;
          if (bridge.getFullConstraintSystem) {
            const constraintSystem = bridge.getFullConstraintSystem();
            digestResult = constraintSystem.digest || 'no-digest-available';
          }
        }
        
        // Alternative: try to access through compilation internals
        if (!digestResult && (SimpleProgram as any)._provers) {
          const provers = (SimpleProgram as any)._provers;
          if (provers.add && provers.add.digest) {
            digestResult = provers.add.digest;
          }
        }
        
      } catch (error) {
        compilationSuccess = false;
        errorMessage = (error as Error).message;
      }
      
      return {
        backend,
        programName: 'SimpleProgram',
        digest: digestResult || 'digest-not-accessible',
        digestLength: digestResult ? digestResult.length : 0,
        isValidMD5: digestResult && digestResult.length === 32 && /^[a-f0-9]+$/i.test(digestResult),
        isSuspiciousValue: digestResult === '2' || digestResult === 'undefined',
        constraintSystemAvailable: !!constraintSystemData,
        compilationSuccess,
        error: errorMessage || undefined
      };
    },
    timeout: 30000
  },
  
  {
    name: 'field-multiplication-digest',
    type: 'digest',
    testFn: async (backend) => {
      const o1js = await import('../../../../index.js');
      const { ZkProgram, Field, Provable } = o1js;
      
      // Create a slightly more complex program with multiplication
      const MultiplyProgram = ZkProgram({
        name: 'field-multiply',
        publicInput: Field,
        
        methods: {
          multiply: {
            privateInputs: [Field, Field],
            method(publicInput: any, a: any, b: any) {
              const product = a.mul(b);
              const result = publicInput.add(product);
              result.assertGreaterThan(Field(0)); // Range constraint
              return result;
            }
          }
        }
      });
      
      let digestResult = '';
      let compilationSuccess = true;
      let errorMessage = '';
      let constraintCount = 0;
      
      try {
        await MultiplyProgram.compile();
        
        // Try multiple methods to access digest
        if (typeof globalThis !== 'undefined' && (globalThis as any).sparkyConstraintBridge) {
          const bridge = (globalThis as any).sparkyConstraintBridge;
          if (bridge.getFullConstraintSystem) {
            const constraintSystem = bridge.getFullConstraintSystem();
            digestResult = constraintSystem.digest || '';
            constraintCount = constraintSystem.constraintCount || 0;
          }
        }
        
        // Try to access through program internals
        if (!digestResult && (MultiplyProgram as any)._provers) {
          const provers = (MultiplyProgram as any)._provers;
          if (provers.multiply && provers.multiply.digest) {
            digestResult = provers.multiply.digest;
          }
        }
        
        // Try analyzeMethods approach
        if (MultiplyProgram.analyzeMethods && !digestResult) {
          const analysis = await MultiplyProgram.analyzeMethods();
          if (analysis.multiply && analysis.multiply.digest) {
            digestResult = analysis.multiply.digest;
          }
        }
        
      } catch (error) {
        compilationSuccess = false;
        errorMessage = (error as Error).message;
      }
      
      return {
        backend,
        programName: 'MultiplyProgram',
        digest: digestResult || 'digest-not-accessible',
        digestLength: digestResult ? digestResult.length : 0,
        isValidMD5: digestResult && digestResult.length === 32 && /^[a-f0-9]+$/i.test(digestResult),
        isSuspiciousValue: digestResult === '2' || digestResult === 'undefined',
        constraintCount,
        compilationSuccess,
        error: errorMessage || undefined
      };
    },
    timeout: 30000
  },
  
  {
    name: 'witness-constraint-digest',
    type: 'digest',
    testFn: async (backend) => {
      const o1js = await import('../../../../index.js');
      const { ZkProgram, Field, Provable } = o1js;
      
      // Create a program with witness constraints
      const WitnessProgram = ZkProgram({
        name: 'witness-test',
        publicInput: Field,
        
        methods: {
          witnessTest: {
            privateInputs: [Field],
            method(publicInput: any, secret: any) {
              // Create witness variable
              const witnessValue = Provable.witness(Field, () => Field(42));
              
              // Add constraints on witness
              witnessValue.assertGreaterThan(Field(40));
              witnessValue.assertLessThan(Field(50));
              
              // Use witness in computation
              const result = publicInput.mul(secret).add(witnessValue);
              result.assertEquals(Field(100)); // Final constraint
              
              return result;
            }
          }
        }
      });
      
      let digestResult = '';
      let compilationSuccess = true;
      let errorMessage = '';
      let witnessCount = 0;
      
      try {
        await WitnessProgram.compile();
        
        // Access constraint system digest
        if (typeof globalThis !== 'undefined' && (globalThis as any).sparkyConstraintBridge) {
          const bridge = (globalThis as any).sparkyConstraintBridge;
          if (bridge.getFullConstraintSystem) {
            const constraintSystem = bridge.getFullConstraintSystem();
            digestResult = constraintSystem.digest || '';
            witnessCount = constraintSystem.witnessCount || 0;
          }
        }
        
        // Try to access through program compilation result
        if (!digestResult && (WitnessProgram as any)._provers) {
          const provers = (WitnessProgram as any)._provers;
          if (provers.witnessTest && provers.witnessTest.digest) {
            digestResult = provers.witnessTest.digest;
          }
        }
        
      } catch (error) {
        compilationSuccess = false;
        errorMessage = (error as Error).message;
      }
      
      return {
        backend,
        programName: 'WitnessProgram',
        digest: digestResult || 'digest-not-accessible',
        digestLength: digestResult ? digestResult.length : 0,
        isValidMD5: digestResult && digestResult.length === 32 && /^[a-f0-9]+$/i.test(digestResult),
        isSuspiciousValue: digestResult === '2' || digestResult === 'undefined',
        witnessCount,
        compilationSuccess,
        error: errorMessage || undefined
      };
    },
    timeout: 30000
  },
  
  {
    name: 'smartcontract-digest',
    type: 'digest',
    testFn: async (backend) => {
      const o1js = await import('../../../../index.js');
      const { SmartContract, State, state, Field, method, Mina } = o1js;
      
      // Set up minimal local blockchain
      try {
        const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
        Mina.setActiveInstance(Local);
      } catch (error) {
        return {
          backend,
          contractName: 'DigestContract',
          digest: 'blockchain-setup-failed',
          digestLength: 0,
          isValidMD5: false,
          isSuspiciousValue: false,
          compilationSuccess: false,
          error: 'LocalBlockchain setup failed'
        };
      }
      
      class DigestContract extends SmartContract {
        @state(Field) value = State();
        
        init() {
          super.init();
          this.value.set(Field(0));
        }
        
        @method async updateValue(newValue: any) {
          const current = this.value.getAndRequireEquals();
          // Ensure newValue is properly typed as Field
          const newValueField = Field(newValue);
          const sum = (current as any).add(newValueField);
          sum.assertEquals(Field(10)); // Simple constraint
          this.value.set(sum);
        }
      }
      
      let digestResult = '';
      let compilationSuccess = true;
      let errorMessage = '';
      let verificationKeyHash = '';
      
      try {
        const compilationResult = await DigestContract.compile();
        
        // Try to get digest from verification key
        if (compilationResult.verificationKey) {
          verificationKeyHash = compilationResult.verificationKey.hash?.toString() || '';
        }
        
        // Try to access constraint system digest
        if (typeof globalThis !== 'undefined' && (globalThis as any).sparkyConstraintBridge) {
          const bridge = (globalThis as any).sparkyConstraintBridge;
          if (bridge.getFullConstraintSystem) {
            const constraintSystem = bridge.getFullConstraintSystem();
            digestResult = constraintSystem.digest || '';
          }
        }
        
        // Try to access through compilation result
        if (!digestResult && compilationResult.provers) {
          const provers = compilationResult.provers as any;
          if (provers.updateValue && provers.updateValue.digest) {
            digestResult = provers.updateValue.digest;
          }
        }
        
      } catch (error) {
        compilationSuccess = false;
        errorMessage = (error as Error).message;
      }
      
      return {
        backend,
        contractName: 'DigestContract',
        digest: digestResult || 'digest-not-accessible',
        digestLength: digestResult ? digestResult.length : 0,
        isValidMD5: digestResult && digestResult.length === 32 && /^[a-f0-9]+$/i.test(digestResult),
        isSuspiciousValue: digestResult === '2' || digestResult === 'undefined',
        verificationKeyHash: verificationKeyHash || 'no-vk-hash',
        compilationSuccess,
        error: errorMessage || undefined
      };
    },
    timeout: 60000
  }
];

export default { tests };