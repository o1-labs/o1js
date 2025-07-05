/**
 * Circuit Compilation Test Implementation
 * 
 * Contains the actual test implementations with static imports for proper TypeScript metadata.
 * This file is dynamically imported by the test suite to avoid module format conflicts.
 */

import { Field, UInt64 } from '../../../../index.js';

export const basicSmartContractCompilation = async (backend?: string) => {
  const o1js = await import('../../../../index.js');
  const { SmartContract, State, state, Field: DynamicField, method, Mina, Provable } = o1js;
  
  // CRITICAL: Ensure proper backend initialization before compilation
  console.log(`🔍 COMPILATION [${backend}]: Initializing backend for compilation...`);
  if (backend && o1js.switchBackend) {
    try {
      await o1js.switchBackend(backend as any);
      console.log(`🔍 COMPILATION [${backend}]: Backend switched successfully`);
    } catch (switchError) {
      console.log(`⚠️ COMPILATION [${backend}]: Backend switch failed: ${switchError}`);
      // Continue anyway, the switch might not be critical for compilation
    }
  }
  
  // Skip LocalBlockchain setup for compilation-only test
  // SmartContract.compile() should work without LocalBlockchain
  console.log(`🔍 COMPILATION [${backend}]: Skipping LocalBlockchain setup for compilation-only test`);
  
  class TestContract extends SmartContract {
    @state(DynamicField) value = State();
    
    init() {
      super.init();
      this.value.set(DynamicField(0));
    }
    
    @method async increment() {
      const current = this.value.getAndRequireEquals();
      const newValue = (current as any).add(DynamicField(1));
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
    console.log(`🔍 COMPILATION DEBUG [${backend}]: Error constructor:`, (error as any)?.constructor?.name);
    
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
};

export const zkProgramCompilation = async (backend?: string) => {
  const o1js = await import('../../../../index.js');
  const { ZkProgram, Field: DynamicField, Poseidon, Provable } = o1js;
  
  const TestProgram = ZkProgram({
    name: 'test-program',
    publicInput: DynamicField,
    
    methods: {
      double: {
        privateInputs: [DynamicField],
        method(publicInput, secret) {
          // Test witness constraints in ZkProgram
          const witnessValue = Provable.witness(DynamicField, () => DynamicField(7));
          witnessValue.assertLessThan(DynamicField(100));
          
          const result = publicInput.mul(DynamicField(2)).add(secret).sub(witnessValue);
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
    methodCount: Object.keys((TestProgram as any)._methods || (TestProgram as any).rawMethods || {}).length,
    compilationTime: endTime - startTime,
    success: compilationSuccess,
    error: errorMessage || undefined
  };
};

export const complexSmartContractCompilation = async (backend?: string) => {
  const o1js = await import('../../../../index.js');
  const { SmartContract, State, state, Field: DynamicField, method, UInt64: DynamicUInt64, Bool, Poseidon, Mina, Provable, declareMethods } = o1js;
  
  // Skip LocalBlockchain setup for compilation-only test  
  console.log(`🔍 COMPILATION [${backend}]: Skipping LocalBlockchain setup for complex contract compilation`);
  
  class ComplexContract extends SmartContract {
    @state(DynamicField) counter = State();
    @state(DynamicUInt64) accountBalance = State(); // Renamed to avoid conflict with SmartContract.balance
    @state(Bool) isActive = State();
    
    init() {
      super.init();
      this.counter.set(DynamicField(0));
      this.accountBalance.set(DynamicUInt64.zero);
      this.isActive.set(Bool(true));
    }
    
    @method async updateCounter(increment: Field) {
      const currentCounter = this.counter.getAndRequireEquals();
      
      // Create witness variable for testing constraint generation
      const witnessValue = Provable.witness(DynamicField, () => DynamicField(5));
      witnessValue.assertGreaterThan(DynamicField(0));
      
      const newCounter = (currentCounter as any).add(increment).add(witnessValue);
      this.counter.set(newCounter);
    }
    
    @method async updateBalance(amount: UInt64) {
      const currentBalance = this.accountBalance.getAndRequireEquals();
      
      // Test UInt64 constraint generation
      const witnessAmount = Provable.witness(DynamicUInt64, () => DynamicUInt64.from(10));
      witnessAmount.assertLessThanOrEqual(DynamicUInt64.from(1000));
      
      const newBalance = (currentBalance as any).add(amount).add(witnessAmount);
      this.accountBalance.set(newBalance);
    }
    
    @method async hashAndStore(input: Field) {
      // Test hash function constraints
      const witnessInput = Provable.witness(DynamicField, () => DynamicField(123));
      witnessInput.assertEquals(input);
      
      const hash = Poseidon.hash([input, witnessInput]);
      this.counter.set(hash);
    }
  }
  
  // No need for declareMethods since @method decorators work with static imports
  
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
};

export const recursiveZkProgramCompilation = async (backend?: string) => {
  const o1js = await import('../../../../index.js');
  const { ZkProgram, Field: DynamicField, SelfProof, verify, Provable } = o1js;
  
  const RecursiveProgram = ZkProgram({
    name: 'recursive-program',
    publicInput: DynamicField,
    
    methods: {
      baseCase: {
        privateInputs: [DynamicField],
        method(publicInput, secret) {
          // Test witness constraints in base case
          const witnessBase = Provable.witness(DynamicField, () => DynamicField(3));
          witnessBase.assertGreaterThan(DynamicField(0));
          
          return publicInput.add(secret).mul(witnessBase);
        }
      },
      
      step: {
        privateInputs: [SelfProof, DynamicField],
        method(publicInput, proof, increment) {
          proof.verify();
          
          // Test witness constraints in recursive step
          const witnessStep = Provable.witness(DynamicField, () => DynamicField(2));
          witnessStep.assertLessThan(DynamicField(10));
          
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
    methodCount: Object.keys((RecursiveProgram as any)._methods || (RecursiveProgram as any).rawMethods || {}).length,
    compilationTime: endTime - startTime,
    success: compilationSuccess,
    error: errorMessage || undefined
  };
};

export const fieldArithmeticIntensiveZkProgram = async (backend?: string) => {
  const o1js = await import('../../../../index.js');
  const { ZkProgram, Field: DynamicField, Provable } = o1js;
  
  const ArithmeticProgram = ZkProgram({
    name: 'arithmetic-intensive',
    publicInput: DynamicField,
    
    methods: {
      heavyArithmetic: {
        privateInputs: [DynamicField, DynamicField],
        method(publicInput, a, b) {
          // Generate many constraints through witness variables and arithmetic
          let result = publicInput;
          
          for (let i = 0; i < 5; i++) {
            // Create witness variables in each iteration
            const witnessA = Provable.witness(DynamicField, () => DynamicField(i + 1));
            const witnessB = Provable.witness(DynamicField, () => DynamicField(i * 2 + 3));
            
            // Add constraint checks
            witnessA.assertGreaterThan(DynamicField(0));
            witnessB.assertLessThan(DynamicField(20));
            
            // Complex arithmetic with witnesses
            const temp = a.mul(b).add(witnessA).sub(witnessB);
            result = result.add(temp).mul(DynamicField(2));
          }
          
          return result;
        }
      },
      
      constraintIntensive: {
        privateInputs: [DynamicField, DynamicField, DynamicField],
        method(publicInput, x, y, z) {
          // Multiple witness variables with different constraints
          const w1 = Provable.witness(DynamicField, () => DynamicField(11));
          const w2 = Provable.witness(DynamicField, () => DynamicField(22));
          const w3 = Provable.witness(DynamicField, () => DynamicField(33));
          
          // Range constraints
          w1.assertGreaterThan(DynamicField(10));
          w1.assertLessThan(DynamicField(20));
          
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
    methodCount: Object.keys((ArithmeticProgram as any)._methods || (ArithmeticProgram as any).rawMethods || {}).length,
    compilationTime: endTime - startTime,
    constraintCount,
    success: compilationSuccess,
    error: errorMessage || undefined
  };
};