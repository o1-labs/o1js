/**
 * Memory Pressure Determinism Test
 * 
 * This test demonstrates how memory pressure can affect computation determinism
 * in the current Sparky backend due to BigInt ↔ String conversion patterns.
 */

import { Field } from './dist/node/index.js';

// Create memory pressure function
function createMemoryPressure(sizeGB = 0.5) {
  const arrays = [];
  const arraySize = Math.floor((sizeGB * 1024 * 1024 * 1024) / 8); // 8 bytes per number
  
  console.log(`Creating ${sizeGB}GB memory pressure...`);
  
  for (let i = 0; i < 10; i++) {
    const arr = new Float64Array(arraySize / 10);
    for (let j = 0; j < arr.length; j++) {
      arr[j] = Math.random() * 1000000;
    }
    arrays.push(arr);
  }
  
  return () => {
    arrays.length = 0; // Clear memory
    if (global.gc) global.gc();
  };
}

// Test field operations under memory pressure
async function testFieldOperationsUnderMemoryPressure() {
  console.log('Testing field operations under memory pressure...\n');
  
  const testValues = [
    BigInt('123456789012345678901234567890'),
    BigInt('987654321098765432109876543210'),
    BigInt('111111111111111111111111111111'),
  ];
  
  // Test without memory pressure
  console.log('=== Normal Memory Conditions ===');
  const normalResults = [];
  
  for (const value of testValues) {
    const field = Field(value);
    const squared = field.square();
    const result = squared.add(field);
    normalResults.push(result.toString());
    console.log(`Input: ${value}`);
    console.log(`Result: ${result.toString()}\n`);
  }
  
  // Test with memory pressure
  console.log('=== Under Memory Pressure ===');
  const cleanup = createMemoryPressure(0.5);
  const pressureResults = [];
  
  // Force garbage collection to trigger memory allocation patterns
  if (global.gc) {
    global.gc();
    // Create more pressure by forcing multiple GC cycles
    for (let i = 0; i < 5; i++) {
      const temp = new Array(100000).fill(0).map(() => Math.random().toString(36));
      global.gc();
    }
  }
  
  for (const value of testValues) {
    const field = Field(value);
    const squared = field.square();
    const result = squared.add(field);
    pressureResults.push(result.toString());
    console.log(`Input: ${value}`);
    console.log(`Result: ${result.toString()}\n`);
  }
  
  cleanup();
  
  // Compare results
  console.log('=== Determinism Check ===');
  let allMatch = true;
  
  for (let i = 0; i < normalResults.length; i++) {
    const match = normalResults[i] === pressureResults[i];
    console.log(`Test ${i + 1}: ${match ? 'PASS' : 'FAIL'}`);
    if (!match) {
      console.log(`  Normal:   ${normalResults[i]}`);
      console.log(`  Pressure: ${pressureResults[i]}`);
      allMatch = false;
    }
  }
  
  console.log(`\nOverall determinism: ${allMatch ? 'PASS' : 'FAIL'}`);
  return allMatch;
}

// Main test execution
async function main() {
  console.log('Memory Pressure Determinism Test');
  console.log('='.repeat(50));
  
  try {
    const isDeterministic = await testFieldOperationsUnderMemoryPressure();
    
    if (!isDeterministic) {
      console.log('\n⚠️  DETERMINISM FAILURE DETECTED');
      console.log('Memory pressure affects computation results!');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed - computation is deterministic');
    }
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

main();