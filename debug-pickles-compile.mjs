#!/usr/bin/env node
/**
 * Debug Pickles.compile() to see what's being passed
 */

import { Field, ZkProgram, switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Pickles } from './dist/node/bindings.js';

console.log('=== DEBUG PICKLES COMPILE ===\n');

// Simple test program
const TestProgram = ZkProgram({
  name: 'TestProgram',
  publicInput: Field,
  methods: {
    test: {
      privateInputs: [Field],
      async method(pub, x) {
        x.mul(2).assertEquals(pub);
      }
    }
  }
});

// Hook into Pickles.compile to see what's being passed
const originalCompile = Pickles.compile;
let snarkyArgs = null;
let sparkyArgs = null;

Pickles.compile = function(...args) {
  const backend = getCurrentBackend();
  console.log(`\n${backend.toUpperCase()} calling Pickles.compile with:`);
  console.log('  Rules length:', args[0]?.length || 0);
  
  if (args[0] && args[0][0]) {
    const rule = args[0][0];
    console.log('  First rule:');
    console.log('    identifier:', rule.identifier);
    console.log('    featureFlags:', rule.featureFlags);
    console.log('    proofsToVerify:', rule.proofsToVerify);
    console.log('    main:', typeof rule.main);
  }
  
  if (args[1]) {
    console.log('  Config:');
    console.log('    publicInputSize:', args[1].publicInputSize);
    console.log('    publicOutputSize:', args[1].publicOutputSize);
    console.log('    overrideWrapDomain:', args[1].overrideWrapDomain);
    console.log('    numChunks:', args[1].numChunks);
  }
  
  // Store args for comparison
  if (backend === 'snarky') {
    snarkyArgs = JSON.parse(JSON.stringify(args, (key, value) => 
      typeof value === 'function' ? '[Function]' : value
    ));
  } else {
    sparkyArgs = JSON.parse(JSON.stringify(args, (key, value) => 
      typeof value === 'function' ? '[Function]' : value
    ));
  }
  
  return originalCompile.apply(this, args);
};

async function test() {
  // Test with Snarky
  console.log('1. Compiling with Snarky...');
  await switchBackend('snarky');
  const snarkyResult = await TestProgram.compile();
  console.log('  VK hash:', snarkyResult.verificationKey.hash.toString().substring(0, 20) + '...');
  
  // Test with Sparky
  console.log('\n2. Compiling with Sparky...');
  await switchBackend('sparky');
  const sparkyResult = await TestProgram.compile();
  console.log('  VK hash:', sparkyResult.verificationKey.hash.toString().substring(0, 20) + '...');
  
  // Compare args
  console.log('\n3. Comparing Pickles.compile arguments...');
  
  if (snarkyArgs && sparkyArgs) {
    const snarkyStr = JSON.stringify(snarkyArgs, null, 2);
    const sparkyStr = JSON.stringify(sparkyArgs, null, 2);
    
    if (snarkyStr === sparkyStr) {
      console.log('  ❌ CRITICAL: Arguments to Pickles.compile are IDENTICAL!');
      console.log('     This explains why VKs are the same.');
    } else {
      console.log('  ✅ Arguments differ');
      
      // Find differences
      const findDifferences = (obj1, obj2, path = '') => {
        for (const key in obj1) {
          const newPath = path ? `${path}.${key}` : key;
          if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
            console.log(`  Difference at ${newPath}:`);
            console.log(`    Snarky: ${JSON.stringify(obj1[key]).substring(0, 100)}`);
            console.log(`    Sparky: ${JSON.stringify(obj2[key]).substring(0, 100)}`);
          }
        }
      };
      
      findDifferences(snarkyArgs, sparkyArgs);
    }
  }
  
  // Also check constraint systems
  console.log('\n4. Analyzing constraint systems...');
  await switchBackend('snarky');
  const snarkyCs = await TestProgram.analyzeMethods();
  console.log('  Snarky:', JSON.stringify(snarkyCs, null, 2));
  
  await switchBackend('sparky');
  const sparkyCs = await TestProgram.analyzeMethods();
  console.log('  Sparky:', JSON.stringify(sparkyCs, null, 2));
}

test().catch(console.error);