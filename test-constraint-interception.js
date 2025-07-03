/**
 * Simple test to validate constraint interception at snarky_bindings layer
 */

import { Field, ZkProgram, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testConstraintInterception() {
  console.log('🧪 Testing Constraint Interception at snarky_bindings Layer\n');
  
  await initializeBindings();
  
  // Simple circuit that generates equality constraints
  const SimpleCircuit = ZkProgram({
    name: 'SimpleCircuit',
    publicInput: Field,
    methods: {
      multiply: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          const result = publicInput.mul(privateInput);
          result.assertEquals(publicInput.mul(privateInput)); // This should be intercepted
        }
      }
    }
  });
  
  console.log('🔄 Testing with Snarky backend...');
  await switchBackend('snarky');
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  try {
    console.log('Compiling SimpleCircuit with Snarky...');
    await SimpleCircuit.compile();
    const snarkyVk = SimpleCircuit.verificationKey();
    console.log(`✅ Snarky VK generated: ${snarkyVk?.hash.slice(0, 16)}...`);
  } catch (error) {
    console.log(`❌ Snarky compilation failed: ${error.message}`);
  }
  
  console.log('\n🔄 Testing with Sparky backend...');
  await switchBackend('sparky');
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  try {
    console.log('Compiling SimpleCircuit with Sparky...');
    await SimpleCircuit.compile();
    const sparkyVk = SimpleCircuit.verificationKey();
    console.log(`✅ Sparky VK generated: ${sparkyVk?.hash.slice(0, 16)}...`);
    
    // Check if constraint interception logged any messages
    console.log('\n🎯 If constraint interception worked, you should see:');
    console.log('   - No constraint generation calls to Snarky during Sparky execution');
    console.log('   - Constraints routed to sparkyConstraintBridge.addConstraint()');
    
  } catch (error) {
    console.log(`❌ Sparky compilation failed: ${error.message}`);
  }
}

testConstraintInterception().catch(console.error);