#!/usr/bin/env node
import { Field, Provable, switchBackend } from './dist/node/index.js';

console.log('Testing reduce_lincom_exact behavior with multiplication and assertEquals\n');

async function testMultiplicationFlow() {
  console.log('=== Testing with Sparky backend ===');
  await switchBackend('sparky');
  
  // Enable debug logging to see constraint generation
  process.env.RUST_LOG = 'debug';
  
  console.log('\n1. Simple multiplication test:');
  try {
    Provable.runAndCheck(() => {
      const x = Provable.witness(Field, () => Field(2));
      const y = x.mul(3);
      console.log('Created y = x * 3');
      
      // This assertEquals will trigger reduce_lincom_exact
      y.assertEquals(Field(6));
      console.log('Called y.assertEquals(6)');
    });
    console.log('✓ Test passed');
  } catch (e) {
    console.error('✗ Test failed:', e.message);
  }
  
  console.log('\n2. Complex expression test:');
  try {
    Provable.runAndCheck(() => {
      const a = Provable.witness(Field, () => Field(2));
      const b = Provable.witness(Field, () => Field(3));
      
      // This creates a more complex linear combination
      const c = a.mul(5).add(b.mul(7));
      console.log('Created c = a * 5 + b * 7');
      
      // This will trigger reduce_lincom_exact with a complex expression
      c.assertEquals(Field(31)); // 2*5 + 3*7 = 31
      console.log('Called c.assertEquals(31)');
    });
    console.log('✓ Test passed');
  } catch (e) {
    console.error('✗ Test failed:', e.message);
  }
  
  console.log('\n3. Nested multiplication test:');
  try {
    Provable.runAndCheck(() => {
      const x = Provable.witness(Field, () => Field(2));
      
      // Create nested multiplications
      const y = x.mul(3);
      const z = y.mul(4);
      console.log('Created y = x * 3, z = y * 4');
      
      // This will trigger reduce_lincom_exact multiple times
      z.assertEquals(Field(24)); // 2 * 3 * 4 = 24
      console.log('Called z.assertEquals(24)');
    });
    console.log('✓ Test passed');
  } catch (e) {
    console.error('✗ Test failed:', e.message);
  }
  
  // Compare with Snarky
  console.log('\n\n=== Testing with Snarky backend (for comparison) ===');
  await switchBackend('snarky');
  
  console.log('\n1. Simple multiplication test (Snarky):');
  try {
    Provable.runAndCheck(() => {
      const x = Provable.witness(Field, () => Field(2));
      const y = x.mul(3);
      y.assertEquals(Field(6));
    });
    console.log('✓ Test passed');
  } catch (e) {
    console.error('✗ Test failed:', e.message);
  }
}

// Run the test
testMultiplicationFlow().catch(console.error);