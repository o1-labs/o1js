#!/usr/bin/env node

import { switchBackend, Field, ZkProgram } from './dist/node/index.js';

console.log('🔧 Testing constraint generation with Sparky...');

// Switch to Sparky backend
await switchBackend('sparky');
console.log('✅ Switched to Sparky backend');

// Create a minimal program
const SimpleProgram = ZkProgram({
  name: 'SimpleTest',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    add: {
      privateInputs: [Field],
      async method(publicInput, privateInput) {
        // This should create some variables and constraints
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
  console.log('VK length:', verificationKey.data.length);
  
  console.log('🧪 Creating proof (this should show wire assignment errors)...');
  const proof = await SimpleProgram.add(Field(10), Field(5));
  console.log('✅ Proof generated - this is unexpected!');
  
} catch (error) {
  console.log('❌ Expected error occurred:');
  console.log('Error type:', error.constructor.name);
  console.log('Error message:', error.message);
  
  // Look for specific patterns
  if (error.message.includes('permutation')) {
    console.log('🎯 Got expected permutation error');
  }
  if (error.message.includes('Index out of bounds')) {
    console.log('🎯 Got index out of bounds error');
  }
}