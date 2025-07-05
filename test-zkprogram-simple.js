// Simple ZkProgram Test
// Created: July 4, 2025 12:00 AM UTC
// Last Modified: July 4, 2025 12:00 AM UTC

import { Field, ZkProgram } from './dist/node/index.js';

// Minimal ZkProgram test
async function testMinimalZkProgram() {
  console.log('Testing minimal ZkProgram...');
  
  const MinimalProgram = ZkProgram({
    name: 'Minimal',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      identity: {
        privateInputs: [],
        method(input) {
          return input;
        }
      }
    }
  });
  
  try {
    console.log('Starting compilation...');
    const result = await MinimalProgram.compile();
    console.log('✅ Minimal ZkProgram compilation successful');
    console.log('Result:', result);
    return result;
  } catch (error) {
    console.log('❌ Minimal ZkProgram compilation failed:', error.message);
    console.log('Stack:', error.stack);
    return null;
  }
}

// Run the test
testMinimalZkProgram().catch(console.error);