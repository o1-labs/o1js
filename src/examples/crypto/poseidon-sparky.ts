/**
 * Test to verify poseidon.update works properly with Sparky backend
 */

import { Field, Poseidon, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testPoseidonUpdate() {
  console.log('🔍 Testing Poseidon.update with different backends...');
  
  // Test data
  const state: [Field, Field, Field] = [Field(1), Field(2), Field(3)];
  const input = [Field(10), Field(20), Field(30)];
  
  // Initialize with Snarky first
  await initializeBindings();
  console.log('Current backend:', getCurrentBackend());
  
  console.log('\n🔨 Testing Poseidon.update with Snarky backend...');
  try {
    const snarkyResult = Poseidon.update(state, input);
    console.log('✅ Snarky Poseidon.update result:', snarkyResult.map(f => f.toString()));
    
    // Test basic hash as well
    const snarkyHash = Poseidon.hash(input);
    console.log('✅ Snarky Poseidon.hash result:', snarkyHash.toString());
    
    console.log('\n🔨 Testing Poseidon.update with Sparky backend...');
    await switchBackend('sparky');
    console.log('Current backend:', getCurrentBackend());
    
    const sparkyResult = Poseidon.update(state, input);
    console.log('✅ Sparky Poseidon.update result:', sparkyResult.map(f => f.toString()));
    
    // Test basic hash as well
    const sparkyHash = Poseidon.hash(input);
    console.log('✅ Sparky Poseidon.hash result:', sparkyHash.toString());
    
    // Compare results
    const updateMatches = snarkyResult.every((field, i) => 
      field.toString() === sparkyResult[i].toString()
    );
    const hashMatches = snarkyHash.toString() === sparkyHash.toString();
    
    console.log('\n📊 Comparison Results:');
    console.log('  Poseidon.update matches:', updateMatches ? '✅' : '❌');
    console.log('  Poseidon.hash matches:', hashMatches ? '✅' : '❌');
    
    if (updateMatches && hashMatches) {
      console.log('\n🎉 SUCCESS: Poseidon.update works correctly with Sparky backend!');
    } else {
      console.log('\n❌ FAILURE: Results don\'t match between backends');
      console.log('Snarky update:', snarkyResult.map(f => f.toString()));
      console.log('Sparky update:', sparkyResult.map(f => f.toString()));
      console.log('Snarky hash:', snarkyHash.toString());
      console.log('Sparky hash:', sparkyHash.toString());
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    
    if (error.message.includes('poseidon.update')) {
      console.log('\n📋 Diagnosis: Missing poseidon.update implementation in Sparky');
    } else if (error.message.includes('bindings not available')) {
      console.log('\n📋 Diagnosis: Sparky bindings are not properly loaded');
    }
  }
}

testPoseidonUpdate().catch(console.error);