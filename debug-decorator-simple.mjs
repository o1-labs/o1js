/**
 * Simple debug script to test @method decorator processing
 * Run with: node debug-decorator-simple.mjs
 */

import { SmartContract, State, state, Field, method, Mina, switchBackend } from './dist/node/index.js';

console.log('🔍 DECORATOR DEBUG TEST - Testing @method decorator processing');

// Test class with @method decorators
class TestContract extends SmartContract {
  @state(Field) value = State();
  
  init() {
    super.init();
    this.value.set(Field(0));
  }
  
  @method async increment() {
    const current = this.value.getAndRequireEquals();
    const newValue = current.add(Field(1));
    this.value.set(newValue);
  }
}

// Test function for backend compilation
async function testBackend(backendName) {
  console.log(`\n=== Testing ${backendName.toUpperCase()} Backend ===`);
  
  try {
    // Switch backend
    console.log(`🔄 Switching to ${backendName} backend...`);
    await switchBackend(backendName);
    
    // Setup LocalBlockchain
    console.log('🏗️  Setting up LocalBlockchain...');
    const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    
    // Check method registration
    console.log('🔍 Checking method registration...');
    console.log('  TestContract._methods:', TestContract._methods);
    console.log('  TestContract._provers:', TestContract._provers);
    
    // Attempt compilation
    console.log('🔨 Attempting compilation...');
    const startTime = Date.now();
    
    const result = await TestContract.compile();
    
    const endTime = Date.now();
    console.log(`✅ ${backendName} compilation SUCCESS in ${endTime - startTime}ms`);
    console.log(`🔑 Verification key: ${result.verificationKey ? 'EXISTS' : 'MISSING'}`);
    console.log(`📊 Provers: ${Object.keys(result.provers || {}).length}`);
    console.log(`📋 Methods: ${Object.keys(result.provers || {}).join(', ')}`);
    
    return { success: true, result };
    
  } catch (error) {
    console.log(`❌ ${backendName} compilation FAILED`);
    console.error(`💥 Error: ${error.message}`);
    console.error(`📍 Stack: ${error.stack?.split('\n').slice(0, 10).join('\n')}`);
    return { success: false, error: error.message };
  }
}

// Run tests
async function runTests() {
  console.log('Starting decorator debug tests...\n');
  
  // Test both backends
  const snarkyResult = await testBackend('snarky');
  const sparkyResult = await testBackend('sparky');
  
  console.log('\n=== RESULTS SUMMARY ===');
  console.log(`Snarky: ${snarkyResult.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Sparky: ${sparkyResult.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (snarkyResult.success && !sparkyResult.success) {
    console.log('\n🎯 CONCLUSION: Sparky backend has issues with @method decorator processing');
    console.log('❌ Sparky error:', sparkyResult.error);
  } else if (!snarkyResult.success && sparkyResult.success) {
    console.log('\n🎯 CONCLUSION: Snarky backend has issues with @method decorator processing');
    console.log('❌ Snarky error:', snarkyResult.error);
  } else if (!snarkyResult.success && !sparkyResult.success) {
    console.log('\n🎯 CONCLUSION: Both backends have compilation issues');
    console.log('❌ Snarky error:', snarkyResult.error);
    console.log('❌ Sparky error:', sparkyResult.error);
  } else {
    console.log('\n🎯 CONCLUSION: Both backends compile successfully');
    console.log('✅ @method decorator processing works on both backends');
  }
}

runTests().catch(console.error);