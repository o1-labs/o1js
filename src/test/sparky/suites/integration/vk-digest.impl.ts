/**
 * VK Digest Test Implementation
 * 
 * Contains the actual test implementations with static imports for proper TypeScript metadata.
 * This file is dynamically imported by the test suite to avoid module format conflicts.
 */

import { Field } from '../../../../index.js';

export const simpleFieldAdditionDigest = async (backend: string) => {
  const o1js = await import('../../../../index.js');
  const { ZkProgram, Field: DynamicField, Provable } = o1js;
  
  // Create a simple ZkProgram with field addition
  const SimpleProgram = ZkProgram({
    name: 'simple-addition',
    publicInput: DynamicField,
    
    methods: {
      add: {
        privateInputs: [DynamicField],
        method(publicInput, privateInput) {
          const sum = publicInput.add(privateInput);
          sum.assertEquals(DynamicField(10)); // Simple constraint
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
};

export const smartContractDigest = async (backend: string) => {
  const o1js = await import('../../../../index.js');
  const { SmartContract, State, state, Field: DynamicField, method, Mina } = o1js;
  
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
    @state(DynamicField) value = State();
    
    init() {
      super.init();
      this.value.set(DynamicField(0));
    }
    
    @method async updateValue(newValue: Field) {
      const current = this.value.getAndRequireEquals();
      // newValue is already a Field instance, don't wrap it again
      const sum = (current as any).add(newValue);
      sum.assertEquals(DynamicField(10)); // Simple constraint
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
    verificationKeyHash,
    compilationSuccess,
    error: errorMessage || undefined
  };
};

// Export all other test implementations...
export const fieldMultiplicationDigest = async (backend: string) => {
  const o1js = await import('../../../../index.js');
  const { ZkProgram, Field: DynamicField, Provable } = o1js;
  
  // Create a slightly more complex program with multiplication
  const MultiplyProgram = ZkProgram({
    name: 'field-multiply',
    publicInput: DynamicField,
    
    methods: {
      multiply: {
        privateInputs: [DynamicField, DynamicField],
        method(publicInput, a, b) {
          const product = a.mul(b);
          const result = publicInput.add(product);
          result.assertGreaterThan(DynamicField(0)); // Range constraint
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
};

export const witnessConstraintDigest = async (backend: string) => {
  const o1js = await import('../../../../index.js');
  const { ZkProgram, Field: DynamicField, Provable } = o1js;
  
  // Create a program with witness constraints
  const WitnessProgram = ZkProgram({
    name: 'witness-test',
    publicInput: DynamicField,
    
    methods: {
      witnessTest: {
        privateInputs: [DynamicField],
        method(publicInput, secret) {
          // Create witness variable
          const witnessValue = Provable.witness(DynamicField, () => DynamicField(42));
          
          // Add constraints on witness
          witnessValue.assertGreaterThan(DynamicField(40));
          witnessValue.assertLessThan(DynamicField(50));
          
          // Use witness in computation
          const result = publicInput.mul(secret).add(witnessValue);
          result.assertEquals(DynamicField(100)); // Final constraint
          
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
};