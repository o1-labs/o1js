#!/usr/bin/env node

/**
 * Debug Field Conversion Issue
 * 
 * This script reproduces and fixes the field conversion error in ruthless-performance-benchmark.mjs
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Field, Provable, ZkProgram } from './dist/node/index.js';

console.log('🔍 Debugging Field Conversion Issue');
console.log('====================================');

// Create a minimal ZkProgram that should work
const SimpleProgram = ZkProgram({
  name: 'SimpleTest',
  publicInput: Field,
  publicOutput: Field,
  
  methods: {
    simpleAdd: {
      privateInputs: [Field],
      async method(input, privateInput) {
        // Remove console.log - can't call toString() on Field variables during compilation
        const result = input.add(privateInput);
        return result;
      }
    }
  }
});

async function testSimpleProgram(backend) {
  console.log(`\n🧪 Testing SimpleProgram on ${backend.toUpperCase()}`);
  console.log('-'.repeat(50));
  
  try {
    await switchBackend(backend);
    console.log(`✓ Switched to ${backend} backend`);
    
    console.log('⚙️ Compiling SimpleProgram...');
    
    // Try to compile the program
    const { verificationKey } = await SimpleProgram.compile();
    
    console.log(`✅ SimpleProgram compiled successfully on ${backend}`);
    console.log(`📊 VK length: ${verificationKey.data.length}`);
    
    return true;
  } catch (error) {
    console.log(`❌ SimpleProgram failed on ${backend}: ${error.message}`);
    console.log(`📋 Stack trace: ${error.stack}`);
    return false;
  }
}

// Test progressively more complex programs to isolate the issue
const ArithmeticProgram = ZkProgram({
  name: 'ArithmeticTest',
  publicInput: Field,
  publicOutput: Field,
  
  methods: {
    complexOperation: {
      privateInputs: [Field, Field, Field],
      async method(input, a, b, c) {
        // Remove all console.log statements - can't call toString() during compilation
        
        // Start simple
        let result = input.add(a);
        
        // Add multiplication
        result = result.mul(b);
        
        // Add more operations
        result = result.add(c.mul(input));
        
        return result;
      }
    }
  }
});

async function testArithmeticProgram(backend) {
  console.log(`\n🧪 Testing ArithmeticProgram on ${backend.toUpperCase()}`);
  console.log('-'.repeat(50));
  
  try {
    await switchBackend(backend);
    console.log(`✓ Switched to ${backend} backend`);
    
    console.log('⚙️ Compiling ArithmeticProgram...');
    
    const { verificationKey } = await ArithmeticProgram.compile();
    
    console.log(`✅ ArithmeticProgram compiled successfully on ${backend}`);
    return true;
  } catch (error) {
    console.log(`❌ ArithmeticProgram failed on ${backend}: ${error.message}`);
    console.log(`📋 Full error:`, error);
    return false;
  }
}

// Test the original problematic code with minimal changes
const MinimalArithmeticHeavy = ZkProgram({
  name: 'MinimalArithmeticHeavy',
  publicInput: Field,
  publicOutput: Field,
  
  methods: {
    evaluatePolynomial: {
      privateInputs: [Field, Field, Field],  // Reduced from 10 to 3 inputs
      async method(x, a1, a2, a3) {
        // Remove all console.log statements - can't call toString() during compilation
        
        let result = Field(0);
        let xPower = Field(1);
        
        // Reduce from 100 to 5 iterations
        const coefficients = [a1, a2, a3];
        
        for (let i = 0; i < 5; i++) {  // Reduced iterations
          const coeff = coefficients[i % 3];
          xPower = xPower.mul(x);
          const term = coeff.mul(xPower);
          result = result.add(term);
        }
        
        return result;
      }
    }
  }
});

async function testMinimalArithmeticHeavy(backend) {
  console.log(`\n🧪 Testing MinimalArithmeticHeavy on ${backend.toUpperCase()}`);
  console.log('-'.repeat(50));
  
  try {
    await switchBackend(backend);
    console.log(`✓ Switched to ${backend} backend`);
    
    console.log('⚙️ Compiling MinimalArithmeticHeavy...');
    
    const { verificationKey } = await MinimalArithmeticHeavy.compile();
    
    console.log(`✅ MinimalArithmeticHeavy compiled successfully on ${backend}`);
    return true;
  } catch (error) {
    console.log(`❌ MinimalArithmeticHeavy failed on ${backend}: ${error.message}`);
    console.log(`📋 Full error:`, error);
    
    // Try to extract more specific information about the error
    if (error.message.includes('Cannot read properties of undefined')) {
      console.log(`🚨 FIELD CONVERSION ERROR DETECTED`);
      console.log(`🔍 This is the same error from ruthless-performance-benchmark.mjs`);
    }
    return false;
  }
}

async function main() {
  console.log(`🚀 Starting field conversion debugging`);
  console.log(`📍 Current backend: ${getCurrentBackend()}`);
  
  // Test 1: Simple program that should always work
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST 1: Simple Program`);
  console.log(`${'='.repeat(60)}`);
  
  const snarkySimple = await testSimpleProgram('snarky');
  const sparkySimple = await testSimpleProgram('sparky');
  
  // Test 2: Slightly more complex arithmetic
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST 2: Arithmetic Program`);
  console.log(`${'='.repeat(60)}`);
  
  const snarkyArithmetic = await testArithmeticProgram('snarky');
  const sparkyArithmetic = await testArithmeticProgram('sparky');
  
  // Test 3: Minimal version of the problematic code
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST 3: Minimal Arithmetic Heavy (Problematic Pattern)`);
  console.log(`${'='.repeat(60)}`);
  
  const snarkyMinimal = await testMinimalArithmeticHeavy('snarky');
  const sparkyMinimal = await testMinimalArithmeticHeavy('sparky');
  
  // Analysis
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ANALYSIS RESULTS`);
  console.log(`${'='.repeat(60)}`);
  
  console.log(`📊 Test Results:`);
  console.log(`  Simple Program:     Snarky=${snarkySimple ? '✅' : '❌'}, Sparky=${sparkySimple ? '✅' : '❌'}`);
  console.log(`  Arithmetic Program: Snarky=${snarkyArithmetic ? '✅' : '❌'}, Sparky=${sparkyArithmetic ? '✅' : '❌'}`);
  console.log(`  Minimal Heavy:      Snarky=${snarkyMinimal ? '✅' : '❌'}, Sparky=${sparkyMinimal ? '✅' : '❌'}`);
  
  if (!snarkyMinimal && !sparkyMinimal) {
    console.log(`\n🎯 DIAGNOSIS: Field conversion issue affects both backends`);
    console.log(`💡 LIKELY CAUSE: Issue in ZkProgram compilation logic, not backend-specific`);
  } else if (!sparkyMinimal && snarkyMinimal) {
    console.log(`\n🎯 DIAGNOSIS: Sparky-specific field conversion issue`);
    console.log(`💡 LIKELY CAUSE: Sparky backend field handling incompatibility`);
  } else if (!snarkyMinimal && sparkyMinimal) {
    console.log(`\n🎯 DIAGNOSIS: Snarky-specific field conversion issue`);
    console.log(`💡 LIKELY CAUSE: Unexpected - Snarky should handle this pattern`);
  } else {
    console.log(`\n🎯 DIAGNOSIS: All tests passed - issue might be in larger complexity`);
    console.log(`💡 NEXT STEP: Try gradually increasing complexity to find the threshold`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Debug script failed:', error);
    process.exit(1);
  });
}