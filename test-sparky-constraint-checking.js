import { Field, Provable } from './dist/node/index.js';
import { switchBackend } from './dist/node/index.js';

async function testConstraintChecking() {
  console.log('🔍 Testing Sparky Constraint Checking Implementation\n');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  
  console.log('Test 1: Valid constraint (3 * 4 = 12) - should pass');
  try {
    await Provable.runAndCheck(() => {
      const a = Provable.witness(Field, () => Field(3));
      const b = Provable.witness(Field, () => Field(4));
      const product = a.mul(b);
      product.assertEquals(Field(12));
    });
    console.log('  ✅ Valid constraint passed as expected');
  } catch (error) {
    console.log(`  ❌ UNEXPECTED: Valid constraint failed: ${error.message}`);
  }
  
  console.log('\nTest 2: Invalid constraint (3 * 4 = 10) - should fail');
  try {
    await Provable.runAndCheck(() => {
      const a = Provable.witness(Field, () => Field(3));
      const b = Provable.witness(Field, () => Field(4));
      const product = a.mul(b);
      
      // This should fail because 3 * 4 ≠ 10
      product.assertEquals(Field(10));
    });
    console.log('  ❌ CRITICAL: Invalid constraint passed when it should fail!');
  } catch (error) {
    console.log('  ✅ Invalid constraint correctly failed:', error.message);
  }
  
  console.log('\nTest 3: Debug witness values and eval_constraints state');
  try {
    await Provable.runAndCheck(() => {
      console.log('    Creating witnesses...');
      const a = Provable.witness(Field, () => {
        console.log('    Witness a = 3');
        return Field(3);
      });
      const b = Provable.witness(Field, () => {
        console.log('    Witness b = 4');
        return Field(4);
      });
      
      console.log('    Computing product...');
      const product = a.mul(b);
      console.log('    Product computed, now asserting equality...');
      
      // This should fail
      product.assertEquals(Field(999));
      console.log('    Assertion completed (this should not print if constraint checking works)');
    });
    console.log('  ❌ CRITICAL: Constraint checking is not working!');
  } catch (error) {
    console.log('  ✅ Constraint checking is working:', error.message);
  }
  
  console.log('\nTest 4: Comparing with Snarky behavior');
  await switchBackend('snarky');
  console.log('Switched to Snarky backend');
  
  try {
    await Provable.runAndCheck(() => {
      const a = Provable.witness(Field, () => Field(3));
      const b = Provable.witness(Field, () => Field(4));
      const product = a.mul(b);
      product.assertEquals(Field(999)); // Should fail
    });
    console.log('  ❌ Snarky also not catching the error?');
  } catch (error) {
    console.log('  ✅ Snarky correctly fails:', error.message);
  }
}

testConstraintChecking().catch(console.error);