import { Field } from './dist/node/index.js';

// Test RangeCheck0 functionality
console.log('Testing RangeCheck0 gate implementation...\n');

async function testRangeCheck() {
  try {
    // Switch to Sparky backend
    console.log('Switching to Sparky backend...');
    await Field.loadSparky();
    globalThis.switchBackend('sparky');
    
    // Test 1: Basic range check for small values
    console.log('\nTest 1: Basic range check for 8-bit value');
    const value1 = Field(255); // Maximum 8-bit value
    try {
      value1.rangeCheckHelper(8).seal();
      console.log('✅ Range check for 255 (8 bits) passed');
    } catch (e) {
      console.log('❌ Range check for 255 (8 bits) failed:', e.message);
    }
    
    // Test 2: Range check that should fail
    console.log('\nTest 2: Range check that should fail');
    const value2 = Field(256); // Too large for 8 bits
    try {
      value2.rangeCheckHelper(8).seal();
      console.log('❌ Range check for 256 (8 bits) should have failed but passed');
    } catch (e) {
      console.log('✅ Range check for 256 (8 bits) correctly failed:', e.message);
    }
    
    // Test 3: Range check for 88-bit value (RangeCheck0 limit)
    console.log('\nTest 3: Range check for 88-bit value');
    const value3 = Field(1n << 87n); // 2^87
    try {
      value3.rangeCheckHelper(88).seal();
      console.log('✅ Range check for 2^87 (88 bits) passed');
    } catch (e) {
      console.log('❌ Range check for 2^87 (88 bits) failed:', e.message);
    }
    
    // Test 4: Check constraint generation
    console.log('\nTest 4: Constraint generation check');
    const cs = globalThis.sparkyField.getConstraintSystem();
    const constraintCount = globalThis.sparkyField.getConstraintCount(cs);
    console.log(`Generated ${constraintCount} constraints`);
    
    // Test 5: Compare with Snarky
    console.log('\nTest 5: Comparing with Snarky backend');
    globalThis.switchBackend('snarky');
    globalThis.snarky.run_unchecked(() => {
      const snarkyValue = globalThis.snarky.field_var.constant(255n);
      // Note: Snarky uses different API for range checks
      console.log('Snarky backend switched successfully');
    });
    
  } catch (error) {
    console.error('Test failed with error:', error);
    console.error(error.stack);
  }
}

testRangeCheck().then(() => {
  console.log('\nRange check tests completed');
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});