#!/usr/bin/env node

/**
 * Trace the exact point where the FieldVar format error occurs
 */

import { getCurrentBackend } from './dist/node/index.js';

console.log('🔍 Tracing FieldVar Format Error');
console.log('================================\n');

console.log('Current backend:', getCurrentBackend());

// Import the test implementation directly
const impl = await import('./dist/node/test/sparky/suites/comprehensive/circuit-compilation.impl.js');

// Intercept console.log to capture the error details
const originalLog = console.log;
let errorCaptured = false;

console.log = function(...args) {
  originalLog.apply(console, args);
  
  // Check for the specific error
  const str = args.join(' ');
  if (str.includes('Invalid FieldVar format') || str.includes('got 4 arguments')) {
    if (!errorCaptured) {
      errorCaptured = true;
      originalLog('\n🎯 ERROR CAPTURED!');
      originalLog('Stack trace:');
      console.trace();
    }
  }
};

// Run the exact test that's failing
console.log('Running basicSmartContractCompilation with sparky backend...\n');

try {
  const result = await impl.basicSmartContractCompilation('sparky');
  console.log('\nTest result:', result);
} catch (error) {
  console.log('\nTest threw error:', error.message);
}

// Restore console.log
console.log = originalLog;

if (!errorCaptured) {
  console.log('\n❌ The specific FieldVar format error was not captured in console output.');
  console.log('The error might be happening at a different level.');
}