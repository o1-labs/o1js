/**
 * Test retrieval of FULL Sparky constraint system for VK enhancement
 */

import { Field, ZkProgram, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testFullConstraintSystem() {
  console.log('🔍 Testing FULL Sparky Constraint System Retrieval\n');
  
  await initializeBindings();
  
  // Enhanced bridge that captures complete constraint data
  const constraintData = [];
  globalThis.sparkyConstraintBridge = {
    isActiveSparkyBackend: () => true,
    addConstraint: (constraint) => {
      constraintData.push(constraint);
      console.log('📥 Constraint captured:', JSON.stringify(constraint, null, 2));
    },
    getAccumulatedConstraints: () => {
      console.log('📊 Returning accumulated constraints:', constraintData.length);
      return constraintData;
    },
    getFullConstraintSystem: () => {
      // Simulate full constraint system with metadata
      return {
        constraints: constraintData,
        metadata: {
          constraintCount: constraintData.length,
          circuitInfo: 'TestCircuit',
          backend: 'sparky',
          timestamp: Date.now()
        }
      };
    },
    startConstraintAccumulation: () => {
      constraintData.length = 0; // Clear previous
      console.log('🔄 Started fresh constraint accumulation');
    },
    endConstraintAccumulation: () => {
      console.log('🔚 Ended constraint accumulation, total:', constraintData.length);
    }
  };
  
  const TestCircuit = ZkProgram({
    name: 'FullConstraintTest',
    publicInput: Field,
    methods: {
      multipleOps: {
        privateInputs: [Field, Field],
        async method(publicInput, private1, private2) {
          // Multiple constraint operations
          publicInput.assertEquals(private1);
          private1.assertEquals(private2);
          const sum = private1.add(private2);
          sum.assertEquals(publicInput.mul(Field(2)));
        }
      }
    }
  });
  
  console.log('🔄 Switching to Sparky and compiling with multiple constraints...');
  await switchBackend('sparky');
  
  try {
    await TestCircuit.compile();
    
    console.log('\n📋 CONSTRAINT SYSTEM ANALYSIS:');
    console.log('===============================');
    
    const fullSystem = globalThis.sparkyConstraintBridge.getFullConstraintSystem();
    console.log('Full constraint system:', JSON.stringify(fullSystem, null, 2));
    
    console.log('\n🎯 This data will be used to enhance Pickles VK generation!');
    
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
  }
}

testFullConstraintSystem().catch(console.error);