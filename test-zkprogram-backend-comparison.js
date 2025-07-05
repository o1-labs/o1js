// ZkProgram Backend Comparison Test - Snarky vs Sparky
// Created: July 4, 2025 12:00 AM UTC
// Last Modified: July 4, 2025 12:00 AM UTC

import { Field, ZkProgram, switchBackend, getCurrentBackend, Provable } from './dist/node/index.js';

// Test the same operations with both backends
async function testWithBackend(backendName, testName, zkProgramConfig) {
  console.log(`\n=== Testing ${testName} with ${backendName.toUpperCase()} ===`);
  
  try {
    await switchBackend(backendName);
    console.log(`✅ Switched to ${backendName} backend`);
    
    const program = ZkProgram(zkProgramConfig);
    console.log(`Starting ${testName} compilation with ${backendName}...`);
    
    const result = await program.compile();
    console.log(`✅ ${testName} compilation successful with ${backendName}`);
    return { success: true, result };
  } catch (error) {
    console.log(`❌ ${testName} compilation failed with ${backendName}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Test 1: Basic range check with assertLessThan
async function testRangeCheck() {
  const rangeCheckConfig = {
    name: 'RangeCheck',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      checkRange: {
        privateInputs: [Field],
        method(input, value) {
          // This should trigger rangeCheck0
          value.assertLessThan(Field(100));
          return input.add(value);
        }
      }
    }
  };
  
  const snarkyResult = await testWithBackend('snarky', 'Range Check', rangeCheckConfig);
  const sparkyResult = await testWithBackend('sparky', 'Range Check', rangeCheckConfig);
  
  return { snarky: snarkyResult, sparky: sparkyResult };
}

// Test 2: Comparison operations
async function testComparisons() {
  const comparisonConfig = {
    name: 'Comparison',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      compareValues: {
        privateInputs: [Field],
        method(input, value) {
          // Test lessThan operation
          const isLess = value.lessThan(Field(100));
          
          // Test conditional logic
          const result = Provable.if(isLess, input.add(Field(1)), input.sub(Field(1)));
          
          return result;
        }
      }
    }
  };
  
  const snarkyResult = await testWithBackend('snarky', 'Comparisons', comparisonConfig);
  const sparkyResult = await testWithBackend('sparky', 'Comparisons', comparisonConfig);
  
  return { snarky: snarkyResult, sparky: sparkyResult };
}

// Test 3: Simple arithmetic (should work with both)
async function testArithmetic() {
  const arithmeticConfig = {
    name: 'Arithmetic',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      addMul: {
        privateInputs: [Field, Field],
        method(input, a, b) {
          const sum = a.add(b);
          const product = a.mul(b);
          return input.add(sum).mul(product);
        }
      }
    }
  };
  
  const snarkyResult = await testWithBackend('snarky', 'Arithmetic', arithmeticConfig);
  const sparkyResult = await testWithBackend('sparky', 'Arithmetic', arithmeticConfig);
  
  return { snarky: snarkyResult, sparky: sparkyResult };
}

// Main comparison runner
async function runBackendComparison() {
  console.log('🔍 ZkProgram Backend Comparison: Snarky vs Sparky\n');
  
  // Test 1: Simple arithmetic (baseline)
  console.log('1️⃣ Testing basic arithmetic operations...');
  const arithmeticResults = await testArithmetic();
  
  // Test 2: Comparison operations
  console.log('\n2️⃣ Testing comparison operations...');
  const comparisonResults = await testComparisons();
  
  // Test 3: Range check operations
  console.log('\n3️⃣ Testing range check operations...');
  const rangeCheckResults = await testRangeCheck();
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('🎯 BACKEND COMPARISON SUMMARY');
  console.log('='.repeat(80));
  
  const tests = [
    { name: 'Arithmetic', results: arithmeticResults },
    { name: 'Comparisons', results: comparisonResults },
    { name: 'Range Check', results: rangeCheckResults }
  ];
  
  tests.forEach(({ name, results }) => {
    const snarkyStatus = results.snarky.success ? '✅ PASS' : '❌ FAIL';
    const sparkyStatus = results.sparky.success ? '✅ PASS' : '❌ FAIL';
    
    console.log(`\n${name}:`);
    console.log(`  Snarky: ${snarkyStatus}`);
    console.log(`  Sparky: ${sparkyStatus}`);
    
    if (!results.snarky.success) {
      console.log(`  Snarky Error: ${results.snarky.error}`);
    }
    if (!results.sparky.success) {
      console.log(`  Sparky Error: ${results.sparky.error}`);
    }
  });
  
  // Analysis
  console.log('\n' + '='.repeat(80));
  console.log('📊 ANALYSIS');
  console.log('='.repeat(80));
  
  const snarkyTotal = tests.filter(t => t.results.snarky.success).length;
  const sparkyTotal = tests.filter(t => t.results.sparky.success).length;
  
  console.log(`Snarky: ${snarkyTotal}/${tests.length} tests passing`);
  console.log(`Sparky: ${sparkyTotal}/${tests.length} tests passing`);
  
  if (snarkyTotal > sparkyTotal) {
    console.log('\n🔍 CONCLUSION: Sparky has specific implementation issues with certain operations');
    
    // Identify which operations fail with Sparky
    const sparkyFailures = tests.filter(t => !t.results.sparky.success && t.results.snarky.success);
    if (sparkyFailures.length > 0) {
      console.log('\n❌ Operations that fail only with Sparky:');
      sparkyFailures.forEach(test => {
        console.log(`  - ${test.name}: ${test.results.sparky.error}`);
      });
    }
  } else if (snarkyTotal === sparkyTotal) {
    console.log('\n✅ CONCLUSION: Both backends have similar success rates');
  } else {
    console.log('\n🔍 CONCLUSION: Snarky also has issues, this may be a general ZkProgram problem');
  }
}

runBackendComparison().catch(console.error);