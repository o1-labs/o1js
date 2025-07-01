#!/usr/bin/env node

/**
 * Debug single program compilation to see detailed constraint bridge output
 */

import { Field, ZkProgram } from './dist/node/index.js';
import { switchBackend } from './dist/node/bindings.js';

const SimpleProgram = ZkProgram({
  name: 'debug-program',
  publicInput: Field,
  methods: {
    test: {
      privateInputs: [],
      method(publicInput) {
        publicInput.assertEquals(Field(5));
      }
    }
  }
});

async function testSingleProgram() {
  console.log('🔍 DEBUG: Single Program Compilation');
  console.log('=====================================\n');
  
  console.log('Switching to Sparky...');
  await switchBackend('sparky');
  
  console.log('Compiling program...');
  const result = await SimpleProgram.compile();
  
  console.log('VK:', result.verificationKey.hash.toString());
}

testSingleProgram().catch(console.error);