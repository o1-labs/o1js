#!/usr/bin/env node

import { switchBackend, Field, ZkProgram } from './dist/node/index.js';

console.log('🔧 Testing wire assignment error logging...');

// Switch to Sparky backend
await switchBackend('sparky');
console.log('✅ Switched to Sparky backend');

// Create a simple program that uses multiple variables
const SimpleProgram = ZkProgram({
  name: 'SimpleWireTest',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    simpleAdd: {
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
  const { verificationKey } = await SimpleProgram.compile();
  console.log('✅ Compilation successful');
  
  console.log('🧪 Creating proof...');
  const proof = await SimpleProgram.simpleAdd(Field(5), Field(3));
  console.log('✅ Proof generated successfully');
  
  console.log('🔍 Verifying proof...');
  const verified = await SimpleProgram.verify(proof);
  console.log(`✅ Proof verification: ${verified}`);
  
} catch (error) {
  console.log('❌ Error occurred:');
  console.log(error.message);
  
  // Check if it's the expected permutation error
  if (error.message.includes('permutation was not constructed correctly')) {
    console.log('🎯 Expected permutation error - check console for wire assignment errors');
  }
}