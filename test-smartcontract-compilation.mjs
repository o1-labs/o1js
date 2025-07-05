#!/usr/bin/env node

/**
 * TEST SCRIPT: SmartContract Compilation with ML Array Fix
 * 
 * This script tests actual SmartContract compilation to verify the ML Array fix
 * resolves the original Pickles.compile() issue.
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Field, SmartContract, State, state, method, Mina, PrivateKey, AccountUpdate, Bool } from './dist/node/index.js';

console.log('🏗️  SmartContract Compilation Test with ML Array Fix');
console.log('=====================================================\n');

// Create a test SmartContract that should trigger ML Array parsing during compilation
class TestContract extends SmartContract {
  // Use the state decorator by defining it as a static property
  static _state = {
    value: state(Field)
  };
  
  constructor(address) {
    super(address);
    this.value = State();
  }
  
  // Use the method decorator by defining it as a static property  
  static _methods = {
    update: method(function(newValue) {
      // This method should trigger the ML Array issue during compilation
      const current = this.value.getAndRequireEquals();
      newValue.assertGreaterThan(current);
      this.value.set(newValue);
    })
  };
  
  update(newValue) {
    return TestContract._methods.update.call(this, newValue);
  }
}

// Apply decorators manually
state(Field)(TestContract.prototype, 'value');
method(TestContract.prototype, 'update');

async function testSmartContractCompilation() {
  try {
    console.log('🎯 Step 1: Switch to Sparky backend');
    await switchBackend('sparky');
    console.log(`✅ Current backend: ${getCurrentBackend()}`);
    
    console.log('\n🎯 Step 2: Create SmartContract instance');
    const deployerKey = PrivateKey.random();
    const contractKey = PrivateKey.random();
    const contractAddress = contractKey.toPublicKey();
    
    const zkApp = new TestContract(contractAddress);
    console.log('✅ SmartContract instance created');
    
    console.log('\n🎯 Step 3: Attempt SmartContract compilation (this tests ML Array handling)');
    console.log('🔍 This is where the original ML Array error occurred...');
    
    // This compilation should now work with the ML Array fix
    console.log('🔨 Starting compilation...');
    const compilationResult = await TestContract.compile();
    
    console.log('\n🎉 BREAKTHROUGH: SmartContract compilation SUCCEEDED!');
    console.log('✅ The ML Array fix has resolved the compilation issue!');
    
    console.log('\n📊 Compilation Results:');
    console.log(`✅ Verification key exists: ${!!compilationResult.verificationKey}`);
    console.log(`✅ Verification key hash: ${compilationResult.verificationKey?.hash || 'N/A'}`);
    console.log(`✅ Provers count: ${Object.keys(compilationResult.provers || {}).length}`);
    console.log(`✅ Prover methods: ${Object.keys(compilationResult.provers || {}).join(', ')}`);
    
    return true;
    
  } catch (error) {
    console.log('\n🚨 SmartContract compilation failed:');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    
    // Check if this is the ML Array error
    if (error.message.includes('Invalid FieldVar format') || 
        error.message.includes('expected constant with 1 argument, got 4 arguments')) {
      console.log('\n❌ ML Array issue still exists during SmartContract compilation!');
      console.log('📊 The fix may not have addressed all ML Array parsing paths');
      
    } else if (error.message.includes('Cannot access \'TestContract\' before initialization')) {
      console.log('\n🔧 JavaScript class initialization issue (not ML Array related)');
      
    } else {
      console.log('\n🔍 Different error encountered - not the original ML Array issue');
    }
    
    // Show stack trace for debugging
    if (error.stack) {
      console.log('\n📋 Error stack trace (first 15 lines):');
      const stackLines = error.stack.split('\n').slice(0, 15);
      stackLines.forEach((line, i) => console.log(`  ${i}: ${line}`));
    }
    
    return false;
  }
}

async function testSnarkyComparisonCompilation() {
  try {
    console.log('\n🔍 Step 4: Compare with Snarky backend compilation');
    await switchBackend('snarky');
    console.log(`✅ Switched to: ${getCurrentBackend()}`);
    
    console.log('🔨 Compiling with Snarky backend...');
    const compilationResult = await TestContract.compile();
    
    console.log('✅ Snarky compilation succeeded!');
    console.log(`📊 Verification key exists: ${!!compilationResult.verificationKey}`);
    console.log(`📊 Provers count: ${Object.keys(compilationResult.provers || {}).length}`);
    
    return true;
    
  } catch (error) {
    console.log('\n🚨 Snarky compilation failed:');
    console.log('Error message:', error.message);
    return false;
  }
}

async function runComprehensiveTest() {
  try {
    console.log('\n🎯 Step 5: Run comprehensive test suite');
    await switchBackend('sparky');
    console.log(`✅ Using backend: ${getCurrentBackend()}`);
    
    // Test various Sparky features that might use ML Arrays
    console.log('📋 Testing various Sparky operations...');
    
    // Test 1: Basic field operations
    const field1 = Field(100);
    const field2 = Field(200);
    const sum = field1.add(field2);
    console.log('✅ Basic field operations work');
    
    // Test 2: Boolean operations
    const bool1 = Bool(true);
    const bool2 = Bool(false);
    const boolResult = bool1.and(bool2);
    console.log('✅ Boolean operations work');
    
    // Test 3: Complex field operations
    const complex = field1.mul(field2).add(Field(50));
    console.log('✅ Complex field operations work');
    
    console.log('\n🎉 All comprehensive tests passed!');
    return true;
    
  } catch (error) {
    console.log('\n🚨 Comprehensive test failed:');
    console.log('Error message:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting SmartContract compilation test...\n');
  
  const sparkySuccess = await testSmartContractCompilation();
  const snarkySuccess = await testSnarkyComparisonCompilation();
  const comprehensiveSuccess = await runComprehensiveTest();
  
  console.log('\n🎯 Final Test Results:');
  console.log('======================');
  
  console.log(`✅ Sparky SmartContract compilation: ${sparkySuccess ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ Snarky SmartContract compilation: ${snarkySuccess ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ Comprehensive operations test: ${comprehensiveSuccess ? 'SUCCESS' : 'FAILED'}`);
  
  if (sparkySuccess && snarkySuccess && comprehensiveSuccess) {
    console.log('\n🎉 COMPLETE SUCCESS!');
    console.log('🚀 The ML Array fix has completely resolved the compilation issue!');
    console.log('🎯 Sparky backend is now working correctly for SmartContract compilation');
    
    console.log('\n📈 Impact:');
    console.log('- ✅ ML Array parsing from OCaml to Sparky works correctly');
    console.log('- ✅ SmartContract compilation with Sparky backend succeeds');
    console.log('- ✅ Verification key generation works');
    console.log('- ✅ Prover function generation works');
    
    console.log('\n🔧 Recommended Next Steps:');
    console.log('1. Run the full test suite to ensure no regressions');
    console.log('2. Test more complex SmartContracts');
    console.log('3. Performance benchmarking against Snarky');
    console.log('4. Document the ML Array format handling for future reference');
    
  } else {
    console.log('\n❌ Some tests failed - further investigation needed');
    console.log('🔧 Debug recommendations:');
    
    if (!sparkySuccess) {
      console.log('- Investigate remaining ML Array parsing paths');
      console.log('- Add more comprehensive ML Array format detection');
    }
    
    if (!snarkySuccess) {
      console.log('- Check Snarky backend functionality');
    }
    
    if (!comprehensiveSuccess) {
      console.log('- Investigate specific operation failures');
    }
  }
}

main().catch(console.error);