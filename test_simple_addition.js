import { Field, Provable } from './dist/node/index.js';
import { constraintSystem } from './dist/node/lib/provable/core/provable-context.js';
import { switchBackend } from './dist/node/bindings.js';

async function testSimpleAddition() {
  console.log('\n=== Testing Simple Addition ===\n');
  
  // Test with Sparky
  await switchBackend('sparky');
  console.log('Backend: Sparky');
  
  // Test 1: Simple add without assertEquals
  console.log('\nTest 1: x.add(y) without assertEquals');
  const cs1 = await constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(7));
    const result = x.add(y);
    // Don't assert anything
  });
  console.log(`Constraints: ${cs1.rows}`);
  
  // Test 2: Add with assertEquals to constant
  console.log('\nTest 2: x.add(y).assertEquals(Field(12))');
  const cs2 = await constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(7));
    const result = x.add(y);
    console.log('Addition result:', result);
    result.assertEquals(Field(12));
  });
  console.log(`Constraints: ${cs2.rows}`);
  
  // Test 3: Add with assertEquals to variable
  console.log('\nTest 3: x.add(y).assertEquals(z)');
  const cs3 = await constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(7));
    const z = Provable.witness(Field, () => Field(12));
    x.add(y).assertEquals(z);
  });
  console.log(`Constraints: ${cs3.rows}`);
  
  console.log('\n=== End Test ===\n');
}

testSimpleAddition().catch(console.error);