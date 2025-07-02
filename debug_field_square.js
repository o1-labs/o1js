/**
 * Debug script to test Field.square() with both backends
 */

import { Field, ZkProgram, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('=== Field.square() Debug Test ===\n');

async function testFieldSquare(backend) {
  console.log(`\n--- Testing with ${backend} backend ---`);
  
  await switchBackend(backend);
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  // Test 1: Constant square
  console.log('\n1. Testing constant square:');
  const x_const = Field(5);
  const square_const = x_const.square();
  console.log(`Field(5).square() = ${square_const.toString()} (should be 25)`);
  
  // Test 2: Variable square inside ZkProgram
  console.log('\n2. Testing variable square in ZkProgram:');
  
  const SquareProgram = ZkProgram({
    name: 'SquareProgram',
    publicInput: Field,
    methods: {
      squareIt: {
        privateInputs: [],
        method(input) {
          const result = input.square();
          console.log(`  Inside method: input.square() called`);
          return result;
        }
      }
    }
  });
  
  try {
    console.log('  Compiling ZkProgram...');
    await SquareProgram.compile();
    console.log('  ✓ Compilation successful');
    
    console.log('  Creating proof for Field(7)...');
    const proof = await SquareProgram.squareIt(Field(7));
    console.log('  ✓ Proof creation successful');
    console.log(`  Proof output: ${proof.publicOutput.toString()} (should be 49)`);
    
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    console.log(`  Stack: ${error.stack}`);
  }
}

async function main() {
  try {
    // Test with Snarky backend first
    await testFieldSquare('snarky');
    
    // Test with Sparky backend
    await testFieldSquare('sparky');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main().catch(console.error);