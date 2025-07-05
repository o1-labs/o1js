/**
 * Direct test of Poseidon with Sparky backend to see if MLArray issue is resolved
 */

import { Field, Poseidon, switchBackend } from './dist/node/index.js';

async function testPoseidon() {
  console.log('🔍 Testing Poseidon directly...');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log('✅ Switched to Sparky backend');
  
  try {
    // Create some Field objects
    const field1 = new Field(1);
    const field2 = new Field(2);
    const field3 = new Field(3);
    
    console.log('📋 Field objects created');
    console.log('field1.value:', field1.value);
    console.log('field2.value:', field2.value);
    console.log('field3.value:', field3.value);
    
    // Try to hash them with Poseidon
    console.log('\n🔧 Attempting Poseidon.hash...');
    const hash = Poseidon.hash([field1, field2, field3]);
    
    console.log('✅ Poseidon hash successful!');
    console.log('Hash value:', hash.value);
    
  } catch (error) {
    console.log('❌ Poseidon failed:', error.message);
    console.log('Error type:', error.constructor.name);
    console.log('Error stack:', error.stack);
  }
}

testPoseidon().catch(console.error);