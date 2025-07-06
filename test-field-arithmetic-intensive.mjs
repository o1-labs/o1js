#!/usr/bin/env node

// Test field-arithmetic-intensive-zkprogram individually
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';

const execAsync = promisify(exec);

console.log('Running field-arithmetic-intensive-zkprogram test individually...\n');

async function runTest() {
  // First, let's try to run the test directly with sparky backend
  console.log('=== Testing with Sparky Backend ===');
  
  const sparkyTestCode = `
import { fieldArithmeticIntensiveZkProgram } from './dist/test/sparky/suites/comprehensive/circuit-compilation.impl.js';

async function runTest() {
  // Force sparky backend
  process.env.BACKEND = 'sparky';
  
  console.log('Loading o1js with sparky backend...');
  const o1js = await import('./dist/index.js');
  
  console.log('Current backend:', o1js.getCurrentBackend ? o1js.getCurrentBackend() : 'unknown');
  
  console.log('\\nRunning fieldArithmeticIntensiveZkProgram test...');
  console.log('='.repeat(80));
  
  try {
    const result = await fieldArithmeticIntensiveZkProgram('sparky');
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

  await writeFile('temp-test-sparky.mjs', sparkyTestCode);
  
  try {
    const { stdout, stderr } = await execAsync('node temp-test-sparky.mjs', {
      env: {
        ...process.env,
        SPARKY_TEST_VERBOSE: 'true',
        BACKEND: 'sparky'
      }
    });
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error('Sparky test failed:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
  }

  console.log('\n\n=== Testing with Snarky Backend for comparison ===');
  
  const snarkyTestCode = `
import { fieldArithmeticIntensiveZkProgram } from './dist/test/sparky/suites/comprehensive/circuit-compilation.impl.js';

async function runTest() {
  // Force snarky backend
  process.env.BACKEND = 'snarky';
  
  console.log('Loading o1js with snarky backend...');
  const o1js = await import('./dist/index.js');
  
  console.log('Current backend:', o1js.getCurrentBackend ? o1js.getCurrentBackend() : 'unknown');
  
  console.log('\\nRunning fieldArithmeticIntensiveZkProgram test...');
  console.log('='.repeat(80));
  
  try {
    const result = await fieldArithmeticIntensiveZkProgram('snarky');
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

  await writeFile('temp-test-snarky.mjs', snarkyTestCode);
  
  try {
    const { stdout, stderr } = await execAsync('node temp-test-snarky.mjs', {
      env: {
        ...process.env,
        BACKEND: 'snarky'
      }
    });
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error('Snarky test failed:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
  }

  // Clean up temp files
  try {
    await unlink('temp-test-sparky.mjs');
    await unlink('temp-test-snarky.mjs');
  } catch (e) {
    // Ignore cleanup errors
  }
}

runTest().catch(console.error);