#!/usr/bin/env node

/**
 * Run the minimal VK test directly
 */

import { testMinimalVK } from '../../../dist/node/test/parity/minimal-vk-test.js';

console.log('Running Minimal VK Test...\n');

testMinimalVK()
  .then(() => {
    console.log('\nTest completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTest failed with error:', error);
    process.exit(1);
  });