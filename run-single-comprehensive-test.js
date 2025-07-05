/**
 * Run a single comprehensive test to debug the compilation issue
 */

import { switchBackend } from './dist/node/index.js';

async function runSingleTest() {
  console.log('🔍 RUNNING SINGLE COMPREHENSIVE TEST');
  
  // Load the comprehensive test suite
  const { tests } = await import('./dist/node/test/sparky/suites/comprehensive/circuit-compilation.suite.js');
  
  // Get the first test (basic-smartcontract-compilation)
  const test = tests[0];
  console.log(`\n📋 Running test: ${test.name}`);
  
  // Test on Snarky backend
  console.log('\n--- Testing Snarky Backend ---');
  try {
    await switchBackend('snarky');
    console.log('✓ Switched to Snarky backend');
    
    const snarkyResult = await test.testFn('snarky');
    console.log('✅ Snarky result:', JSON.stringify(snarkyResult, null, 2));
    
  } catch (error) {
    console.log('❌ Snarky test FAILED:', error.message);
    console.log('Stack:', error.stack?.split('\n').slice(0, 10).join('\n'));
  }
  
  // Test on Sparky backend
  console.log('\n--- Testing Sparky Backend ---');
  try {
    await switchBackend('sparky');
    console.log('✓ Switched to Sparky backend');
    
    const sparkyResult = await test.testFn('sparky');
    console.log('✅ Sparky result:', JSON.stringify(sparkyResult, null, 2));
    
  } catch (error) {
    console.log('❌ Sparky test FAILED:', error.message);
    console.log('Stack:', error.stack?.split('\n').slice(0, 10).join('\n'));
  }
  
  // Test ZkProgram compilation
  console.log('\n--- Testing ZkProgram Compilation ---');
  const zkTest = tests[1]; // zkprogram-compilation test
  
  try {
    await switchBackend('snarky');
    console.log('✓ Switched to Snarky backend');
    
    const snarkyZkResult = await zkTest.testFn('snarky');
    console.log('✅ Snarky ZkProgram result:', JSON.stringify(snarkyZkResult, null, 2));
    
  } catch (error) {
    console.log('❌ Snarky ZkProgram FAILED:', error.message);
  }
  
  try {
    await switchBackend('sparky');
    console.log('✓ Switched to Sparky backend');
    
    const sparkyZkResult = await zkTest.testFn('sparky');
    console.log('✅ Sparky ZkProgram result:', JSON.stringify(sparkyZkResult, null, 2));
    
  } catch (error) {
    console.log('❌ Sparky ZkProgram FAILED:', error.message);
    console.log('Stack:', error.stack?.split('\n').slice(0, 10).join('\n'));
  }
}

runSingleTest().catch(console.error);