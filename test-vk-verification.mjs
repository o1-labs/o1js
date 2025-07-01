#!/usr/bin/env node
/**
 * Test VK verification - check that different programs actually generate different VKs
 */

import { Field, ZkProgram, switchBackend, initializeBindings } from './dist/node/index.js';

console.log('=== VK VERIFICATION TEST ===\n');

async function testVKGeneration() {
  console.log('Testing VK generation with Sparky...');
  await switchBackend('sparky');
  await initializeBindings();
  
  // Test 1: Empty program
  const EmptyProgram = ZkProgram({
    name: 'empty',
    publicInput: Field,
    methods: {
      run: {
        privateInputs: [],
        method(publicInput) {
          // No constraints
        }
      }
    }
  });
  
  // Test 2: Single constraint program
  const SingleProgram = ZkProgram({
    name: 'single',
    publicInput: Field,
    methods: {
      run: {
        privateInputs: [Field],
        method(publicInput, secret) {
          secret.assertEquals(publicInput);
        }
      }
    }
  });
  
  // Test 3: Multiple constraint program
  const MultipleProgram = ZkProgram({
    name: 'multiple',
    publicInput: Field,
    methods: {
      run: {
        privateInputs: [Field, Field],
        method(publicInput, a, b) {
          a.assertEquals(publicInput);
          b.assertEquals(a.add(1));
        }
      }
    }
  });
  
  try {
    console.log('Compiling programs...');
    
    const { verificationKey: emptyVK } = await EmptyProgram.compile();
    console.log('Empty program VK:', emptyVK.hash.toString().substring(0, 20) + '...');
    
    const { verificationKey: singleVK } = await SingleProgram.compile();
    console.log('Single program VK:', singleVK.hash.toString().substring(0, 20) + '...');
    
    const { verificationKey: multipleVK } = await MultipleProgram.compile();
    console.log('Multiple program VK:', multipleVK.hash.toString().substring(0, 20) + '...');
    
    // Check if they're different
    const emptyHash = emptyVK.hash.toString();
    const singleHash = singleVK.hash.toString();
    const multipleHash = multipleVK.hash.toString();
    
    console.log('\n=== VERIFICATION RESULTS ===');
    console.log('Empty vs Single:', emptyHash === singleHash ? '❌ SAME' : '✅ DIFFERENT');
    console.log('Empty vs Multiple:', emptyHash === multipleHash ? '❌ SAME' : '✅ DIFFERENT');
    console.log('Single vs Multiple:', singleHash === multipleHash ? '❌ SAME' : '✅ DIFFERENT');
    
    if (emptyHash === singleHash && singleHash === multipleHash) {
      console.log('\n❌ CRITICAL: All programs generate identical VKs!');
      console.log('VK Hash:', emptyHash);
      return false;
    } else {
      console.log('\n✅ SUCCESS: Different programs generate different VKs');
      return true;
    }
    
  } catch (error) {
    console.error('Error during compilation:', error.message);
    return false;
  }
}

testVKGeneration().then(success => {
  if (!success) {
    process.exit(1);
  }
}).catch(console.error);