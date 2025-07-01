#!/usr/bin/env node
/**
 * Quick VK Test - Verify the core VK issue
 */

import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

console.log('=== QUICK VK TEST ===\n');

// Define 3 very different programs
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
  
  complex: ZkProgram({
    name: 'Complex',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field, Field, Field],
        async method(pub, x, y, z) {
          x.mul(y).add(z).assertEquals(pub);
        }
      }
    }
  })
};

async function test() {
  const results = {};
  
  // Test with Snarky
  console.log('Testing with Snarky...');
  await switchBackend('snarky');
  
  for (const [name, program] of Object.entries(programs)) {
    const { verificationKey } = await program.compile();
    const hash = verificationKey.hash.toString();
    results[name] = { snarky: hash };
    console.log(`  ${name}: ${hash.substring(0, 20)}...`);
  }
  
  // Test with Sparky
  console.log('\nTesting with Sparky...');
  await switchBackend('sparky');
  
  for (const [name, program] of Object.entries(programs)) {
    const { verificationKey } = await program.compile();
    const hash = verificationKey.hash.toString();
    results[name].sparky = hash;
    console.log(`  ${name}: ${hash.substring(0, 20)}...`);
  }
  
  // Analysis
  console.log('\n=== ANALYSIS ===');
  
  // Check if all Sparky VKs are the same
  const sparkyVKs = Object.values(results).map(r => r.sparky);
  const uniqueSparkyVKs = new Set(sparkyVKs);
  
  if (uniqueSparkyVKs.size === 1) {
    console.log('\n🚨 CRITICAL ISSUE CONFIRMED: All Sparky VKs are identical!');
    console.log(`   The VK is: ${sparkyVKs[0]}`);
  } else {
    console.log('\n✅ Good news: Sparky generates different VKs for different programs');
  }
  
  // Check matches
  console.log('\nPer-program comparison:');
  for (const [name, result] of Object.entries(results)) {
    const match = result.snarky === result.sparky;
    console.log(`  ${name}: ${match ? '✅ Match' : '❌ Different'}`);
    if (!match) {
      console.log(`    Snarky: ${result.snarky.substring(0, 30)}...`);
      console.log(`    Sparky: ${result.sparky.substring(0, 30)}...`);
    }
  }
  
  // Check constraint counts
  console.log('\nConstraint analysis:');
  await switchBackend('snarky');
  for (const [name, program] of Object.entries(programs)) {
    const cs = await program.analyzeMethods();
    const rows = Object.values(cs)[0]?.rows || 0;
    console.log(`  ${name} (Snarky): ${rows} rows`);
  }
  
  await switchBackend('sparky');
  for (const [name, program] of Object.entries(programs)) {
    const cs = await program.analyzeMethods();
    const rows = Object.values(cs)[0]?.rows || 0;
    console.log(`  ${name} (Sparky): ${rows} rows`);
  }
}

test().catch(console.error);