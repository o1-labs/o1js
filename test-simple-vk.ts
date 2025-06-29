#!/usr/bin/env node

/**
 * Simple VK test to isolate the bundling issue
 */

import { Field, ZkProgram, initializeBindings } from './dist/node/index.js';

console.log('🔑 Simple VK test...');

await initializeBindings();

const SimpleProgram = ZkProgram({
  name: 'SimpleVKTest',
  publicInput: Field,
  methods: {
    test: {
      privateInputs: [Field], // 1 input = odd (previously broken)
      method(publicInput, privateField) {
        privateField.assertEquals(publicInput);
      },
    },
  },
});

console.log('📋 Testing basic compilation...');

try {
  const { verificationKey } = await SimpleProgram.compile();
  console.log('✅ Compilation successful!');
  console.log('🔑 VK exists:', !!verificationKey);
  console.log('🔧 Simple VK test complete!');
} catch (error) {
  console.log('💥 Failed:', error.message);
}