#!/usr/bin/env node

// Quick debug test to check constraint system routing
import { initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function debugConstraintRouting() {
  console.log('🔧 DEBUG: Starting constraint routing test...');
  
  // Initialize bindings
  await initializeBindings();
  console.log('✅ Bindings initialized');
  
  // Check current backend
  console.log('📍 Current backend:', getCurrentBackend());
  
  // Switch to Sparky
  console.log('🔄 Switching to Sparky...');
  await switchBackend('sparky');
  console.log('✅ Switched to backend:', getCurrentBackend());
  
  // Try to access constraint system directly
  console.log('🔍 Testing constraint system access...');
  
  try {
    // Import the internal Snarky object to test constraint system
    const { Snarky } = await import('./dist/node/bindings.js');
    
    // Test constraint system rows function
    console.log('📊 Testing constraintSystem.rows()...');
    const result = Snarky.constraintSystem.rows({});
    console.log('📊 rows() result:', result);
    
  } catch (error) {
    console.error('❌ Error accessing constraint system:', error.message);
  }
}

debugConstraintRouting().catch(console.error);