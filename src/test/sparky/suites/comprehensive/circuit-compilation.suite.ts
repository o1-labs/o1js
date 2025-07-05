/**
 * Circuit Compilation Test Suite
 * 
 * Tests actual circuit compilation functionality with real SmartContracts
 * and ZkPrograms, comparing results between Snarky and Sparky backends.
 */

export interface CompilationTestCase {
  name: string;
  type: 'compilation';
  testFn: (backend?: string) => Promise<any>;
  timeout?: number;
}

export const tests: CompilationTestCase[] = [
  {
    name: 'basic-smartcontract-compilation',
    type: 'compilation',
    testFn: async (backend) => {
      const o1js = await import('../../../../index.js');
      const { SmartContract, State, state, Field, method, Mina, Provable } = o1js;
      
      // Set up minimal local blockchain for SmartContract compilation
      try {
        const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
        Mina.setActiveInstance(Local);
      } catch (error) {
        // If LocalBlockchain setup fails, skip this test
        return {
          backend,
          contractName: 'TestContract',
          verificationKeyExists: false,
          verificationKeyHash: 'skipped-setup-failed',
          methodCount: 0,
          compilationTime: 0,
          success: false,
          error: 'LocalBlockchain setup failed'
        };
      }
      
      class TestContract extends SmartContract {
        @state(Field) value = State();
        
        init() {
          super.init();
          this.value.set(Field(0));
        }
        
        @method async increment() {
          const current = this.value.getAndRequireEquals();
          const newValue = (current as any).add(Field(1));
          this.value.set(newValue);
        }
      }
      
      const startTime = Date.now();
      let compilationResult;
      let compilationSuccess = true;
      let errorMessage = '';
      
      try {
        console.log(`🔍 COMPILATION DEBUG [${backend}]: Starting TestContract.compile()`);
        compilationResult = await TestContract.compile();
        console.log(`🔍 COMPILATION DEBUG [${backend}]: Compilation succeeded`);
      } catch (error) {
        compilationSuccess = false;
        
        // ULTRA-DEBUG: Capture any type of error
        console.log(`🔍 COMPILATION DEBUG [${backend}]: Raw error object:`, error);
        console.log(`🔍 COMPILATION DEBUG [${backend}]: Error type:`, typeof error);
        console.log(`🔍 COMPILATION DEBUG [${backend}]: Error constructor:`, error?.constructor?.name);
        
        if (error instanceof Error) {
          errorMessage = error.message;
          console.log(`🔍 COMPILATION DEBUG [${backend}]: Error message: ${error.message}`);
          console.log(`🔍 COMPILATION DEBUG [${backend}]: Error stack:`, error.stack);
        } else {
          errorMessage = String(error);
          console.log(`🔍 COMPILATION DEBUG [${backend}]: Non-Error thrown: ${String(error)}`);
        }
        
        compilationResult = {
          verificationKey: null,
          provers: {}
        };
      }
      const endTime = Date.now();
      
      // ULTRA-DEBUG: Log all compilation result details
      console.log(`🔍 RESULT DEBUG [${backend}]: compilationSuccess = ${compilationSuccess}`);
      console.log(`🔍 RESULT DEBUG [${backend}]: errorMessage = "${errorMessage}"`);
      console.log(`🔍 RESULT DEBUG [${backend}]: compilationResult =`, compilationResult);
      console.log(`🔍 RESULT DEBUG [${backend}]: verificationKey exists = ${!!compilationResult.verificationKey}`);
      console.log(`🔍 RESULT DEBUG [${backend}]: verificationKey = `, compilationResult.verificationKey);
      console.log(`🔍 RESULT DEBUG [${backend}]: provers =`, compilationResult.provers);
      console.log(`🔍 RESULT DEBUG [${backend}]: methodCount = ${Object.keys(compilationResult.provers || {}).length}`);

      const result = {
        backend,
        contractName: 'TestContract',
        verificationKeyExists: !!compilationResult.verificationKey,
        verificationKeyHash: compilationResult.verificationKey?.hash || 'missing',
        methodCount: Object.keys(compilationResult.provers || {}).length,
        compilationTime: endTime - startTime,
        success: compilationSuccess,
        error: errorMessage || undefined
      };
      
      console.log(`🔍 FINAL RESULT [${backend}]:`, result);
      return result;
    },
    timeout: 120000 // 2 minutes
  },

  {
    name: 'zkprogram-compilation',
    type: 'compilation',
    testFn: async (backend) => {
      const o1js = await import('../../../../index.js');
      const { ZkProgram, Field, Poseidon, Provable } = o1js;
      
      const TestProgram = ZkProgram({
        name: 'test-program',
        publicInput: Field,
        
        methods: {
          double: {
            privateInputs: [Field],
            method(publicInput: any, secret: any) {
              // Test witness constraints in ZkProgram
              const witnessValue = Provable.witness(Field, () => Field(7));
              witnessValue.assertLessThan(Field(100));
              
              const result = publicInput.mul(Field(2)).add(secret).sub(witnessValue);
              return result;
            }
          }
        }
      });
      
      const startTime = Date.now();
      let compilationSuccess = true;
      let errorMessage = '';
      
      try {
        await TestProgram.compile();
      } catch (error) {
        compilationSuccess = false;
        errorMessage = (error as Error).message;
      }
      const endTime = Date.now();
      
      return {
        backend,
        programName: 'TestProgram',
        verificationKeyExists: false, // ZkProgram doesn't have direct verificationKey property
        verificationKeyHash: 'unavailable', // Would need to compile first
        methodCount: Object.keys((TestProgram as any)._methods || TestProgram.rawMethods || {}).length,
        compilationTime: endTime - startTime,
        success: compilationSuccess,
        error: errorMessage || undefined
      };
    },
    timeout: 180000 // 3 minutes
  },

  {
    name: 'complex-smartcontract-compilation',
    type: 'compilation',
    testFn: async (backend) => {
      const o1js = await import('../../../../index.js');
      const { SmartContract, State, state, Field, method, UInt64, Bool, Poseidon, Mina, Provable } = o1js;
      
      // Set up minimal local blockchain
      try {
        const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
        Mina.setActiveInstance(Local);
      } catch (error) {
        return {
          backend,
          contractName: 'ComplexContract',
          verificationKeyExists: false,
          verificationKeyHash: 'skipped-setup-failed',
          methodCount: 0,
          compilationTime: 0,
          success: false,
          error: 'LocalBlockchain setup failed'
        };
      }
      
      class ComplexContract extends SmartContract {
        @state(Field) counter = State();
        @state(UInt64) accountBalance = State(); // Renamed to avoid conflict with SmartContract.balance
        @state(Bool) isActive = State();
        
        init() {
          super.init();
          this.counter.set(Field(0));
          this.accountBalance.set(UInt64.zero);
          this.isActive.set(Bool(true));
        }
        
        @method async updateCounter(increment: any) {
          const currentCounter = this.counter.getAndRequireEquals();
          
          // Create witness variable for testing constraint generation
          const witnessValue = Provable.witness(Field, () => Field(5));
          witnessValue.assertGreaterThan(Field(0));
          
          const newCounter = (currentCounter as any).add(increment).add(witnessValue);
          this.counter.set(newCounter);
        }
        
        @method async updateBalance(amount: any) {
          const currentBalance = this.accountBalance.getAndRequireEquals();
          
          // Test UInt64 constraint generation
          const witnessAmount = Provable.witness(UInt64, () => UInt64.from(10));
          witnessAmount.assertLessThanOrEqual(UInt64.from(1000));
          
          const newBalance = (currentBalance as any).add(amount).add(witnessAmount);
          this.accountBalance.set(newBalance);
        }
        
        @method async hashAndStore(input: any) {
          // Test hash function constraints
          const witnessInput = Provable.witness(Field, () => Field(123));
          witnessInput.assertEquals(input);
          
          const hash = Poseidon.hash([input, witnessInput]);
          this.counter.set(hash);
        }
      }
      
      const startTime = Date.now();
      let compilationResult;
      let compilationSuccess = true;
      let errorMessage = '';
      
      try {
        compilationResult = await ComplexContract.compile();
      } catch (error) {
        compilationSuccess = false;
        errorMessage = (error as Error).message;
        compilationResult = {
          verificationKey: null,
          provers: {}
        };
      }
      const endTime = Date.now();
      
      return {
        backend,
        contractName: 'ComplexContract',
        verificationKeyExists: !!compilationResult.verificationKey,
        verificationKeyHash: compilationResult.verificationKey?.hash || 'missing',
        methodCount: Object.keys(compilationResult.provers || {}).length,
        compilationTime: endTime - startTime,
        success: compilationSuccess,
        error: errorMessage || undefined
      };
    },
    timeout: 180000 // 3 minutes
  },

  {
    name: 'recursive-zkprogram-compilation', 
    type: 'compilation',
    testFn: async (backend) => {
      const o1js = await import('../../../../index.js');
      const { ZkProgram, Field, SelfProof, verify, Provable } = o1js;
      
      const RecursiveProgram = ZkProgram({
        name: 'recursive-program',
        publicInput: Field,
        
        methods: {
          baseCase: {
            privateInputs: [Field],
            method(publicInput: any, secret: any) {
              // Test witness constraints in base case
              const witnessBase = Provable.witness(Field, () => Field(3));
              witnessBase.assertGreaterThan(Field(0));
              
              return publicInput.add(secret).mul(witnessBase);
            }
          },
          
          step: {
            privateInputs: [SelfProof, Field],
            method(publicInput: any, proof: any, increment: any) {
              proof.verify();
              
              // Test witness constraints in recursive step
              const witnessStep = Provable.witness(Field, () => Field(2));
              witnessStep.assertLessThan(Field(10));
              
              return publicInput.add(increment).add(witnessStep);
            }
          }
        }
      });
      
      const startTime = Date.now();
      let compilationSuccess = true;
      let errorMessage = '';
      
      try {
        await RecursiveProgram.compile();
      } catch (error) {
        compilationSuccess = false;
        errorMessage = (error as Error).message;
      }
      const endTime = Date.now();
      
      return {
        backend,
        programName: 'RecursiveProgram',
        verificationKeyExists: false, // ZkProgram doesn't have direct verificationKey property
        verificationKeyHash: 'unavailable', // Would need to compile first
        methodCount: Object.keys((RecursiveProgram as any)._methods || RecursiveProgram.rawMethods || {}).length,
        compilationTime: endTime - startTime,
        success: compilationSuccess,
        error: errorMessage || undefined
      };
    },
    timeout: 300000 // 5 minutes for recursive compilation
  },

  {
    name: 'field-arithmetic-intensive-zkprogram',
    type: 'compilation',
    testFn: async (backend) => {
      const o1js = await import('../../../../index.js');
      const { ZkProgram, Field, Provable } = o1js;
      
      const ArithmeticProgram = ZkProgram({
        name: 'arithmetic-intensive',
        publicInput: Field,
        
        methods: {
          heavyArithmetic: {
            privateInputs: [Field, Field],
            method(publicInput: any, a: any, b: any) {
              // Generate many constraints through witness variables and arithmetic
              let result = publicInput;
              
              for (let i = 0; i < 5; i++) {
                // Create witness variables in each iteration
                const witnessA = Provable.witness(Field, () => Field(i + 1));
                const witnessB = Provable.witness(Field, () => Field(i * 2 + 3));
                
                // Add constraint checks
                witnessA.assertGreaterThan(Field(0));
                witnessB.assertLessThan(Field(20));
                
                // Complex arithmetic with witnesses
                const temp = a.mul(b).add(witnessA).sub(witnessB);
                result = result.add(temp).mul(Field(2));
              }
              return result;
            }
          },
          
          constraintIntensive: {
            privateInputs: [Field, Field, Field],
            method(publicInput: any, x: any, y: any, z: any) {
              // Multiple witness variables with different constraints
              const w1 = Provable.witness(Field, () => Field(11));
              const w2 = Provable.witness(Field, () => Field(22));
              const w3 = Provable.witness(Field, () => Field(33));
              
              // Range constraints
              w1.assertGreaterThan(Field(10));
              w1.assertLessThan(Field(20));
              w2.assertGreaterThan(w1);
              w3.assertGreaterThan(w2);
              
              // Equality constraints
              const sum1 = x.add(y);
              const sum2 = w1.add(w2);
              sum1.assertEquals(sum2.sub(z));
              
              // Multiplication constraints
              const prod1 = x.mul(y).mul(z);
              const prod2 = w1.mul(w2).mul(w3);
              
              return publicInput.add(prod1).sub(prod2);
            }
          }
        }
      });
      
      const startTime = Date.now();
      let compilationSuccess = true;
      let errorMessage = '';
      let constraintCount = 0;
      
      try {
        await ArithmeticProgram.compile();
        // Try to extract constraint count if available
        if (ArithmeticProgram.analyzeMethods) {
          const analysis = await ArithmeticProgram.analyzeMethods();
          // Sum up constraints from all methods
          constraintCount = Object.values(analysis).reduce((sum, method: any) => {
            return sum + (method.rows || 0);
          }, 0);
        }
      } catch (error) {
        compilationSuccess = false;
        errorMessage = (error as Error).message;
      }
      const endTime = Date.now();
      
      return {
        backend,
        programName: 'ArithmeticProgram',
        verificationKeyExists: false, // ZkProgram doesn't have direct verificationKey property
        verificationKeyHash: 'unavailable', // Would need to compile first
        methodCount: Object.keys((ArithmeticProgram as any)._methods || ArithmeticProgram.rawMethods || {}).length,
        compilationTime: endTime - startTime,
        constraintCount,
        success: compilationSuccess,
        error: errorMessage || undefined
      };
    },
    timeout: 180000 // 3 minutes
  }
];

export default { tests };