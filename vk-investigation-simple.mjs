#!/usr/bin/env node
/**
 * Simplified VK Investigation
 * Focus on the core issue: Why do all Sparky programs generate the same VK?
 */

import o1js from './dist/node/index.js';
const { Field, ZkProgram, switchBackend, getCurrentBackend } = o1js;

console.log('=== VK INVESTIGATION ===\n');

// Define test programs
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
        privateInputs: [],
        async method(pub) {
          pub.assertEquals(Field(1));
        }
      }
    }
  }),
  
  double: ZkProgram({
    name: 'Double',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field],
        async method(pub, x) {
          x.mul(2).assertEquals(pub);
        }
      }
    }
  })
};

async function checkVKs() {
  const results = { snarky: {}, sparky: {} };
  
  // Test with Snarky
  console.log('Testing with Snarky...');
  await switchBackend('snarky');
  
  for (const [name, program] of Object.entries(programs)) {
    const { verificationKey } = await program.compile();
    results.snarky[name] = verificationKey.hash.toString();
    console.log(`  ${name}: ${verificationKey.hash.toString().substring(0, 20)}...`);
  }
  
  // Test with Sparky
  console.log('\nTesting with Sparky...');
  await switchBackend('sparky');
  
  for (const [name, program] of Object.entries(programs)) {
    const { verificationKey } = await program.compile();
    results.sparky[name] = verificationKey.hash.toString();
    console.log(`  ${name}: ${verificationKey.hash.toString().substring(0, 20)}...`);
  }
  
  // Analysis
  console.log('\n=== ANALYSIS ===');
  
  // Check if Sparky VKs are all the same
  const sparkyVKs = Object.values(results.sparky);
  const uniqueSparkyVKs = new Set(sparkyVKs);
  
  if (uniqueSparkyVKs.size === 1) {
    console.log('\n🚨 CRITICAL ISSUE: All Sparky programs have the SAME VK!');
    console.log(`   The VK is: ${sparkyVKs[0]}`);
  } else {
    console.log('\n✅ Sparky generates different VKs for different programs');
  }
  
  // Check Snarky
  const snarkyVKs = Object.values(results.snarky);
  const uniqueSnarkyVKs = new Set(snarkyVKs);
  console.log(`\nSnarky generates ${uniqueSnarkyVKs.size} unique VKs for ${snarkyVKs.length} programs`);
  
  // Compare
  console.log('\nDirect comparison:');
  for (const name of Object.keys(programs)) {
    const match = results.snarky[name] === results.sparky[name];
    console.log(`  ${name}: ${match ? '✅ Match' : '❌ Different'}`);
  }
  
  // Save results
  const fs = await import('fs');
  fs.writeFileSync('vk-investigation-results.json', JSON.stringify(results, null, 2));
  console.log('\nResults saved to vk-investigation-results.json');
}

checkVKs().catch(console.error);