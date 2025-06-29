#!/usr/bin/env node

/**
 * Test to isolate backend switching issue
 */

import { Field, ZkProgram, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('🔄 Testing backend switching...');

await initializeBindings();

const TestProgram = ZkProgram({
  name: 'BackendSwitchTest',
  publicInput: Field,
  methods: {
    test: {
      privateInputs: [Field],
      method(publicInput, privateField) {
        privateField.assertEquals(publicInput);
      },
    },
  },
});

try {
  console.log('📋 Current backend:', getCurrentBackend());
  
  console.log('🔄 Switching to Snarky...');
  await switchBackend('snarky');
  console.log('✅ Switched to:', getCurrentBackend());
  
  console.log('🔨 Compiling with Snarky...');
  const { verificationKey: snarkyVK } = await TestProgram.compile();
  console.log('✅ Snarky compilation successful');

  console.log('🔄 Switching to Sparky...');
  await switchBackend('sparky');
  console.log('✅ Switched to:', getCurrentBackend());
  
  console.log('🔨 Compiling with Sparky...');
  const { verificationKey: sparkyVK } = await TestProgram.compile();
  console.log('✅ Sparky compilation successful');

  console.log('🔍 Comparing VKs...');
  const vksMatch = JSON.stringify(snarkyVK) === JSON.stringify(sparkyVK);
  console.log('🔑 VKs match:', vksMatch);
  
  console.log('🔧 Backend switching test complete!');

} catch (error) {
  console.log('💥 Backend switching failed:', error.message);
  console.log('📍 Stack:', error.stack);
}