#!/usr/bin/env node
/**
 * Debug direct WASM calls vs JSON serialization
 */

console.log('🔍 Testing direct WASM vs JSON serialization...');

// Test data with BigInt
const testFieldVar = [0, [0, 42n]];

console.log('\n🧪 Test 1: JSON serialization (what we expect)');
const replacer = new Function('key', 'value', 'return typeof value === "bigint" ? value.toString() : value');
const jsonStr = JSON.stringify(testFieldVar, replacer);
console.log('JSON string:', jsonStr);
const parsed = JSON.parse(jsonStr);
console.log('Parsed:', parsed);
console.log('Type of inner value:', typeof parsed[1][1]);

console.log('\n🧪 Test 2: Direct value (what WASM might get)');
console.log('Direct value:', testFieldVar);
console.log('Type of inner value:', typeof testFieldVar[1][1]);

console.log('\n🧪 Test 3: Manual deep BigInt conversion');
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

const converted = convertBigInts(testFieldVar);
console.log('Converted:', converted);
console.log('Type of inner value:', typeof converted[1][1]);

// Test what happens when we pass BigInt to a function
function testFunction(value) {
  console.log('\n🧪 Test 4: Function receives:', value);
  console.log('Type check inner:', typeof value[1][1]);
  
  // Simulate what js_value_to_fieldvar_input does
  try {
    const jsonStr = JSON.stringify(value, replacer);
    console.log('JSON stringify worked:', jsonStr);
    const parsed = JSON.parse(jsonStr);
    console.log('Parsed successfully:', parsed);
    return parsed;
  } catch (error) {
    console.log('JSON stringify failed:', error.message);
    return null;
  }
}

testFunction(testFieldVar);
testFunction(converted);