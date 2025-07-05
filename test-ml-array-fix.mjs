#!/usr/bin/env node

/**
 * TEST SCRIPT: ML Array Fix Verification
 * 
 * This script tests whether the ML Array parsing fixes resolve the compilation issue.
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Field, Provable } from './dist/node/index.js';

console.log('🧪 ML Array Fix Verification Test');
console.log('==================================\n');

async function testMLArrayParsing() {
  try {
    console.log('🎯 Step 1: Switch to Sparky backend');
    await switchBackend('sparky');
    console.log(`✅ Current backend: ${getCurrentBackend()}`);
    
    console.log('\n🎯 Step 2: Test basic Field operations that might trigger ML Array parsing');
    
    // Test basic field constant creation
    console.log('📋 Test 2a: Basic field constant');
    const field1 = Field(42);
    console.log('✅ Field(42) created successfully');
    
    // Test field arithmetic that might create multiple constants
    console.log('📋 Test 2b: Field arithmetic operations');
    const field2 = Field(10);
    const field3 = Field(20);
    const sum = field2.add(field3);
    console.log('✅ Field arithmetic completed successfully');
    
    // Test witness creation which might use ML Arrays
    console.log('📋 Test 2c: Witness creation');
    const witness = Provable.witness(Field, () => Field(100));
    console.log('✅ Witness creation completed successfully');
    
    console.log('\n🎯 Step 3: Test constraint generation that would trigger ML Array parsing');
    
    // Test constraint generation in a simple circuit
    console.log('📋 Test 3a: Simple constraint generation');
    const result = await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field(5));
      const b = Provable.witness(Field, () => Field(10));
      const c = a.add(b);
      c.assertEquals(Field(15));
      return c;
    });
    
    console.log('✅ Constraint generation completed successfully');
    console.log(`📊 Generated ${result.summary.total} constraints`);
    console.log(`📊 Public inputs: ${result.summary.publicInputs}`);
    
    console.log('\n🎉 SUCCESS: All ML Array parsing tests passed!');
    console.log('The ML Array fix appears to be working correctly.');
    
  } catch (error) {
    console.log('\n🚨 ERROR during ML Array testing:');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    
    // Check if this is still the ML Array format error
    if (error.message.includes('Invalid FieldVar format') || 
        error.message.includes('expected constant with 1 argument, got 4 arguments')) {
      console.log('\n❌ ML Array issue still exists!');
      console.log('📊 The fix did not resolve the parsing error');
      
      // Show stack trace for debugging
      if (error.stack) {
        console.log('\n📋 Error stack trace:');
        console.log(error.stack);
      }
      
    } else {
      console.log('\n🔍 This appears to be a different error, not the ML Array issue');
    }
    
    return false;
  }
  
  return true;
}

async function testSnarkyComparison() {
  try {
    console.log('\n🔍 Step 4: Compare with Snarky backend');
    await switchBackend('snarky');
    console.log(`✅ Switched to: ${getCurrentBackend()}`);
    
    // Run the same test with Snarky
    const result = await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field(5));
      const b = Provable.witness(Field, () => Field(10));
      const c = a.add(b);
      c.assertEquals(Field(15));
      return c;
    });
    
    console.log('✅ Snarky constraint generation completed');
    console.log(`📊 Generated ${result.summary.total} constraints`);
    
  } catch (error) {
    console.log('\n🚨 Snarky backend error:');
    console.log('Error message:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting ML Array fix verification...\n');
  
  const sparkySuccess = await testMLArrayParsing();
  await testSnarkyComparison();
  
  console.log('\n🎯 Test Results Summary:');
  console.log('========================');
  
  if (sparkySuccess) {
    console.log('✅ ML Array parsing fix: SUCCESS');
    console.log('✅ Sparky backend: Basic operations working');
    console.log('✅ Constraint generation: Working correctly');
    console.log('\n🎉 The ML Array fix appears to have resolved the issue!');
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Test with actual SmartContract compilation');
    console.log('2. Run comprehensive test suite');
    console.log('3. Verify VK generation works correctly');
    
  } else {
    console.log('❌ ML Array parsing fix: FAILED');
    console.log('❌ The compilation issue still exists');
    console.log('\n🔧 Debug Steps:');
    console.log('1. Check if the ML Array detection logic is being triggered');
    console.log('2. Add more debug logging to the Rust parser');
    console.log('3. Investigate the exact format of arrays coming from OCaml');
  }
  
  // Mark todo as completed
  console.log('\n📝 Updating todo status...');
}

main().catch(console.error);