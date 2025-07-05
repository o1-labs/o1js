#!/usr/bin/env node
/**
 * BigInt Serialization Debug
 * 
 * Test how BigInt values are being serialized in the WASM input pipeline
 */

console.log('🔍 Testing BigInt serialization...');

// Test BigInt replacer function
const replacer = new Function('key', 'value', 'return typeof value === "bigint" ? value.toString() : value');

// Test cases
const testCases = [
  // Normal FieldVar with string
  [0, [0, "42"]],
  
  // FieldVar with BigInt
  [0, [0, 42n]],
  
  // Nested structure
  [0, [0, [0, "42"]]],
  
  // Complex case
  [0, [0, [0, 42n]]]
];

console.log('\n🧪 Testing serialization with replacer...');
testCases.forEach((testCase, i) => {
  console.log(`\nTest ${i + 1}:`, testCase);
  
  try {
    const jsonStr = JSON.stringify(testCase, replacer);
    console.log('JSON string:', jsonStr);
    
    const parsed = JSON.parse(jsonStr);
    console.log('Parsed back:', parsed);
    
    // Check structure
    if (Array.isArray(parsed) && parsed.length === 2) {
      console.log('  Type:', parsed[0]);
      console.log('  Value:', parsed[1]);
      
      if (Array.isArray(parsed[1])) {
        console.log('  Value type:', parsed[1][0]);
        console.log('  Value data:', parsed[1][1]);
        console.log('  Value data type:', typeof parsed[1][1]);
        
        if (Array.isArray(parsed[1][1])) {
          console.log('  ⚠️  TRIPLE NESTING DETECTED!');
          console.log('  Inner structure:', parsed[1][1]);
        }
      }
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
});

console.log('\n🔍 Testing manual BigInt conversion...');
const bigintValue = 42n;
console.log('BigInt value:', bigintValue);
console.log('BigInt typeof:', typeof bigintValue);
console.log('BigInt toString():', bigintValue.toString());
console.log('Replacer result:', replacer('', bigintValue));