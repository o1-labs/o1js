import { Field, initializeBindings, switchBackend, Gadgets, Provable } from '../../dist/node/index.js';

const { rotate64 } = Gadgets;

async function debugRotate() {
  await initializeBindings();
  
  console.log('\n=== Testing basic rotation ===');
  
  // Test with a simple value
  const testValue = Field(0x0F); // 15 in decimal, 0000...1111 in binary
  console.log('Test value:', testValue.toBigInt().toString(16));
  
  // Test with Snarky
  await switchBackend('snarky');
  console.log('\nSnarky backend:');
  
  try {
    // Test inside provable context
    await Provable.runAndCheck(() => {
      const rotated4 = rotate64(testValue, 4, 'left');
      console.log('Rotated left 4:', rotated4.toBigInt().toString(16));
    });
  } catch (e) {
    console.error('Snarky error:', e.message);
  }
  
  // Test with Sparky
  await switchBackend('sparky');
  console.log('\nSparky backend:');
  
  try {
    // Test inside provable context
    await Provable.runAndCheck(() => {
      const rotated4 = rotate64(testValue, 4, 'left');
      console.log('Rotated left 4:', rotated4.toBigInt().toString(16));
    });
  } catch (e) {
    console.error('Sparky error:', e.message);
  }
  
  // Test edge case: 0 rotation
  console.log('\n=== Testing 0 rotation ===');
  
  await switchBackend('snarky');
  try {
    await Provable.runAndCheck(() => {
      const rotated0 = rotate64(testValue, 0, 'left');
      console.log('Snarky - Rotated 0:', rotated0.toBigInt().toString(16));
    });
  } catch (e) {
    console.error('Snarky 0-rotation error:', e.message);
  }
  
  await switchBackend('sparky');
  try {
    await Provable.runAndCheck(() => {
      const rotated0 = rotate64(testValue, 0, 'left');
      console.log('Sparky - Rotated 0:', rotated0.toBigInt().toString(16));
    });
  } catch (e) {
    console.error('Sparky 0-rotation error:', e.message);
  }
  
  // Test right rotation
  console.log('\n=== Testing right rotation ===');
  const testValue2 = Field(0x0123456789ABCDEF);
  console.log('Input value:', testValue2.toBigInt().toString(16).padStart(16, '0'));
  console.log('Expected after right 4:', 'f0123456789abcde');
  
  await switchBackend('snarky');
  try {
    await Provable.runAndCheck(() => {
      const rotatedRight = rotate64(testValue2, 4, 'right');
      console.log('Snarky - Right 4:', rotatedRight.toBigInt().toString(16).padStart(16, '0'));
      
      // Also test inside constraint system
      Provable.asProver(() => {
        console.log('  Inside prover:', rotatedRight.toBigInt().toString(16).padStart(16, '0'));
      });
    });
  } catch (e) {
    console.error('Snarky right rotation error:', e.message);
  }
  
  await switchBackend('sparky');
  try {
    await Provable.runAndCheck(() => {
      const rotatedRight = rotate64(testValue2, 4, 'right');
      console.log('Sparky - Right 4:', rotatedRight.toBigInt().toString(16).padStart(16, '0'));
      
      // Also test inside constraint system
      Provable.asProver(() => {
        console.log('  Inside prover:', rotatedRight.toBigInt().toString(16).padStart(16, '0'));
      });
    });
  } catch (e) {
    console.error('Sparky right rotation error:', e.message);
  }
}

debugRotate().catch(console.error);