#!/usr/bin/env node

/**
 * Debug publicOutput Difference Between Backends
 * 
 * Test the EXACT same publicOutput pattern with both backends
 * to isolate why Snarky works but Sparky fails
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Field, ZkProgram } from './dist/node/index.js';

console.log('🔍 Debugging publicOutput Backend Difference');
console.log('===========================================');

// The MINIMAL failing pattern - exactly what should work
const MinimalOutputProgram = ZkProgram({
  name: 'MinimalOutput',
  publicInput: Field,
  publicOutput: Field,  // This is what causes the issue
  
  methods: {
    identity: {
      privateInputs: [],
      method(input) {
        // Just return the input - simplest possible case
        return input;
      }
    }
  }
});

// Slightly more complex case
const SimpleArithmeticOutput = ZkProgram({
  name: 'SimpleArithmeticOutput', 
  publicInput: Field,
  publicOutput: Field,
  
  methods: {
    addOne: {
      privateInputs: [],
      method(input) {
        const result = input.add(Field(1));
        return result;
      }
    }
  }
});

async function testProgram(program, programName, backend) {
  console.log(`\n🧪 Testing ${programName} on ${backend.toUpperCase()}`);
  console.log('-'.repeat(50));
  
  try {
    await switchBackend(backend);
    console.log(`✓ Switched to ${backend} backend`);
    
    console.log(`⚙️ Compiling ${programName}...`);
    
    const startTime = Date.now();
    const { verificationKey } = await program.compile();
    const endTime = Date.now();
    
    console.log(`✅ ${programName} compiled successfully on ${backend}`);
    console.log(`⏱️  Compilation time: ${endTime - startTime}ms`);
    console.log(`📊 VK length: ${verificationKey.data.length}`);
    
    return { success: true, time: endTime - startTime };
  } catch (error) {
    console.log(`❌ ${programName} failed on ${backend}`);
    console.log(`💥 Error: ${error.message}`);
    
    // Check the specific error type
    if (error.message.includes('Cannot read properties of undefined')) {
      console.log(`🚨 FIELD CONVERSION ERROR - result.publicOutput is undefined`);
      
      // Look at the stack trace to see exactly where it fails
      const stackLines = error.stack.split('\n');
      const relevantLine = stackLines.find(line => line.includes('zkprogram.js') || line.includes('fields.js'));
      if (relevantLine) {
        console.log(`📍 Failure location: ${relevantLine.trim()}`);
      }
    } else if (error.message.includes('toString')) {
      console.log(`🚨 FIELD TOSTRING ERROR - different issue`);
    } else {
      console.log(`🚨 OTHER ERROR: ${error.message}`);
    }
    
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log(`🚀 Starting publicOutput backend comparison`);
  console.log(`📍 Current backend: ${getCurrentBackend()}`);
  
  const programs = [
    { program: MinimalOutputProgram, name: 'MinimalOutputProgram' },
    { program: SimpleArithmeticOutput, name: 'SimpleArithmeticOutput' }
  ];
  
  for (const { program, name } of programs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TESTING: ${name}`);
    console.log(`${'='.repeat(60)}`);
    
    const snarkyResult = await testProgram(program, name, 'snarky');
    const sparkyResult = await testProgram(program, name, 'sparky');
    
    console.log(`\n📊 COMPARISON for ${name}:`);
    console.log(`  Snarky: ${snarkyResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`  Sparky: ${sparkyResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (snarkyResult.success && sparkyResult.success) {
      console.log(`🎉 Both backends work! Time ratio: ${(sparkyResult.time / snarkyResult.time).toFixed(2)}x`);
    } else if (snarkyResult.success && !sparkyResult.success) {
      console.log(`🚨 SPARKY-SPECIFIC ISSUE: ${sparkyResult.error}`);
      console.log(`💡 This proves the issue is in Sparky backend, not o1js core`);
    } else if (!snarkyResult.success && sparkyResult.success) {
      console.log(`🚨 SNARKY-SPECIFIC ISSUE: ${snarkyResult.error}`);
      console.log(`💡 Unexpected - Snarky should handle this pattern`);
    } else {
      console.log(`💥 Both backends fail - this would be a fundamental o1js issue`);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ANALYSIS`);
  console.log(`${'='.repeat(60)}`);
  console.log(`If Snarky works but Sparky fails, then:`);
  console.log(`1. The publicOutput pattern is valid in o1js`);
  console.log(`2. Sparky backend has a bug in method return value handling`); 
  console.log(`3. The fix should be in Sparky, not o1js core`);
  console.log(`4. Need to investigate how Sparky processes method return values`);
  
  console.log(`\n🎯 NEXT STEPS IF SPARKY FAILS:`);
  console.log(`1. Check Sparky's method execution flow`);
  console.log(`2. Compare how Sparky vs Snarky capture return values`);
  console.log(`3. Fix the Sparky backend issue`);
  console.log(`4. Re-enable publicOutput support in Sparky`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Debug script failed:', error);
    process.exit(1);
  });
}