/**
 * Debug script to test @method decorator processing between Snarky and Sparky backends
 * 
 * This script specifically tests:
 * 1. @method decorator metadata generation
 * 2. Method registration with SmartContract system
 * 3. Compilation differences between backends
 */

import { SmartContract, State, state, Field, method, Mina } from './dist/node/index.js';

console.log('🔍 DECORATOR DEBUG TEST - Testing @method decorator processing');

// Test 1: Basic decorator metadata inspection
console.log('\n=== TEST 1: Decorator Metadata Inspection ===');

class TestContract extends SmartContract {
  @state(Field) value = State();
  
  init() {
    super.init();
    this.value.set(Field(0));
  }
  
  @method async increment() {
    console.log('📋 Method increment() called');
    const current = this.value.getAndRequireEquals();
    const newValue = current.add(Field(1));
    this.value.set(newValue);
  }
  
  @method async setValue(newValue: Field) {
    console.log('📋 Method setValue() called');
    this.value.set(newValue);
  }
}

// Inspect the class metadata
console.log('🔍 TestContract prototype:', Object.getOwnPropertyNames(TestContract.prototype));
console.log('🔍 TestContract methods:', Object.getOwnPropertyNames(TestContract.prototype).filter(name => name !== 'constructor'));

// Check if decorator metadata is available
if (Reflect && Reflect.getMetadata) {
  console.log('🔍 Decorator metadata available via Reflect.getMetadata');
  
  // Check for method metadata
  const methodNames = ['increment', 'setValue'];
  for (const methodName of methodNames) {
    const methodMetadata = Reflect.getMetadata('design:type', TestContract.prototype, methodName);
    console.log(`🔍 ${methodName} metadata:`, methodMetadata);
  }
} else {
  console.log('⚠️  Reflect.getMetadata not available - decorator metadata might not be accessible');
}

// Test 2: Method registration inspection
console.log('\n=== TEST 2: Method Registration Inspection ===');

// Check if methods are registered in the SmartContract system
console.log('🔍 TestContract._methods:', (TestContract as any)._methods);
console.log('🔍 TestContract._methodsRegistry:', (TestContract as any)._methodsRegistry);

// Test 3: Backend-specific compilation
async function testBackendCompilation(backendName: string) {
  console.log(`\n=== TEST 3: ${backendName.toUpperCase()} Backend Compilation ===`);
  
  try {
    // Switch to the specified backend
    if (backendName === 'sparky') {
      console.log('🔄 Switching to Sparky backend...');
      const { switchBackend } = await import('./dist/node/index.js');
      await switchBackend('sparky');
    } else {
      console.log('🔄 Switching to Snarky backend...');
      const { switchBackend } = await import('./dist/node/index.js');
      await switchBackend('snarky');
    }
    
    // Set up LocalBlockchain
    console.log('🏗️  Setting up LocalBlockchain...');
    const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    
    // Attempt compilation
    console.log('🔨 Starting TestContract compilation...');
    const startTime = Date.now();
    
    const compilationResult = await TestContract.compile();
    
    const endTime = Date.now();
    const compilationTime = endTime - startTime;
    
    console.log(`✅ ${backendName} compilation SUCCESSFUL`);
    console.log(`⏱️  Compilation time: ${compilationTime}ms`);
    console.log(`🔑 Verification key exists: ${!!compilationResult.verificationKey}`);
    console.log(`🔑 Verification key hash: ${compilationResult.verificationKey?.hash || 'missing'}`);
    console.log(`📊 Method count: ${Object.keys(compilationResult.provers || {}).length}`);
    console.log(`📋 Prover methods: ${Object.keys(compilationResult.provers || {}).join(', ')}`);
    
    return {
      success: true,
      compilationTime,
      verificationKeyExists: !!compilationResult.verificationKey,
      verificationKeyHash: compilationResult.verificationKey?.hash || 'missing',
      methodCount: Object.keys(compilationResult.provers || {}).length,
      proverMethods: Object.keys(compilationResult.provers || {})
    };
    
  } catch (error) {
    console.log(`❌ ${backendName} compilation FAILED`);
    console.error(`💥 Error: ${error.message}`);
    console.error(`📍 Stack: ${error.stack}`);
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Test 4: Compare backends
async function runComparisonTest() {
  console.log('\n=== TEST 4: Backend Comparison ===');
  
  const snarkyResult = await testBackendCompilation('snarky');
  const sparkyResult = await testBackendCompilation('sparky');
  
  console.log('\n📊 COMPARISON RESULTS:');
  console.log('Snarky Result:', JSON.stringify(snarkyResult, null, 2));
  console.log('Sparky Result:', JSON.stringify(sparkyResult, null, 2));
  
  if (snarkyResult.success && sparkyResult.success) {
    console.log('✅ Both backends compiled successfully');
    
    // Compare verification keys
    if (snarkyResult.verificationKeyHash === sparkyResult.verificationKeyHash) {
      console.log('✅ Verification keys match');
    } else {
      console.log('❌ Verification keys differ');
      console.log(`  Snarky: ${snarkyResult.verificationKeyHash}`);
      console.log(`  Sparky: ${sparkyResult.verificationKeyHash}`);
    }
    
    // Compare method counts
    if (snarkyResult.methodCount === sparkyResult.methodCount) {
      console.log('✅ Method counts match');
    } else {
      console.log('❌ Method counts differ');
      console.log(`  Snarky: ${snarkyResult.methodCount}`);
      console.log(`  Sparky: ${sparkyResult.methodCount}`);
    }
    
  } else {
    console.log('❌ One or both backends failed to compile');
    
    if (!snarkyResult.success) {
      console.log('❌ Snarky compilation failed:', snarkyResult.error);
    }
    
    if (!sparkyResult.success) {
      console.log('❌ Sparky compilation failed:', sparkyResult.error);
    }
  }
}

// Run all tests
async function runAllTests() {
  try {
    await runComparisonTest();
  } catch (error) {
    console.error('💥 Test execution failed:', error);
  }
}

// Execute tests
runAllTests().then(() => {
  console.log('\n🎯 DECORATOR DEBUG TEST COMPLETE');
}).catch(error => {
  console.error('💥 Test suite failed:', error);
});