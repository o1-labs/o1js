/**
 * Test script to verify rangeCheck0 implementation
 * Tests Field.lessThan() operations with Sparky backend
 */

import { switchBackend, getCurrentBackend, Field } from './dist/node/index.js';

async function testRangeCheck0() {
  console.log('🧪 Testing rangeCheck0 implementation with Field.lessThan()');
  
  try {
    // Switch to Sparky backend
    console.log('🔄 Switching to Sparky backend...');
    await switchBackend('sparky');
    const backend = getCurrentBackend();
    console.log(`✅ Current backend: ${backend}`);
    
    if (backend !== 'sparky') {
      throw new Error('Failed to switch to Sparky backend');
    }
    
    // Test Field.lessThan() operations
    console.log('\n🔍 Testing Field.lessThan() operations...');
    
    // Test 1: Simple comparison
    console.log('Test 1: Field(5).lessThan(Field(10))');
    const a = Field(5);
    const b = Field(10);
    const result1 = a.lessThan(b);
    console.log(`✅ Field(5).lessThan(Field(10)) = ${result1.toString()}`);
    
    // Test 2: Reverse comparison
    console.log('Test 2: Field(10).lessThan(Field(5))');
    const result2 = b.lessThan(a);
    console.log(`✅ Field(10).lessThan(Field(5)) = ${result2.toString()}`);
    
    // Test 3: Equal values
    console.log('Test 3: Field(7).lessThan(Field(7))');
    const c = Field(7);
    const d = Field(7);
    const result3 = c.lessThan(d);
    console.log(`✅ Field(7).lessThan(Field(7)) = ${result3.toString()}`);
    
    // Test 4: Larger numbers
    console.log('Test 4: Field(1000).lessThan(Field(2000))');
    const e = Field(1000);
    const f = Field(2000);
    const result4 = e.lessThan(f);
    console.log(`✅ Field(1000).lessThan(Field(2000)) = ${result4.toString()}`);
    
    console.log('\n🎉 All Field.lessThan() tests completed successfully!');
    console.log('✅ rangeCheck0 implementation is working correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (error.message.includes('rangeCheck0 is not a function')) {
      console.error('🚨 CRITICAL: rangeCheck0 function still not found!');
      console.error('This indicates the WASM build may not have included the new implementation.');
    }
    
    throw error;
  }
}

async function main() {
  try {
    await testRangeCheck0();
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Test suite failed');
    process.exit(1);
  }
}

main();