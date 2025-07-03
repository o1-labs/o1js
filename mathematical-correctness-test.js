#!/usr/bin/env node

/**
 * Mathematical Correctness Test for Optimized Sparky
 * 
 * Tests that aggressive optimizations preserve mathematical correctness
 * by comparing actual field operation results between backends
 */

import { switchBackend, getCurrentBackend, Field } from './dist/node/index.js';

console.log('🧮 Mathematical Correctness Test for Optimized Sparky\n');

async function testFieldOperation(name, operation) {
  console.log(`Testing ${name}...`);
  
  // Test with Snarky backend
  await switchBackend('snarky');
  const snarkyResult = operation();
  
  // Test with optimized Sparky backend  
  await switchBackend('sparky');
  const sparkyResult = operation();
  
  // Compare results
  const snarkyStr = snarkyResult.toString();
  const sparkyStr = sparkyResult.toString();
  
  const matches = snarkyStr === sparkyStr;
  console.log(`  Snarky: ${snarkyStr}`);
  console.log(`  Sparky: ${sparkyStr}`);
  console.log(`  ✓ ${matches ? 'CORRECT' : 'INCORRECT'}\n`);
  
  return matches;
}

async function runMathematicalCorrectnessTests() {
  const tests = [];
  
  // Test 1: Basic Addition
  tests.push(await testFieldOperation('Basic Addition', () => {
    const a = Field(123);
    const b = Field(456);
    return a.add(b);
  }));
  
  // Test 2: Basic Multiplication
  tests.push(await testFieldOperation('Basic Multiplication', () => {
    const a = Field(123);
    const b = Field(456);  
    return a.mul(b);
  }));
  
  // Test 3: Subtraction
  tests.push(await testFieldOperation('Subtraction', () => {
    const a = Field(1000);
    const b = Field(333);
    return a.sub(b);
  }));
  
  // Test 4: Square
  tests.push(await testFieldOperation('Square', () => {
    const a = Field(123);
    return a.square();
  }));
  
  // Test 5: Complex Expression
  tests.push(await testFieldOperation('Complex Expression: (a + b) * c - d', () => {
    const a = Field(10);
    const b = Field(20);
    const c = Field(3);
    const d = Field(5);
    return a.add(b).mul(c).sub(d);
  }));
  
  // Test 6: Zero Operations
  tests.push(await testFieldOperation('Zero Operations', () => {
    const a = Field(0);
    const b = Field(123);
    return a.add(b).mul(Field(1));
  }));
  
  // Test 7: Large Numbers
  tests.push(await testFieldOperation('Large Numbers', () => {
    const a = Field('123456789012345678901234567890');
    const b = Field('987654321098765432109876543210');
    return a.add(b);
  }));
  
  // Test 8: Associativity: (a + b) + c = a + (b + c)
  tests.push(await testFieldOperation('Associativity Test', () => {
    const a = Field(111);
    const b = Field(222);
    const c = Field(333);
    const left = a.add(b).add(c);
    const right = a.add(b.add(c));
    return left.sub(right); // Should be zero if associative
  }));
  
  // Test 9: Distributivity: a * (b + c) = a * b + a * c
  tests.push(await testFieldOperation('Distributivity Test', () => {
    const a = Field(7);
    const b = Field(11);  
    const c = Field(13);
    const left = a.mul(b.add(c));
    const right = a.mul(b).add(a.mul(c));
    return left.sub(right); // Should be zero if distributive
  }));
  
  // Test 10: Inverse Property: a + (-a) = 0
  tests.push(await testFieldOperation('Additive Inverse', () => {
    const a = Field(12345);
    const negA = Field(0).sub(a); // -a
    return a.add(negA); // Should be zero
  }));
  
  // Results Summary
  const passed = tests.filter(Boolean).length;
  const total = tests.length;
  
  console.log('📊 Mathematical Correctness Results:');
  console.log(`✅ Passed: ${passed}/${total} tests`);
  console.log(`❌ Failed: ${total - passed}/${total} tests`);
  
  if (passed === total) {
    console.log('\n🎉 ALL MATHEMATICAL CORRECTNESS TESTS PASSED!');
    console.log('✅ Aggressive optimizations preserve mathematical correctness');
  } else {
    console.log('\n⚠️  MATHEMATICAL CORRECTNESS ISSUES DETECTED!');
    console.log('❌ Optimizations may have introduced mathematical errors');
  }
  
  return passed === total;
}

runMathematicalCorrectnessTests().catch(console.error);