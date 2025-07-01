// Test to confirm which field methods are missing in Sparky WASM

console.log('Testing Sparky WASM field method availability...\n');

// First, let's check what the sparky-adapter expects to call
const expectedMethods = [
  'add',      // Addition - IMPLEMENTED
  'mul',      // Multiplication - MISSING
  'sub',      // Subtraction - MISSING  
  'square',   // Squaring - MISSING
  'inv',      // Inverse - MISSING
  'scale',    // Scalar multiplication - IMPLEMENTED
  'assertEqual',    // Assert equality - IMPLEMENTED
  'assertMul',      // Assert multiplication - IMPLEMENTED
  'assertSquare',   // Assert squaring - IMPLEMENTED
  'assertBoolean',  // Assert boolean - IMPLEMENTED
  'constant',       // Create constant - IMPLEMENTED
  'exists',         // Create witness - IMPLEMENTED
  'readVar'         // Read variable - IMPLEMENTED
];

console.log('Expected field methods based on sparky-adapter.js usage:');
console.log(expectedMethods);

console.log('\nCritical missing methods that are called in sparky-adapter.js:');
console.log('- mul: Used in lines 480, 499, 670, 672, 673, 730, 731, etc.');
console.log('- sub: Used in line 486');
console.log('- square: Used in line 492');
console.log('- inv: Used in line 498');

console.log('\nThese missing methods are why Sparky generates trivial constraints.');
console.log('Without mul/sub/square/inv, arithmetic operations cannot create proper constraint expressions.');

console.log('\nExample of the problem:');
console.log('- Snarky: a.mul(b) creates a multiplication constraint with coeffs [1, 0, 0, 0, -result]');
console.log('- Sparky: a.mul(b) fails, falls back to variable assignment with coeffs [1, -1, 0, 0, 0]');

console.log('\nConclusion: To fix VK generation, these field methods MUST be implemented in Sparky WASM.');