import { Field, Provable } from './dist/node/index.js';
import { constraintSystem } from './dist/node/lib/provable/core/provable-context.js';
import { switchBackend } from './dist/node/bindings.js';

async function testFieldConstant() {
  console.log('\n=== Testing Field Constant Behavior ===\n');
  
  await switchBackend('sparky');
  
  // Test 1: Just create a constant
  console.log('Test 1: Just Field(12)');
  const cs1 = await constraintSystem(() => {
    const c = Field(12);
    console.log('Constant:', c);
  });
  console.log(`Constraints: ${cs1.rows}`);
  
  // Test 2: Constant in assertEquals
  console.log('\nTest 2: x.assertEquals(Field(12))');
  const cs2 = await constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(12));
    x.assertEquals(Field(12));
  });
  console.log(`Constraints: ${cs2.rows}`);
  
  // Test 3: Manual constant creation and use
  console.log('\nTest 3: const c = Field(12); x.assertEquals(c)');
  const cs3 = await constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(12));
    const c = Field(12);
    console.log('x:', x);
    console.log('c:', c);
    x.assertEquals(c);
  });
  console.log(`Constraints: ${cs3.rows}`);
  
  console.log('\n=== End Test ===\n');
}

testFieldConstant().catch(console.error);