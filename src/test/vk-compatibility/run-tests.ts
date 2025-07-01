#!/usr/bin/env node

/**
 * Run VK Compatibility Tests
 * 
 * This script runs the comprehensive VK compatibility test suite
 * and generates detailed reports.
 */

import { VkCompatibilityTestRunner } from './test-runner.js';

async function main() {
  console.log('='.repeat(60));
  console.log('       VK COMPATIBILITY TEST SUITE FOR SNARKY/SPARKY');
  console.log('='.repeat(60));
  console.log();
  console.log('This test suite verifies that Sparky generates identical');
  console.log('verification keys (VKs) to Snarky for all WASM API functions.');
  console.log();
  
  const runner = new VkCompatibilityTestRunner();
  
  try {
    await runner.runAllTests();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test suite completed!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
    process.exit(1);
  }
}

// Run the test suite
main().catch(console.error);