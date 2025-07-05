#!/usr/bin/env node

/**
 * Debug script for SmartContract compilation issues
 * Created: January 5, 2025 05:10 UTC
 * 
 * This script tests basic SmartContract compilation with both Snarky and Sparky backends
 * with comprehensive error logging to identify compilation failures.
 */

const { switchBackend, getCurrentBackend } = require('./dist/node/index.js');

// Helper to format and log results
function logSection(title) {
  console.log('\n' + '='.repeat(80));
  console.log(`${title}`);
  console.log('='.repeat(80));
}

function logSubSection(title) {
  console.log('\n' + '-'.repeat(60));
  console.log(`${title}`);
  console.log('-'.repeat(60));
}

function logError(error) {
  console.error('\n❌ ERROR DETAILS:');
  console.error('Message:', error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  
  // Log any additional error properties
  const errorKeys = Object.keys(error).filter(key => !['message', 'stack'].includes(key));
  if (errorKeys.length > 0) {
    console.error('\nAdditional error properties:');
    errorKeys.forEach(key => {
      console.error(`  ${key}:`, error[key]);
    });
  }
}

// Test basic SmartContract compilation
async function testBasicSmartContractCompilation(backend) {
  logSection(`Testing Basic SmartContract Compilation with ${backend.toUpperCase()}`);
  
  try {
    // Switch to the specified backend
    console.log(`\n1. Switching to ${backend} backend...`);
    await switchBackend(backend);
    
    // Verify backend switch
    const currentBackend = getCurrentBackend();
    console.log(`   Current backend: ${currentBackend}`);
    if (currentBackend !== backend) {
      throw new Error(`Backend switch failed! Expected ${backend}, got ${currentBackend}`);
    }
    console.log('   ✅ Backend switch successful');
    
    // Get o1js after backend switch
    console.log('\n2. Loading o1js modules...');
    const o1js = require('./dist/node/index.js');
    const { SmartContract, State, state, Field, method, Mina } = o1js;
    
    // Log available exports to verify modules loaded correctly
    console.log('   Available o1js exports:', Object.keys(o1js).slice(0, 10).join(', '), '...');
    console.log('   ✅ o1js modules loaded');
    
    // Define a simple SmartContract
    console.log('\n3. Defining SmartContract class...');
    class SimpleContract extends SmartContract {
      init() {
        super.init();
        this.value = State();
      }
      
      update(newValue) {
        console.log('     - Inside update method');
        const current = this.value.getAndRequireEquals();
        console.log('     - Got current value');
        newValue.assertGreaterThan(current);
        console.log('     - Assertion complete');
        this.value.set(newValue);
        console.log('     - New value set');
      }
      
      multiply(x, y) {
        console.log('     - Inside multiply method');
        const result = x.mul(y);
        console.log('     - Multiplication complete');
        this.value.set(result);
        console.log('     - Result stored');
      }
    }
    
    // Add decorators manually
    SimpleContract.prototype.value = state(Field);
    SimpleContract.prototype.update = method(SimpleContract.prototype.update);
    SimpleContract.prototype.multiply = method(SimpleContract.prototype.multiply);
    console.log('   ✅ SmartContract class defined');
    console.log('   Contract methods:', Object.getOwnPropertyNames(SimpleContract.prototype).filter(m => m !== 'constructor'));
    
    // Set up local blockchain
    console.log('\n4. Setting up local blockchain...');
    const Local = Mina.LocalBlockchain();
    Mina.setActiveInstance(Local);
    console.log('   ✅ Local blockchain initialized');
    
    // Try to compile the contract
    console.log('\n5. Starting compilation...');
    console.log('   Calling SimpleContract.compile()...');
    
    const startTime = Date.now();
    let compilationResult;
    
    try {
      // Add event listeners if available
      if (typeof SimpleContract.on === 'function') {
        SimpleContract.on('compile:start', () => console.log('   📍 Compilation started event'));
        SimpleContract.on('compile:progress', (progress) => console.log('   📍 Compilation progress:', progress));
        SimpleContract.on('compile:error', (error) => console.log('   📍 Compilation error event:', error));
      }
      
      compilationResult = await SimpleContract.compile();
      
      const compilationTime = Date.now() - startTime;
      console.log(`   ✅ Compilation successful! (took ${compilationTime}ms)`);
      
    } catch (compileError) {
      console.error('   ❌ Compilation failed!');
      logError(compileError);
      
      // Try to get more information about the compilation state
      console.log('\n   Attempting to gather more debug information...');
      try {
        if (SimpleContract._methods) {
          console.log('   Contract methods info:', SimpleContract._methods);
        }
        if (SimpleContract._circuit) {
          console.log('   Circuit info available:', !!SimpleContract._circuit);
        }
      } catch (debugError) {
        console.log('   Could not gather additional debug info:', debugError.message);
      }
      
      throw compileError;
    }
    
    // Analyze compilation result
    console.log('\n6. Analyzing compilation result...');
    if (compilationResult) {
      console.log('   Compilation result type:', typeof compilationResult);
      console.log('   Compilation result keys:', Object.keys(compilationResult));
      
      if (compilationResult.verificationKey) {
        console.log('   ✅ Verification key exists');
        console.log('   VK type:', typeof compilationResult.verificationKey);
        console.log('   VK keys:', Object.keys(compilationResult.verificationKey).slice(0, 5).join(', '), '...');
        if (compilationResult.verificationKey.hash) {
          console.log('   VK hash:', compilationResult.verificationKey.hash);
        }
      } else {
        console.log('   ❌ No verification key in result');
      }
      
      if (compilationResult.provers) {
        console.log('   ✅ Provers exist');
        console.log('   Prover methods:', Object.keys(compilationResult.provers));
      } else {
        console.log('   ❌ No provers in result');
      }
      
      if (compilationResult.verify) {
        console.log('   ✅ Verify function exists');
      }
    } else {
      console.log('   ❌ Compilation result is null/undefined');
    }
    
    return {
      backend,
      success: true,
      compilationResult: compilationResult ? {
        hasVerificationKey: !!compilationResult.verificationKey,
        verificationKeyHash: compilationResult.verificationKey?.hash || 'none',
        proverCount: compilationResult.provers ? Object.keys(compilationResult.provers).length : 0,
        hasVerifyFunction: !!compilationResult.verify
      } : null
    };
    
  } catch (error) {
    return {
      backend,
      success: false,
      error: {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      }
    };
  }
}

// Main test runner
async function runTests() {
  logSection('SmartContract Compilation Debug Test');
  console.log('Started:', new Date().toISOString());
  console.log('Node version:', process.version);
  console.log('Working directory:', process.cwd());
  
  const results = {
    snarky: null,
    sparky: null
  };
  
  // Test with Snarky
  try {
    results.snarky = await testBasicSmartContractCompilation('snarky');
  } catch (error) {
    console.error('\n❌ Unexpected error testing Snarky:');
    logError(error);
    results.snarky = { backend: 'snarky', success: false, error: error.message };
  }
  
  // Test with Sparky
  try {
    results.sparky = await testBasicSmartContractCompilation('sparky');
  } catch (error) {
    console.error('\n❌ Unexpected error testing Sparky:');
    logError(error);
    results.sparky = { backend: 'sparky', success: false, error: error.message };
  }
  
  // Summary
  logSection('Test Summary');
  
  console.log('\nSnarky Result:');
  if (results.snarky?.success) {
    console.log('  ✅ SUCCESS');
    if (results.snarky.compilationResult) {
      console.log('  - Has verification key:', results.snarky.compilationResult.hasVerificationKey);
      console.log('  - VK hash:', results.snarky.compilationResult.verificationKeyHash);
      console.log('  - Prover count:', results.snarky.compilationResult.proverCount);
    }
  } else {
    console.log('  ❌ FAILED');
    if (results.snarky?.error) {
      console.log('  - Error:', results.snarky.error.message);
    }
  }
  
  console.log('\nSparky Result:');
  if (results.sparky?.success) {
    console.log('  ✅ SUCCESS');
    if (results.sparky.compilationResult) {
      console.log('  - Has verification key:', results.sparky.compilationResult.hasVerificationKey);
      console.log('  - VK hash:', results.sparky.compilationResult.verificationKeyHash);
      console.log('  - Prover count:', results.sparky.compilationResult.proverCount);
    }
  } else {
    console.log('  ❌ FAILED');
    if (results.sparky?.error) {
      console.log('  - Error:', results.sparky.error.message);
    }
  }
  
  console.log('\nCompleted:', new Date().toISOString());
  
  // Exit with appropriate code
  const allSuccess = results.snarky?.success && results.sparky?.success;
  process.exit(allSuccess ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ Fatal error:');
  logError(error);
  process.exit(1);
});