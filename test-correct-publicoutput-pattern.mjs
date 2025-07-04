#!/usr/bin/env node

/**
 * Test Correct publicOutput Pattern
 * 
 * Test the CORRECT publicOutput pattern discovered from official examples
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Field, ZkProgram } from './dist/node/index.js';

console.log('🔍 Testing CORRECT publicOutput Pattern');
console.log('=====================================');

// CORRECT PATTERN - return { publicOutput: value }
const CorrectOutputProgram = ZkProgram({
  name: 'CorrectOutput',
  publicInput: Field,
  publicOutput: Field,
  
  methods: {
    identity: {
      privateInputs: [],
      async method(input) {
        // ✅ CORRECT: Return object with publicOutput property
        return { publicOutput: input };
      }
    },
    
    addOne: {
      privateInputs: [],
      async method(input) {
        const result = input.add(Field(1));
        // ✅ CORRECT: Return object with publicOutput property
        return { publicOutput: result };
      }
    }
  }
});

// MORE COMPLEX CORRECT PATTERN
const ComplexCorrectProgram = ZkProgram({
  name: 'ComplexCorrect',
  publicInput: Field,
  publicOutput: Field,
  
  methods: {
    polynomial: {
      privateInputs: [Field, Field, Field],
      async method(x, a, b, c) {
        // Complex computation like the original ruthless benchmark
        let result = Field(0);
        
        // Simple polynomial: a*x^2 + b*x + c
        const xSquared = x.mul(x);
        const term1 = a.mul(xSquared);
        const term2 = b.mul(x);
        result = term1.add(term2).add(c);
        
        // ✅ CORRECT: Return object with publicOutput property
        return { publicOutput: result };
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
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log(`🚀 Starting CORRECT publicOutput pattern test`);
  console.log(`📍 Current backend: ${getCurrentBackend()}`);
  
  const programs = [
    { program: CorrectOutputProgram, name: 'CorrectOutputProgram' },
    { program: ComplexCorrectProgram, name: 'ComplexCorrectProgram' }
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
      console.log(`🎉 BOTH BACKENDS WORK! Time ratio: ${(sparkyResult.time / snarkyResult.time).toFixed(2)}x`);
    } else {
      console.log(`💥 Still failing - investigate further`);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`CORRECT publicOutput PATTERN VERIFIED`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ CORRECT PATTERN:`);
  console.log(`   async method(input) {`);
  console.log(`     const result = computeSomething(input);`);
  console.log(`     return { publicOutput: result };  // ← KEY: Return object`);
  console.log(`   }`);
  console.log(``);
  console.log(`❌ INCORRECT PATTERN (what I was doing):`);
  console.log(`   async method(input) {`);
  console.log(`     const result = computeSomething(input);`);
  console.log(`     return result;  // ← WRONG: Return value directly`);
  console.log(`   }`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Test script failed:', error);
    process.exit(1);
  });
}