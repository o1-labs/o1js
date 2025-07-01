#!/usr/bin/env node
/**
 * VK Generation Investigation
 * Focused investigation of why Sparky generates identical VKs
 */

import { Field, ZkProgram, switchBackend, Circuit } from './dist/node/index.js';

console.log('=== VK GENERATION INVESTIGATION ===\n');

// Create two programs with clearly different constraints
const program1 = ZkProgram({
  name: 'Program1',
  publicInput: Field,
  methods: {
    test: {
      privateInputs: [Field],
      async method(pub, x) {
        x.assertEquals(pub); // Single assertion
      }
    }
  }
});

const program2 = ZkProgram({
  name: 'Program2', 
  publicInput: Field,
  methods: {
    test: {
      privateInputs: [Field, Field],
      async method(pub, x, y) {
        x.mul(y).assertEquals(pub); // Multiplication + assertion
      }
    }
  }
});

async function investigateVKGeneration() {
  console.log('Testing with two clearly different programs:\n');
  console.log('Program1: x.assertEquals(pub)');
  console.log('Program2: x.mul(y).assertEquals(pub)\n');
  
  // Test with Snarky first (known good case)
  console.log('=== SNARKY BACKEND ===');
  await switchBackend('snarky');
  
  console.log('Compiling Program1...');
  const snarky1 = await program1.compile();
  const snarkyVK1 = snarky1.verificationKey.hash.toString();
  console.log(`VK1: ${snarkyVK1.substring(0, 20)}...`);
  
  console.log('Compiling Program2...');
  const snarky2 = await program2.compile();
  const snarkyVK2 = snarky2.verificationKey.hash.toString();
  console.log(`VK2: ${snarkyVK2.substring(0, 20)}...`);
  
  console.log(`Snarky VKs identical: ${snarkyVK1 === snarkyVK2 ? '❌ PROBLEM' : '✅ GOOD'}\n`);
  
  // Test with Sparky (problematic case)
  console.log('=== SPARKY BACKEND ===');
  await switchBackend('sparky');
  
  console.log('Compiling Program1...');
  const sparky1 = await program1.compile();
  const sparkyVK1 = sparky1.verificationKey.hash.toString();
  console.log(`VK1: ${sparkyVK1.substring(0, 20)}...`);
  
  console.log('Compiling Program2...');
  const sparky2 = await program2.compile();
  const sparkyVK2 = sparky2.verificationKey.hash.toString();
  console.log(`VK2: ${sparkyVK2.substring(0, 20)}...`);
  
  console.log(`Sparky VKs identical: ${sparkyVK1 === sparkyVK2 ? '❌ PROBLEM' : '✅ GOOD'}\n`);
  
  // Analyze the issue
  console.log('=== ANALYSIS ===');
  
  if (sparkyVK1 === sparkyVK2) {
    console.log('🚨 CONFIRMED: Sparky generates identical VKs for different programs!');
    console.log('\nPossible causes:');
    console.log('1. Constraint bridge is not working - constraints not flowing from Sparky to Pickles');
    console.log('2. VK generation is using dummy/hardcoded constraints');
    console.log('3. Constraint accumulation is getting reset between programs');
    console.log('4. Sparky constraint system is not being properly converted to OCaml format');
    
    // Check if the VK is the dummy one
    console.log('\nChecking against known dummy VK...');
    
    // Get dummy VK by compiling empty program
    const emptyProgram = ZkProgram({
      name: 'Empty',
      publicInput: Field,
      methods: {
        test: {
          privateInputs: [],
          async method(pub) {
            // No constraints
          }
        }
      }
    });
    
    const empty = await emptyProgram.compile();
    const emptyVK = empty.verificationKey.hash.toString();
    console.log(`Empty program VK: ${emptyVK.substring(0, 20)}...`);
    
    if (sparkyVK1 === emptyVK) {
      console.log('💡 Sparky is using the EMPTY constraint system for all programs!');
      console.log('   This means the constraint bridge is completely broken.');
    } else {
      console.log('💡 Sparky is using some fixed constraint system, but not empty.');
      console.log('   This suggests partial constraint bridge functionality.');
    }
  } else {
    console.log('✅ Sparky correctly generates different VKs');
  }
  
  console.log('\n=== CONSTRAINT SYSTEM INSPECTION ===');
  
  // Let's look at constraint systems directly
  await switchBackend('sparky');
  
  try {
    console.log('\nGetting constraint system for x.assertEquals(pub)...');
    const cs1 = await Circuit.constraintSystem(() => {
      const pub = Field(1);
      const x = Field(2);
      x.assertEquals(pub);
    });
    console.log(`CS1 gates: ${cs1.gates.length}`);
    console.log(`CS1 first gate: ${JSON.stringify(cs1.gates[0] || {}, null, 2)}`);
    
    console.log('\nGetting constraint system for x.mul(y).assertEquals(pub)...');
    const cs2 = await Circuit.constraintSystem(() => {
      const pub = Field(3);
      const x = Field(2);
      const y = Field(1);
      x.mul(y).assertEquals(pub);
    });
    console.log(`CS2 gates: ${cs2.gates.length}`);
    console.log(`CS2 first gate: ${JSON.stringify(cs2.gates[0] || {}, null, 2)}`);
    
    console.log(`\nConstraint systems identical: ${JSON.stringify(cs1) === JSON.stringify(cs2) ? '❌ PROBLEM' : '✅ GOOD'}`);
    
    if (cs1.gates.length === 0 && cs2.gates.length === 0) {
      console.log('🚨 Both constraint systems are EMPTY! Sparky is not generating any constraints.');
    }
    
  } catch (error) {
    console.error('Error getting constraint systems:', error.message);
  }
}

investigateVKGeneration().catch(console.error);