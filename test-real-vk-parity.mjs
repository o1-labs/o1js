#!/usr/bin/env node

/**
 * Test REAL VK parity with working Sparky backend
 */

import { Field, ZkProgram, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testRealVKParity() {
  console.log('=== REAL VK Parity Test ===\n');

  const SimpleProgram = ZkProgram({
    name: 'SimpleProgram',
    publicInput: Field,
    methods: {
      prove: {
        privateInputs: [Field],
        async method(publicInput, secret) {
          secret.square().assertEquals(publicInput);
        }
      }
    }
  });

  try {
    // Test 1: Snarky VK
    console.log('1. Testing Snarky VK generation...');
    await initializeBindings();
    await switchBackend('snarky');
    console.log(`   Backend: ${getCurrentBackend()}`);
    
    const snarkyResult = await SimpleProgram.compile();
    const snarkyVK = snarkyResult.verificationKey.hash.toString();
    console.log(`   Snarky VK: ${snarkyVK}\n`);

    // Test 2: Sparky VK
    console.log('2. Testing Sparky VK generation...');
    await switchBackend('sparky');
    console.log(`   Backend: ${getCurrentBackend()}`);
    
    // Add debugging hooks to trace constraint recording
    const bindings = globalThis.__picklesBindings;
    if (bindings && bindings.Snarky && bindings.Snarky.Gates) {
      const originalAddConstraint = bindings.Snarky.Gates.add_constraint;
      if (originalAddConstraint) {
        console.log('   Installing constraint monitoring...');
        bindings.Snarky.Gates.add_constraint = function(...args) {
          console.log('    🔍 CONSTRAINT ADDED via Gates.add_constraint:', args);
          return originalAddConstraint.apply(this, args);
        };
      }
    }
    
    console.log('   Compiling with Sparky...');
    const sparkyResult = await SimpleProgram.compile();
    const sparkyVK = sparkyResult.verificationKey.hash.toString();
    console.log(`   Sparky VK: ${sparkyVK}\n`);

    // Test 3: Comparison
    console.log('3. VK Comparison:');
    console.log(`   Snarky: ${snarkyVK}`);
    console.log(`   Sparky: ${sparkyVK}`);
    console.log(`   Match:  ${snarkyVK === sparkyVK ? '✅ YES' : '❌ NO'}`);
    
    if (snarkyVK !== sparkyVK) {
      console.log('\n🚨 VK PARITY ISSUE CONFIRMED!');
      console.log('   This validates VK_PARITY_FIX_PLAN.md findings');
    } else {
      console.log('\n✅ VK PARITY ACHIEVED!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRealVKParity().catch(console.error);