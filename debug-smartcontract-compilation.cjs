#!/usr/bin/env node

/**
 * Debug script for SmartContract compilation with Snarky vs Sparky backends
 * Created: 2025-01-04 00:00:00 UTC
 * Last Modified: 2025-01-04 00:00:00 UTC
 */

const path = require('path');

// Helper to load o1js with specific backend
async function loadO1jsWithBackend(backend) {
  // Reset global state
  delete global.o1js;
  delete global.__sparky_backend;
  delete global.sparkyInstance;
  delete global.sparkyConstraintBridge;

  // Set backend
  process.env.USE_SPARKY_BACKEND = backend === 'sparky' ? 'true' : 'false';
  global.__sparky_backend = backend;

  // Load o1js - use ES modules from CommonJS
  const o1jsPath = path.join(__dirname, 'dist/node/index.js');
  const o1js = await import(o1jsPath);
  
  return o1js;
}

// Test SmartContract compilation
async function testSmartContractCompilation(backend) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing SmartContract compilation with ${backend.toUpperCase()} backend`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    const o1js = await loadO1jsWithBackend(backend);
    const { SmartContract, State, state, Field, method } = o1js;

    console.log(`✅ o1js loaded successfully`);
    console.log(`✅ Backend set to: ${backend}`);
    console.log(`✅ SmartContract available: ${typeof SmartContract !== 'undefined'}`);
    console.log(`✅ State available: ${typeof State !== 'undefined'}`);
    console.log(`✅ Field available: ${typeof Field !== 'undefined'}`);

    // Define a minimal SmartContract following o1js v1 patterns
    class TestContract extends SmartContract {
      async increment() {
        const current = this.value.getAndRequireEquals();
        const newValue = current.add(Field(1));
        this.value.set(newValue);
      }

      async setValue(newValue) {
        this.value.set(newValue);
      }
    }
    
    // Define state using the API method (like decorators)
    TestContract.value = State(Field);

    console.log(`\n✅ TestContract class defined successfully`);
    console.log(`   Methods: increment, setValue`);
    console.log(`   State: value (Field)`);

    // Attempt compilation
    console.log(`\nStarting compilation...`);
    const startTime = Date.now();
    
    try {
      const compilationResult = await TestContract.compile();
      const endTime = Date.now();
      
      console.log(`\n✅ Compilation succeeded in ${endTime - startTime}ms`);
      console.log(`\nCompilation Result:`);
      console.log(`- Verification Key Exists: ${!!compilationResult.verificationKey}`);
      console.log(`- Verification Key Hash: ${compilationResult.verificationKey?.hash || 'N/A'}`);
      console.log(`- Verification Key Data Length: ${compilationResult.verificationKey?.data?.length || 0}`);
      console.log(`- Provers Available: ${Object.keys(compilationResult.provers || {}).length}`);
      console.log(`- Prover Methods: ${Object.keys(compilationResult.provers || {}).join(', ') || 'None'}`);
      
      return {
        success: true,
        backend,
        verificationKey: !!compilationResult.verificationKey,
        vkHash: compilationResult.verificationKey?.hash,
        methodCount: Object.keys(compilationResult.provers || {}).length,
        time: endTime - startTime
      };
    } catch (compileError) {
      console.error(`\n❌ Compilation failed with error:`);
      console.error(`   Type: ${compileError.constructor.name}`);
      console.error(`   Message: ${compileError.message}`);
      if (compileError.stack) {
        console.error(`\n   Stack trace:`);
        console.error(compileError.stack.split('\n').slice(0, 10).join('\n'));
      }
      
      return {
        success: false,
        backend,
        error: compileError.message,
        errorType: compileError.constructor.name,
        stack: compileError.stack
      };
    }
  } catch (error) {
    console.error(`\n❌ Setup failed with error:`);
    console.error(`   Type: ${error.constructor.name}`);
    console.error(`   Message: ${error.message}`);
    if (error.stack) {
      console.error(`\n   Stack trace:`);
      console.error(error.stack.split('\n').slice(0, 5).join('\n'));
    }
    
    return {
      success: false,
      backend,
      setupError: true,
      error: error.message,
      errorType: error.constructor.name
    };
  }
}

// Main execution
async function main() {
  console.log(`SmartContract Compilation Debug Script`);
  console.log(`Created: 2025-01-04 00:00:00 UTC`);
  console.log(`Running at: ${new Date().toISOString()}`);

  // Test both backends
  const snarkyResult = await testSmartContractCompilation('snarky');
  const sparkyResult = await testSmartContractCompilation('sparky');

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`SUMMARY`);
  console.log(`${'='.repeat(60)}\n`);

  console.log(`Snarky Backend:`);
  console.log(`- Success: ${snarkyResult.success ? '✅' : '❌'}`);
  if (snarkyResult.success) {
    console.log(`- Compilation Time: ${snarkyResult.time}ms`);
    console.log(`- Verification Key: ${snarkyResult.verificationKey ? '✅' : '❌'}`);
    console.log(`- Method Count: ${snarkyResult.methodCount}`);
  } else {
    console.log(`- Error: ${snarkyResult.error}`);
  }

  console.log(`\nSparky Backend:`);
  console.log(`- Success: ${sparkyResult.success ? '✅' : '❌'}`);
  if (sparkyResult.success) {
    console.log(`- Compilation Time: ${sparkyResult.time}ms`);
    console.log(`- Verification Key: ${sparkyResult.verificationKey ? '✅' : '❌'}`);
    console.log(`- Method Count: ${sparkyResult.methodCount}`);
  } else {
    console.log(`- Error: ${sparkyResult.error}`);
  }

  // Check for parity
  if (snarkyResult.success && sparkyResult.success) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`PARITY CHECK`);
    console.log(`${'='.repeat(60)}\n`);
    
    const vkMatch = snarkyResult.vkHash === sparkyResult.vkHash;
    const methodMatch = snarkyResult.methodCount === sparkyResult.methodCount;
    
    console.log(`- Verification Key Hash Match: ${vkMatch ? '✅' : '❌'}`);
    console.log(`- Method Count Match: ${methodMatch ? '✅' : '❌'}`);
    
    if (!vkMatch) {
      console.log(`  Snarky VK Hash: ${snarkyResult.vkHash}`);
      console.log(`  Sparky VK Hash: ${sparkyResult.vkHash}`);
    }
  }

  process.exit(sparkyResult.success ? 0 : 1);
}

// Run the script
main().catch(error => {
  console.error(`\nUnexpected error in main:`);
  console.error(error);
  process.exit(1);
});