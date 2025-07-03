#!/usr/bin/env node

/**
 * Backend Mathematical Equivalence Test
 * 
 * Verifies that Snarky and optimized Sparky produce identical
 * mathematical results for field operations
 */

import { switchBackend, getCurrentBackend, Field } from './dist/node/index.js';

console.log('🔬 Backend Mathematical Equivalence Test\n');

async function testEquivalence(name, testFn) {
  console.log(`Testing ${name}...`);
  
  // Test with Snarky backend
  await switchBackend('snarky');
  const snarkyResult = testFn();
  
  // Test with optimized Sparky backend  
  await switchBackend('sparky');
  const sparkyResult = testFn();
  
  // Compare results
  const snarkyStr = snarkyResult.toString();
  const sparkyStr = sparkyResult.toString();
  
  const matches = snarkyStr === sparkyStr;
  console.log(`  Snarky:  ${snarkyStr}`);
  console.log(`  Sparky:  ${sparkyStr}`);
  console.log(`  Status:  ${matches ? '✅ EQUIVALENT' : '❌ DIFFERENT'}\n`);
  
  return matches;
}

async function runBackendEquivalenceTests() {
  const results = [];
  
  // Test 1: Simple Addition
  results.push(await testEquivalence('Simple Addition', () => {
    return Field(123).add(Field(456));
  }));
  
  // Test 2: Simple Multiplication
  results.push(await testEquivalence('Simple Multiplication', () => {
    return Field(123).mul(Field(456));
  }));
  
  // Test 3: Subtraction
  results.push(await testEquivalence('Subtraction', () => {
    return Field(1000).sub(Field(333));
  }));
  
  // Test 4: Square
  results.push(await testEquivalence('Square Operation', () => {
    return Field(123).square();
  }));
  
  // Test 5: Chained Operations
  results.push(await testEquivalence('Chained Operations', () => {
    return Field(10).add(Field(20)).mul(Field(3));
  }));
  
  // Test 6: Complex Expression
  results.push(await testEquivalence('Complex Expression', () => {
    const a = Field(7);
    const b = Field(11);
    const c = Field(13);
    return a.mul(b.add(c)).sub(Field(5));
  }));
  
  // Test 7: Zero Operations
  results.push(await testEquivalence('Zero Operations', () => {
    return Field(0).add(Field(123)).mul(Field(1));
  }));
  
  // Test 8: Large Numbers
  results.push(await testEquivalence('Large Numbers', () => {
    return Field('123456789').mul(Field('987654321'));
  }));
  
  // Test 9: Identity Operations
  results.push(await testEquivalence('Identity Operations', () => {
    const x = Field(42);
    return x.add(Field(0)).mul(Field(1));
  }));
  
  // Test 10: Nested Operations
  results.push(await testEquivalence('Nested Operations', () => {
    const a = Field(2);
    const b = Field(3);
    const c = Field(5);
    return a.square().add(b.square()).mul(c);
  }));
  
  // Results Summary
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log('📊 Backend Mathematical Equivalence Results:');
  console.log(`✅ Equivalent: ${passed}/${total} operations`);
  console.log(`❌ Different:  ${total - passed}/${total} operations`);
  console.log(`📈 Success Rate: ${(passed/total * 100).toFixed(1)}%`);
  
  if (passed === total) {
    console.log('\n🎉 PERFECT MATHEMATICAL EQUIVALENCE!');
    console.log('✅ Aggressive optimizations preserve mathematical correctness');
    console.log('✅ Snarky and Sparky produce identical field operation results');
  } else {
    console.log('\n⚠️  MATHEMATICAL DIFFERENCES DETECTED!');
    console.log('❌ Some operations produce different results between backends');
  }
  
  return passed === total;
}

runBackendEquivalenceTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  });