/*
 * PRESERVED TEST FILE: debug-vk-generation.mjs
 * 
 * PRESERVATION REASON: Comprehensive VK analysis with detailed diagnostics
 * ORIGINAL PATH: ./debug-vk-generation.mjs
 * ARCHIVED: 2025-07-02T14:51:05.615Z
 * 
 * This file was preserved during test cleanup as a reference for
 * understanding the constraint routing bug and backend switching issues.
 */

#!/usr/bin/env node
/**
 * Debug VK Generation
 * Deep dive into why Sparky generates identical VKs
 */

import o1js from './dist/node/index.js';
const { Field, ZkProgram, switchBackend, Circuit } = o1js;

console.log('=== VK GENERATION DEBUG ===\n');

// Simple test programs with different constraints
const programs = {
  empty: ZkProgram({
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
  }),
  
  single: ZkProgram({
    name: 'Single',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field],
        async method(pub, x) {
          x.assertEquals(pub);
        }
      }
    }
  }),
  
  multiply: ZkProgram({
    name: 'Multiply',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field, Field],
        async method(pub, x, y) {
          x.mul(y).assertEquals(pub);
        }
      }
    }
  })
};

async function debugVKGeneration() {
  // First, let's check constraint systems
  console.log('1. Checking constraint systems...\n');
  
  for (const [name, program] of Object.entries(programs)) {
    console.log(`Program: ${name}`);
    
    // Get constraint system with Snarky
    await switchBackend('snarky');
    const snarkyCs = await program.analyzeMethods();
    console.log(`  Snarky gates: ${snarkyCs.test?.gates || 0}`);
    
    // Get constraint system with Sparky
    await switchBackend('sparky');
    const sparkyCs = await program.analyzeMethods();
    console.log(`  Sparky gates: ${sparkyCs.test?.gates || 0}`);
    
    console.log('');
  }
  
  // Now check VKs
  console.log('2. Checking verification keys...\n');
  
  const vks = { snarky: {}, sparky: {} };
  
  for (const [name, program] of Object.entries(programs)) {
    console.log(`Program: ${name}`);
    
    // Compile with Snarky
    await switchBackend('snarky');
    const { verificationKey: snarkyVK } = await program.compile();
    vks.snarky[name] = snarkyVK.hash.toString();
    console.log(`  Snarky VK: ${snarkyVK.hash.toString().substring(0, 20)}...`);
    
    // Compile with Sparky
    await switchBackend('sparky');
    const { verificationKey: sparkyVK } = await program.compile();
    vks.sparky[name] = sparkyVK.hash.toString();
    console.log(`  Sparky VK: ${sparkyVK.hash.toString().substring(0, 20)}...`);
    
    console.log('');
  }
  
  // Analysis
  console.log('3. Analysis...\n');
  
  // Check if all Sparky VKs are the same
  const sparkyVKValues = Object.values(vks.sparky);
  const uniqueSparkyVKs = new Set(sparkyVKValues);
  
  if (uniqueSparkyVKs.size === 1) {
    console.log('🚨 CRITICAL: All Sparky VKs are identical!');
    console.log(`   The VK hash is: ${sparkyVKValues[0]}`);
    console.log('\n   This indicates that Sparky is not properly capturing constraint differences.');
    console.log('   Likely issues:');
    console.log('   - Constraint system is not being passed to VK generation');
    console.log('   - VK generation is using a hardcoded/default constraint system');
    console.log('   - The Sparky → Pickles interface is broken');
  } else {
    console.log('✅ Sparky generates different VKs for different programs');
  }
  
  // Check Snarky VKs
  const snarkyVKValues = Object.values(vks.snarky);
  const uniqueSnarkyVKs = new Set(snarkyVKValues);
  console.log(`\nSnarky generates ${uniqueSnarkyVKs.size} unique VKs for ${snarkyVKValues.length} programs`);
  
  // Let's dive deeper into the constraint system JSON
  console.log('\n4. Constraint System JSON comparison...\n');
  
  // Use the simplest non-empty program
  const testProgram = programs.single;
  
  await switchBackend('snarky');
  const snarkySystem = await Circuit.constraintSystem(() => {
    const pub = Field(1);
    const x = Field(2);
    x.assertEquals(pub);
  });
  
  await switchBackend('sparky');
  const sparkySystem = await Circuit.constraintSystem(() => {
    const pub = Field(1);
    const x = Field(2);
    x.assertEquals(pub);
  });
  
  console.log('Snarky constraint system:');
  console.log(JSON.stringify(snarkySystem, null, 2).substring(0, 500) + '...\n');
  
  console.log('Sparky constraint system:');
  console.log(JSON.stringify(sparkySystem, null, 2).substring(0, 500) + '...\n');
  
  // Compare public input sizes
  console.log(`Snarky public_input_size: ${snarkySystem.publicInputSize}`);
  console.log(`Sparky public_input_size: ${sparkySystem.publicInputSize}`);
  console.log(`Snarky gates: ${snarkySystem.gates.length}`);
  console.log(`Sparky gates: ${sparkySystem.gates.length}`);
  
  // Save full constraint systems for analysis
  const fs = await import('fs');
  fs.writeFileSync('debug-snarky-cs.json', JSON.stringify(snarkySystem, null, 2));
  fs.writeFileSync('debug-sparky-cs.json', JSON.stringify(sparkySystem, null, 2));
  console.log('\nFull constraint systems saved to debug-snarky-cs.json and debug-sparky-cs.json');
}

debugVKGeneration().catch(console.error);