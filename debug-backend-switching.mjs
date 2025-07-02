#!/usr/bin/env node

/**
 * Debug script to investigate backend switching issues
 */

import { initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function debugBackendSwitching() {
  console.log('=== Backend Switching Debug ===\n');

  try {
    // Test 1: Initialize with default backend
    console.log('1. Initializing with default backend...');
    await initializeBindings();
    console.log(`   Current backend: ${getCurrentBackend()}\n`);

    // Test 2: Switch to Sparky
    console.log('2. Switching to Sparky...');
    try {
      await switchBackend('sparky');
      console.log(`   Switch completed. Current backend: ${getCurrentBackend()}`);
      
      // Check if Sparky is really active
      const bindings = await import('./dist/node/bindings/sparky-adapter.js');
      const isActive = bindings.isActiveSparkyBackend();
      console.log(`   isActiveSparkyBackend(): ${isActive}\n`);
      
    } catch (sparkyError) {
      console.error('   ERROR during Sparky switch:', sparkyError);
      console.log(`   Current backend after error: ${getCurrentBackend()}\n`);
    }

    // Test 3: Switch back to Snarky
    console.log('3. Switching back to Snarky...');
    await switchBackend('snarky');
    console.log(`   Current backend: ${getCurrentBackend()}\n`);

    // Test 4: Try Sparky again with more debug info
    console.log('4. Trying Sparky again with detailed logging...');
    
    // Enable more logging
    process.env.NODE_ENV = 'development';
    
    try {
      await switchBackend('sparky');
      console.log(`   Current backend: ${getCurrentBackend()}`);
      
      // Test basic Sparky functionality
      const { Field } = await import('./dist/node/index.js');
      const x = Field(5);
      const y = Field(3);
      const result = x.add(y);
      console.log(`   Basic Sparky test: Field(5).add(Field(3)) = ${result}`);
      
    } catch (detailedError) {
      console.error('   DETAILED ERROR:', detailedError);
      console.error('   Stack:', detailedError.stack);
    }

  } catch (error) {
    console.error('Fatal error:', error);
  }
}

debugBackendSwitching().catch(console.error);