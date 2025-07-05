#!/usr/bin/env node

/**
 * Simple debug script for SmartContract compilation issues
 * Created: January 5, 2025 05:35 UTC
 * 
 * This script mimics the actual compilation test implementation to debug compilation failures.
 */

// Test basic SmartContract compilation
async function testBasicSmartContractCompilation(backend) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing Basic SmartContract Compilation with ${backend.toUpperCase()}`);
  console.log(`${'='.repeat(80)}`);
  
  try {
    // Dynamic import like the real tests
    console.log(`\n1. Dynamically importing o1js...`);
    const o1js = await import('./dist/node/index.js');
    console.log('   ✅ o1js imported successfully');
    
    // Extract the classes we need
    const { SmartContract, State, state, Field: DynamicField, method, Mina, switchBackend, getCurrentBackend } = o1js;
    
    // Switch backend if needed
    console.log(`\n2. Switching to ${backend} backend...`);
    if (switchBackend) {
      await switchBackend(backend);
      const currentBackend = getCurrentBackend();
      console.log(`   Current backend: ${currentBackend}`);
      if (currentBackend !== backend) {
        throw new Error(`Backend switch failed! Expected ${backend}, got ${currentBackend}`);
      }
      console.log('   ✅ Backend switch successful');
    } else {
      console.log('   ⚠️  switchBackend not available, using default backend');
    }
    
    // Define SmartContract using the same pattern as the real tests
    console.log(`\n3. Defining SmartContract class...`);
    
    // Create a simple contract without decorators first
    class TestContract extends SmartContract {
      constructor(address) {
        super(address);
        this.value = State();
      }
      
      init() {
        super.init();
        this.value.set(DynamicField(0));
      }
      
      async increment() {
        const current = this.value.getAndRequireEquals();
        const newValue = current.add(DynamicField(1));
        this.value.set(newValue);
      }
      
      async multiply(x, y) {
        const result = x.mul(y);
        this.value.set(result);
      }
    }
    
    // Apply decorators manually in the JavaScript way
    TestContract.prototype.value = state(DynamicField);
    
    // Debug: Check what the methods are before decorating
    console.log('   increment method before decoration:', typeof TestContract.prototype.increment);
    console.log('   multiply method before decoration:', typeof TestContract.prototype.multiply);
    
    // Store references to the methods
    const incrementMethod = TestContract.prototype.increment;
    const multiplyMethod = TestContract.prototype.multiply;
    
    console.log('   incrementMethod:', typeof incrementMethod);
    console.log('   multiplyMethod:', typeof multiplyMethod);
    
    if (typeof incrementMethod === 'function') {
      TestContract.prototype.increment = method(incrementMethod);
    } else {
      console.log('   ❌ increment method is not a function, skipping @method decorator');
    }
    
    if (typeof multiplyMethod === 'function') {
      TestContract.prototype.multiply = method(multiplyMethod);
    } else {
      console.log('   ❌ multiply method is not a function, skipping @method decorator');
    }
    
    console.log('   ✅ SmartContract class defined');
    console.log('   Contract methods:', Object.getOwnPropertyNames(TestContract.prototype).filter(m => m !== 'constructor'));
    
    // Try to compile without local blockchain setup first (like the real tests)
    console.log(`\n4. Starting compilation (without LocalBlockchain setup)...`);
    console.log('   Calling TestContract.compile()...');
    
    const startTime = Date.now();
    let compilationResult;
    let compilationSuccess = true;
    let errorMessage = '';
    
    try {
      compilationResult = await TestContract.compile();
      const compilationTime = Date.now() - startTime;
      console.log(`   ✅ Compilation successful! (took ${compilationTime}ms)`);
      
    } catch (compileError) {
      compilationSuccess = false;
      console.error('   ❌ Compilation failed!');
      console.error('   Error message:', compileError.message);
      console.error('   Error type:', compileError.constructor.name);
      console.error('   Stack trace:', compileError.stack);
      
      errorMessage = compileError.message;
      
      // Create a dummy result for analysis
      compilationResult = {
        verificationKey: null,
        provers: {}
      };
    }
    
    // Analyze compilation result
    console.log(`\n5. Analyzing compilation result...`);
    if (compilationResult) {
      console.log('   Compilation result type:', typeof compilationResult);
      console.log('   Compilation result keys:', Object.keys(compilationResult));
      
      if (compilationResult.verificationKey) {
        console.log('   ✅ Verification key exists');
        console.log('   VK type:', typeof compilationResult.verificationKey);
        if (compilationResult.verificationKey.hash) {
          console.log('   VK hash:', compilationResult.verificationKey.hash);
        }
      } else {
        console.log('   ❌ No verification key in result');
      }
      
      if (compilationResult.provers) {
        console.log('   ✅ Provers exist');
        console.log('   Prover methods:', Object.keys(compilationResult.provers));
        console.log('   Prover count:', Object.keys(compilationResult.provers).length);
      } else {
        console.log('   ❌ No provers in result');
      }
    }
    
    return {
      backend,
      success: compilationSuccess,
      error: errorMessage || undefined,
      compilationResult: compilationResult ? {
        hasVerificationKey: !!compilationResult.verificationKey,
        verificationKeyHash: compilationResult.verificationKey?.hash || 'none',
        proverCount: compilationResult.provers ? Object.keys(compilationResult.provers).length : 0,
        hasVerifyFunction: !!compilationResult.verify
      } : null
    };
    
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    return {
      backend,
      success: false,
      error: error.message
    };
  }
}

// Main test runner
async function runTests() {
  console.log(`${'='.repeat(80)}`);
  console.log('SmartContract Compilation Debug Test');
  console.log(`${'='.repeat(80)}`);
  console.log('Started:', new Date().toISOString());
  console.log('Node version:', process.version);
  console.log('Working directory:', process.cwd());
  
  const results = {};
  
  // Test with both backends
  for (const backend of ['snarky', 'sparky']) {
    try {
      results[backend] = await testBasicSmartContractCompilation(backend);
    } catch (error) {
      console.error(`\n❌ Unexpected error testing ${backend}:`);
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      results[backend] = { backend, success: false, error: error.message };
    }
  }
  
  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('Test Summary');
  console.log(`${'='.repeat(80)}`);
  
  for (const [backend, result] of Object.entries(results)) {
    console.log(`\n${backend.toUpperCase()} Result:`);
    if (result.success) {
      console.log('  ✅ SUCCESS');
      if (result.compilationResult) {
        console.log('  - Has verification key:', result.compilationResult.hasVerificationKey);
        console.log('  - VK hash:', result.compilationResult.verificationKeyHash);
        console.log('  - Prover count:', result.compilationResult.proverCount);
      }
    } else {
      console.log('  ❌ FAILED');
      if (result.error) {
        console.log('  - Error:', result.error);
      }
    }
  }
  
  console.log('\nCompleted:', new Date().toISOString());
  
  // Exit with appropriate code
  const allSuccess = Object.values(results).every(result => result.success);
  process.exit(allSuccess ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ Fatal error:');
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});