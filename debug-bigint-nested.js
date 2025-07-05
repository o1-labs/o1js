#!/usr/bin/env node
/**
 * Debug BigInt in nested structures
 */

console.log('🔍 Testing BigInt in nested structures...');

// Test the exact BigInt replacer function used in WASM
const replacer = new Function('key', 'value', 'return typeof value === "bigint" ? value.toString() : value');

// Test cases that match the actual data flow
const testCases = [
  // Normal FieldVar with BigInt (what should work)
  [0, [0, 42n]],
  
  // Nested BigInt in different positions
  [0, [0, [0, 42n]]],
  
  // More complex structures
  [2, [2, [0, [0, 42n]], [3, [0, 1n], [1, 5]]]]
];

console.log('\n🧪 Testing BigInt replacer on nested structures...');

testCases.forEach((testCase, i) => {
  console.log(`\nTest ${i + 1}:`, testCase);
  
  try {
    const jsonStr = JSON.stringify(testCase, replacer);
    console.log('JSON string:', jsonStr);
    
    const parsed = JSON.parse(jsonStr);
    console.log('Parsed back:', parsed);
    
    // Deep inspection
    function checkTypes(obj, path = '') {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          const currentPath = `${path}[${index}]`;
          console.log(`  ${currentPath}: ${typeof item} ${Array.isArray(item) ? '(array)' : ''} = ${item}`);
          if (typeof item === 'object' && item !== null) {
            checkTypes(item, currentPath);
          }
        });
      } else if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach(key => {
          const currentPath = `${path}.${key}`;
          console.log(`  ${currentPath}: ${typeof obj[key]} = ${obj[key]}`);
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            checkTypes(obj[key], currentPath);
          }
        });
      }
    }
    
    console.log('Type analysis:');
    checkTypes(parsed);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
});

// Test if the issue is the BigInt itself
console.log('\n🔍 Testing BigInt behavior...');
const bigintValue = 42n;
console.log('Direct BigInt:', bigintValue, typeof bigintValue);
console.log('Replacer on BigInt:', replacer('', bigintValue));
console.log('JSON.stringify(BigInt):', JSON.stringify(bigintValue, replacer));

// Test nested BigInt specifically
const nestedBigInt = [0, [0, 42n]];
console.log('\nNested BigInt test:');
console.log('Original:', nestedBigInt);
console.log('JSON with replacer:', JSON.stringify(nestedBigInt, replacer));

// Test what happens if we manually walk and convert
function convertBigInts(obj) {
  if (typeof obj === 'bigint') {
    return obj.toString();
  } else if (Array.isArray(obj)) {
    return obj.map(convertBigInts);
  } else if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertBigInts(value);
    }
    return result;
  }
  return obj;
}

console.log('\nManual BigInt conversion:');
testCases.forEach((testCase, i) => {
  console.log(`Test ${i + 1} manual:`, convertBigInts(testCase));
});