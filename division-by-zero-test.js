/**
 * Division by Zero Error Handling Test
 * This test identifies the exact behavioral differences between Snarky and Sparky backends
 */

import { Field, switchBackend, Provable } from './dist/node/index.js';

async function testDivisionByZero(backend) {
  console.log(`\n=== Testing Division by Zero with ${backend.toUpperCase()} ===`);
  
  await switchBackend(backend);
  
  // Test 1: Direct div() method
  console.log('Test 1: Field.div(0)');
  try {
    const a = Field(1);
    const zero = Field(0);
    const result = a.div(zero);
    console.log(`  ❌ UNEXPECTED: No error thrown, result: ${result.toBigInt()}`);
  } catch (error) {
    console.log(`  ✅ ERROR: ${error.message}`);
  }
  
  // Test 2: Direct inv() method
  console.log('Test 2: Field(0).inv()');
  try {
    const zero = Field(0);
    const result = zero.inv();
    console.log(`  ❌ UNEXPECTED: No error thrown, result: ${result.toBigInt()}`);
  } catch (error) {
    console.log(`  ✅ ERROR: ${error.message}`);
  }
  
  // Test 3: In circuit context
  console.log('Test 3: Division by zero in circuit context');
  try {
    await Provable.runAndCheck(() => {
      const a = Field(1);
      const zero = Field(0);
      a.div(zero);
    });
    console.log(`  ❌ UNEXPECTED: No error thrown in circuit`);
  } catch (error) {
    console.log(`  ✅ ERROR: ${error.message}`);
  }
  
  // Test 4: Witness context
  console.log('Test 4: Division by zero with witness');
  try {
    await Provable.runAndCheck(() => {
      const a = Provable.witness(Field, () => Field(1));
      const zero = Provable.witness(Field, () => Field(0));
      a.div(zero);
    });
    console.log(`  ❌ UNEXPECTED: No error thrown with witness`);
  } catch (error) {
    console.log(`  ✅ ERROR: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 Division by Zero Error Handling Analysis');
  console.log('=========================================');
  
  try {
    // Test with Snarky
    await testDivisionByZero('snarky');
    
    // Test with Sparky
    await testDivisionByZero('sparky');
    
    console.log('\n📊 Analysis Complete');
    console.log('Check output for inconsistencies between backends');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main().catch(console.error);