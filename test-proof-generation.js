#!/usr/bin/env node

import { switchBackend, Field, ZkProgram } from './dist/node/index.js';

console.log('🔧 Testing proof generation with wire assignment fix...');

// Switch to Sparky backend
await switchBackend('sparky');
console.log('✅ Switched to Sparky backend');

// Create a minimal program
const SimpleProgram = ZkProgram({
  name: 'WireTest',
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
  const { verificationKey } = await SimpleProgram.compile();
  console.log('✅ Compilation successful');
  
  console.log('🧪 Creating proof (this should show variable mapping)...');
  console.log('>>> Look for "🗺️ Variable-to-row mapping" logs <<<');
  
  const proof = await SimpleProgram.add(Field(10), Field(5));
  console.log('🎉 SUCCESS! Proof generated successfully!');
  console.log('This means the wire assignment fix is working!');
  
  console.log('🔍 Verifying proof...');
  const verified = await SimpleProgram.verify(proof);
  console.log(`✅ Proof verification: ${verified}`);
  
} catch (error) {
  console.log('❌ Error occurred:');
  console.log('Error message:', error.message);
  
  if (error.message.includes('permutation')) {
    console.log('🔍 Still getting permutation error - check wire assignment mapping logs above');
  } else {
    console.log('🎯 Different error - might be progress!');
  }
}