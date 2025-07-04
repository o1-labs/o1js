#!/usr/bin/env node

/**
 * Minimal ZkProgram Test
 * 
 * Test the absolute minimum ZkProgram to isolate the field conversion issue
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Field, ZkProgram } from './dist/node/index.js';

console.log('🔍 Testing Minimal ZkProgram');
console.log('============================');

// The absolute minimal ZkProgram - just return the input
const MinimalProgram = ZkProgram({
  name: 'Minimal',
  publicInput: Field,
  publicOutput: Field,
  
  methods: {
    identity: {
      privateInputs: [],
      async method(input) {
        return input;
      }
    }
  }
});

// Even simpler - no inputs at all
const EmptyProgram = ZkProgram({
  name: 'Empty',
  publicInput: Field,
  publicOutput: Field,
  
  methods: {
    returnConstant: {
      privateInputs: [],
      async method(input) {
        return Field(42);
      }
    }
  }
});

// Test with Field operations
const BasicArithmetic = ZkProgram({
  name: 'BasicArithmetic',
  publicInput: Field,
  publicOutput: Field,
  
  methods: {
    addOne: {
      privateInputs: [],
      async method(input) {
        return input.add(Field(1));
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
    
    const { verificationKey } = await program.compile();
    
    console.log(`✅ ${programName} compiled successfully on ${backend}`);
    console.log(`📊 VK length: ${verificationKey.data.length}`);
    
    return true;
  } catch (error) {
    console.log(`❌ ${programName} failed on ${backend}: ${error.message}`);
    
    // Check if it's the field conversion error
    if (error.message.includes('Cannot read properties of undefined')) {
      console.log(`🚨 FIELD CONVERSION ERROR - this is the target issue`);
    }
    
    return false;
  }
}

async function main() {
  console.log(`🚀 Starting minimal ZkProgram tests`);
  console.log(`📍 Current backend: ${getCurrentBackend()}`);
  
  const programs = [
    { program: EmptyProgram, name: 'EmptyProgram' },
    { program: MinimalProgram, name: 'MinimalProgram' },
    { program: BasicArithmetic, name: 'BasicArithmetic' }
  ];
  
  for (const { program, name } of programs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TESTING: ${name}`);
    console.log(`${'='.repeat(60)}`);
    
    const snarkyResult = await testProgram(program, name, 'snarky');
    const sparkyResult = await testProgram(program, name, 'sparky');
    
    console.log(`\n📊 Results for ${name}:`);
    console.log(`  Snarky: ${snarkyResult ? '✅' : '❌'}`);
    console.log(`  Sparky: ${sparkyResult ? '✅' : '❌'}`);
    
    if (snarkyResult && sparkyResult) {
      console.log(`🎉 ${name} works on both backends!`);
      break; // If one works, we can build from there
    } else if (!snarkyResult && !sparkyResult) {
      console.log(`💥 ${name} fails on both backends - fundamental issue`);
    } else {
      console.log(`⚠️ ${name} backend-specific issue`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Minimal test failed:', error);
    process.exit(1);
  });
}