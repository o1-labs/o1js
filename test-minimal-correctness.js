#!/usr/bin/env node

import { switchBackend, Field, ZkProgram } from './dist/node/index.js';

console.log('🔧 Running minimal mathematical correctness test...');

async function testWithBackend(backendName) {
  console.log(`\n🔄 Testing with ${backendName.toUpperCase()} backend...`);
  
  await switchBackend(backendName);
  console.log(`✅ Switched to ${backendName} backend`);

  // Create the simplest possible program
  const SimpleArithmetic = ZkProgram({
    name: 'SimpleArithmetic',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      add: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          const sum = publicInput.add(privateInput);
          return { publicOutput: sum };
        },
      },
    },
  });

  try {
    console.log('🏗️ Compiling program...');
    const { verificationKey } = await SimpleArithmetic.compile();
    console.log('✅ Compilation successful');
    console.log(`VK length: ${verificationKey.data.length} chars`);

    console.log('🧪 Creating proof...');
    const proof = await SimpleArithmetic.add(Field(10), Field(5));
    console.log('✅ Proof generated successfully');

    console.log('🔍 Verifying proof...');
    const verified = await SimpleArithmetic.verify(proof);
    console.log(`✅ Verification: ${verified}`);
    
    return { success: true, backend: backendName };
  } catch (error) {
    console.log(`❌ ${backendName} failed:`, error.message);
    return { success: false, backend: backendName, error: error.message };
  }
}

// Test both backends
const snarkyResult = await testWithBackend('snarky');
const sparkyResult = await testWithBackend('sparky');

console.log('\n📊 RESULTS SUMMARY:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Snarky: ${snarkyResult.success ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Sparky: ${sparkyResult.success ? '✅ PASS' : '❌ FAIL'}`);

if (!sparkyResult.success) {
  console.log('\n🔍 Sparky Error Analysis:');
  if (sparkyResult.error.includes('permutation')) {
    console.log('🎯 Permutation construction error - wire assignment issue');
  } else if (sparkyResult.error.includes('Index out of bounds')) {
    console.log('🎯 Index out of bounds - constraint system empty');
  } else {
    console.log('🎯 Different error:', sparkyResult.error);
  }
}