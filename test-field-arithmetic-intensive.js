#!/usr/bin/env node

// Test field-arithmetic-intensive-zkprogram individually
const { execSync } = require('child_process');
const path = require('path');

// Set environment for verbose output
process.env.SPARKY_TEST_VERBOSE = 'true';
process.env.SPARKY_TEST_MODE = 'sequential';

console.log('Running field-arithmetic-intensive-zkprogram test individually...\n');

// First, let's try to run the test directly with sparky backend
console.log('=== Testing with Sparky Backend ===');
try {
  // Create a simple test runner
  const testCode = `
const path = require('path');

async function runTest() {
  // Force sparky backend
  process.env.BACKEND = 'sparky';
  
  console.log('Loading o1js with sparky backend...');
  const o1js = await import('./dist/index.js');
  
  console.log('Current backend:', o1js.getCurrentBackend ? o1js.getCurrentBackend() : 'unknown');
  
  // Import the test implementation
  const impl = await import('./dist/test/sparky/suites/comprehensive/circuit-compilation.impl.js');
  
  console.log('\\nRunning fieldArithmeticIntensiveZkProgram test...');
  console.log('='.repeat(80));
  
  try {
    const result = await impl.fieldArithmeticIntensiveZkProgram('sparky');
    console.log('\\nTest Result:', JSON.stringify(result, null, 2));
    
    if (!result.success) {
      console.error('\\nTest FAILED with error:', result.error);
      process.exit(1);
    } else {
      console.log('\\nTest PASSED successfully!');
    }
  } catch (error) {
    console.error('\\nTest threw an exception:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

runTest().catch(error => {
  console.error('Failed to run test:', error);
  process.exit(1);
});
`;

  require('fs').writeFileSync(path.join(__dirname, 'temp-test-runner.js'), testCode);
  execSync('node temp-test-runner.js', { stdio: 'inherit', cwd: __dirname });
  
} catch (error) {
  console.error('Error running sparky test:', error.message);
}

console.log('\n\n=== Testing with Snarky Backend for comparison ===');
try {
  // Create a test runner for snarky
  const testCode = `
const path = require('path');

async function runTest() {
  // Force snarky backend
  process.env.BACKEND = 'snarky';
  
  console.log('Loading o1js with snarky backend...');
  const o1js = await import('./dist/index.js');
  
  console.log('Current backend:', o1js.getCurrentBackend ? o1js.getCurrentBackend() : 'unknown');
  
  // Import the test implementation
  const impl = await import('./dist/test/sparky/suites/comprehensive/circuit-compilation.impl.js');
  
  console.log('\\nRunning fieldArithmeticIntensiveZkProgram test...');
  console.log('='.repeat(80));
  
  try {
    const result = await impl.fieldArithmeticIntensiveZkProgram('snarky');
    console.log('\\nTest Result:', JSON.stringify(result, null, 2));
    
    if (!result.success) {
      console.error('\\nTest FAILED with error:', result.error);
      process.exit(1);
    } else {
      console.log('\\nTest PASSED successfully!');
    }
  } catch (error) {
    console.error('\\nTest threw an exception:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

runTest().catch(error => {
  console.error('Failed to run test:', error);
  process.exit(1);
});
`;

  require('fs').writeFileSync(path.join(__dirname, 'temp-test-runner-snarky.js'), testCode);
  execSync('node temp-test-runner-snarky.js', { stdio: 'inherit', cwd: __dirname });
  
} catch (error) {
  console.error('Error running snarky test:', error.message);
}

// Clean up temp files
try {
  require('fs').unlinkSync(path.join(__dirname, 'temp-test-runner.js'));
  require('fs').unlinkSync(path.join(__dirname, 'temp-test-runner-snarky.js'));
} catch (e) {
  // Ignore cleanup errors
}