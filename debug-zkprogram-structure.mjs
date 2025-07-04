#!/usr/bin/env node

/**
 * Test ZkProgram Structure Issue
 * 
 * Test different ZkProgram structures to identify what causes the field conversion error
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Field, ZkProgram } from './dist/node/index.js';

console.log('🔍 Testing ZkProgram Structure');
console.log('==============================');

// Test 1: Working pattern (no publicOutput, no return)
const NoOutputProgram = ZkProgram({
  name: 'NoOutput',
  publicInput: Field,
  // NO publicOutput field
  
  methods: {
    testConstraint: {
      privateInputs: [Field],
      method(publicInput, privateInput) {
        // Just assert constraints, no return
        const sum = publicInput.add(privateInput);
        sum.assertEquals(Field(10));
      }
    }
  }
});

// Test 2: With publicOutput but no return (should this work?)
const OutputNoReturnProgram = ZkProgram({
  name: 'OutputNoReturn',
  publicInput: Field,
  publicOutput: Field,  // Has publicOutput
  
  methods: {
    testConstraint: {
      privateInputs: [Field],
      method(publicInput, privateInput) {
        // Has publicOutput but doesn't return anything - what happens?
        const sum = publicInput.add(privateInput);
        sum.assertEquals(Field(10));
        // No return statement
      }
    }
  }
});

// Test 3: With publicOutput AND return (my failing pattern)
const OutputWithReturnProgram = ZkProgram({
  name: 'OutputWithReturn',
  publicInput: Field,
  publicOutput: Field,  // Has publicOutput
  
  methods: {
    testConstraint: {
      privateInputs: [Field],
      method(publicInput, privateInput) {
        const sum = publicInput.add(privateInput);
        return sum;  // Returns a value
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
    
    // Check the specific error type
    if (error.message.includes('Cannot read properties of undefined')) {
      console.log(`🚨 FIELD CONVERSION ERROR`);
    } else if (error.message.includes('publicOutput')) {
      console.log(`🚨 PUBLIC OUTPUT ERROR`);
    } else {
      console.log(`🚨 OTHER ERROR`);
    }
    
    return false;
  }
}

async function main() {
  console.log(`🚀 Starting ZkProgram structure tests`);
  console.log(`📍 Current backend: ${getCurrentBackend()}`);
  
  const programs = [
    { program: NoOutputProgram, name: 'NoOutputProgram' },
    { program: OutputNoReturnProgram, name: 'OutputNoReturnProgram' },
    { program: OutputWithReturnProgram, name: 'OutputWithReturnProgram' }
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
    } else if (!snarkyResult && !sparkyResult) {
      console.log(`💥 ${name} fails on both backends`);
    } else {
      console.log(`⚠️ ${name} backend-specific issue`);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ANALYSIS`);
  console.log(`${'='.repeat(60)}`);
  console.log(`If NoOutputProgram works but OutputWithReturnProgram fails,`);
  console.log(`then the issue is with publicOutput + return value handling.`);
  console.log(`If OutputNoReturnProgram works, then the issue is specifically`);
  console.log(`with the return value processing when publicOutput is present.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Structure test failed:', error);
    process.exit(1);
  });
}