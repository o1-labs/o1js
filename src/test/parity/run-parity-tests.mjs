#!/usr/bin/env node
/**
 * Simple runner for consolidated parity tests
 * 
 * This replaces the complex scattered test infrastructure with a focused approach.
 * Run with: node src/test/parity/run-parity-tests.mjs
 */

import { runParityTests } from './test-runner.js';

async function main() {
  try {
    console.log('🔄 Consolidated Backend Parity Tests');
    console.log('=====================================\n');
    
    const results = await runParityTests();
    
    // Exit with appropriate code
    const hasFailed = results.some(r => !r.passed);
    process.exit(hasFailed ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Error running parity tests:', error);
    process.exit(1);
  }
}

main();