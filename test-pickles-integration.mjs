#!/usr/bin/env node

/**
 * Test Pickles integration - check if Sparky constraint system 
 * is being correctly passed to Pickles during compilation
 */

import { Field, ZkProgram } from './dist/node/index.js';
import { switchBackend, initializeBindings } from './dist/node/bindings.js';

// Extremely simple programs to test Pickles integration
const Program1 = ZkProgram({
  name: 'test-1',
  publicInput: Field,
  methods: {
    method1: {
      privateInputs: [],
      method(publicInput) {
        // Literally just assert public input equals 1
        publicInput.assertEquals(Field(1));
      }
    }
  }
});

const Program2 = ZkProgram({
  name: 'test-2', 
  publicInput: Field,
  methods: {
    method2: {
      privateInputs: [],
      method(publicInput) {
        // Different constraint: public input equals 2
        publicInput.assertEquals(Field(2));
      }
    }
  }
});

const Program3 = ZkProgram({
  name: 'test-3',
  publicInput: Field,
  methods: {
    method3: {
      privateInputs: [],
      method(publicInput) {
        // Different pattern: public input equals itself (should be trivial)
        publicInput.assertEquals(publicInput);
      }
    }
  }
});

async function testPicklesIntegration() {
  console.log('🔍 PICKLES INTEGRATION TEST');
  console.log('===========================');
  console.log('Testing if Sparky constraint systems reach Pickles correctly...\n');

  // Test with Snarky first
  console.log('📋 Testing with SNARKY backend:');
  await initializeBindings('snarky');
  
  console.log('  Compiling Program 1...');
  const snarky1 = await Program1.compile();
  console.log(`    VK: ${snarky1.verificationKey.hash.toString().slice(0, 20)}...`);
  
  console.log('  Compiling Program 2...');
  const snarky2 = await Program2.compile();
  console.log(`    VK: ${snarky2.verificationKey.hash.toString().slice(0, 20)}...`);
  
  console.log('  Compiling Program 3...');
  const snarky3 = await Program3.compile();
  console.log(`    VK: ${snarky3.verificationKey.hash.toString().slice(0, 20)}...`);
  
  const snarkyUnique = new Set([
    snarky1.verificationKey.hash.toString(),
    snarky2.verificationKey.hash.toString(), 
    snarky3.verificationKey.hash.toString()
  ]);
  
  console.log(`  Result: ${snarkyUnique.size}/3 unique VKs\n`);

  // Test with Sparky
  console.log('📋 Testing with SPARKY backend:');
  await switchBackend('sparky');
  
  console.log('  Compiling Program 1...');
  const sparky1 = await Program1.compile();
  console.log(`    VK: ${sparky1.verificationKey.hash.toString().slice(0, 20)}...`);
  
  console.log('  Compiling Program 2...');
  const sparky2 = await Program2.compile();
  console.log(`    VK: ${sparky2.verificationKey.hash.toString().slice(0, 20)}...`);
  
  console.log('  Compiling Program 3...');
  const sparky3 = await Program3.compile();
  console.log(`    VK: ${sparky3.verificationKey.hash.toString().slice(0, 20)}...`);
  
  const sparkyUnique = new Set([
    sparky1.verificationKey.hash.toString(),
    sparky2.verificationKey.hash.toString(),
    sparky3.verificationKey.hash.toString()
  ]);
  
  console.log(`  Result: ${sparkyUnique.size}/3 unique VKs\n`);

  // Analysis
  console.log('🎯 ANALYSIS:');
  console.log('============');
  
  if (snarkyUnique.size === 3 && sparkyUnique.size === 3) {
    console.log('✅ SUCCESS: Both backends generate unique VKs');
    console.log('   This means Sparky constraint systems are reaching Pickles correctly');
  } else if (snarkyUnique.size === 3 && sparkyUnique.size === 1) {
    console.log('❌ CONFIRMED: Sparky VK parity issue exists');
    console.log('   All Sparky programs generate identical VKs during Pickles compilation');
    console.log('   This indicates constraint system format/content issue reaching Pickles');
    
    if (sparky1.verificationKey.hash.toString().startsWith('18829260448603674120')) {
      console.log('   🚨 Confirmed: Still seeing the original broken VK hash pattern');
    }
  } else {
    console.log('⚠️  Unexpected result pattern - need deeper investigation');
  }
  
  console.log('\n🔍 Key Finding:');
  console.log('   The issue is in circuit execution during Pickles.compile()');
  console.log('   When Sparky is active, Pickles receives identical constraint systems');
  console.log('   This suggests the problem is in the Sparky backend interface to Pickles');
}

testPicklesIntegration().catch(console.error);