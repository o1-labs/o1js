/**
 * Debug the constraint loop bridge calls
 */

import { Field, ZkProgram, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function debugConstraintLoop() {
  console.log('🔍 Debugging Constraint Loop Bridge Calls\n');
  
  await initializeBindings();
  
  // Ultra-detailed mock bridge
  globalThis.sparkyConstraintBridge = {
    isActiveSparkyBackend: () => {
      console.log('🔍 Bridge: isActiveSparkyBackend called - returning true');
      return true;
    },
    addConstraint: (constraint) => {
      console.log('🎯 Bridge: addConstraint called!', constraint);
    },
    getLastProcessedConstraint: () => {
      console.log('📤 Bridge: getLastProcessedConstraint called!');
      return { processed: true, type: 'equal' };
    },
    startConstraintAccumulation: () => {
      console.log('📝 Bridge: startConstraintAccumulation called');
    },
    endConstraintAccumulation: () => {
      console.log('📝 Bridge: endConstraintAccumulation called');
    }
  };
  
  // Test direct bridge access
  console.log('🧪 Testing direct bridge access:');
  console.log('   isActiveSparkyBackend():', globalThis.sparkyConstraintBridge.isActiveSparkyBackend());
  
  // Test that it exists globally
  console.log('   Bridge exists:', !!globalThis.sparkyConstraintBridge);
  
  const TestCircuit = ZkProgram({
    name: 'DebugLoop',
    publicInput: Field,
    methods: {
      equal: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          console.log('🔬 Inside circuit - about to call assertEquals');
          publicInput.assertEquals(privateInput);
          console.log('🔬 Inside circuit - assertEquals completed');
        }
      }
    }
  });
  
  console.log('\n🔄 Switching to Sparky and compiling...');
  await switchBackend('sparky');
  
  try {
    await TestCircuit.compile();
    console.log('✅ Compilation completed');
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
  }
  
  console.log('\n🎯 Analysis: If no bridge calls appear above,');
  console.log('   then constraints are NOT reaching our snarky_bindings layer');
}

debugConstraintLoop().catch(console.error);