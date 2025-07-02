/**
 * Test real backend switching with o1js
 */

import { switchBackend, getCurrentBackend, Field } from './dist/node/index.js';

async function testRealBackendSwitching() {
  console.log('🧪 Testing Real Backend Switching with o1js:');
  console.log('============================================');
  
  try {
    console.log('Initial backend:', getCurrentBackend());
    
    // Test simple field operation with Snarky
    console.log('\n📊 Testing Field operations with Snarky:');
    const field1 = Field(5);
    const field2 = Field(3);
    const snarkyResult = field1.add(field2);
    console.log(`  Snarky: Field(5) + Field(3) = ${snarkyResult.toString()}`);
    
    console.log('\n📡 Attempting to switch to Sparky...');
    await switchBackend('sparky');
    console.log('✅ Switch completed. Current backend:', getCurrentBackend());
    
    // Test same operation with Sparky
    console.log('\n📊 Testing Field operations with Sparky:');
    const field3 = Field(5);
    const field4 = Field(3);
    const sparkyResult = field3.add(field4);
    console.log(`  Sparky: Field(5) + Field(3) = ${sparkyResult.toString()}`);
    
    // Compare results
    console.log('\n🔍 Comparing Results:');
    console.log(`  Snarky result: ${snarkyResult.toString()}`);
    console.log(`  Sparky result: ${sparkyResult.toString()}`);
    console.log(`  Results match: ${snarkyResult.toString() === sparkyResult.toString() ? '✅' : '❌'}`);
    
    console.log('\n📡 Switching back to Snarky...');
    await switchBackend('snarky');
    console.log('✅ Switch completed. Current backend:', getCurrentBackend());
    
    console.log('\n🎉 Real backend switching test: COMPLETED');
    
  } catch (error) {
    console.error('\n❌ Real backend switching test: FAILED');
    console.error('Error:', error.message);
    console.error('Type:', error.constructor.name);
    
    // Show more details for debugging
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack.split('\n').slice(0, 10).join('\n'));
    }
  }
}

async function testConstraintSystemCapture() {
  console.log('\n🔬 Testing Constraint System Capture:');
  console.log('====================================');
  
  try {
    // Test constraint capture with Snarky
    console.log('Testing constraint capture with Snarky...');
    await switchBackend('snarky');
    
    const { Field, ZkProgram } = await import('./dist/node/index.js');
    
    const SimpleProgram = ZkProgram({
      name: 'SimpleProgram',
      publicInput: Field,
      methods: {
        addOne: {
          privateInputs: [],
          async method(x) {
            return x.add(Field(1));
          }
        }
      }
    });
    
    console.log('Compiling with Snarky...');
    const { verificationKey: snarkyVK } = await SimpleProgram.compile();
    console.log(`  Snarky VK hash: ${snarkyVK.hash()}`);
    
    // Test constraint capture with Sparky
    console.log('\nTesting constraint capture with Sparky...');
    await switchBackend('sparky');
    
    console.log('Compiling with Sparky...');
    const { verificationKey: sparkyVK } = await SimpleProgram.compile();
    console.log(`  Sparky VK hash: ${sparkyVK.hash()}`);
    
    // Compare VKs
    console.log('\n🔍 VK Comparison:');
    console.log(`  Snarky VK: ${snarkyVK.hash()}`);
    console.log(`  Sparky VK: ${sparkyVK.hash()}`);
    console.log(`  VK Parity: ${snarkyVK.hash() === sparkyVK.hash() ? '✅ MATCH' : '❌ DIFFERENT'}`);
    
  } catch (error) {
    console.error('\n❌ Constraint system capture test: FAILED');
    console.error('Error:', error.message);
    console.error('Type:', error.constructor.name);
  }
}

// Run the tests
testRealBackendSwitching()
  .then(() => testConstraintSystemCapture())
  .catch(console.error);