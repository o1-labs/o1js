#!/usr/bin/env node

// Debug the actual WASM constraint system object
import { initializeBindings, switchBackend } from './dist/node/index.js';

async function debugWasmMethods() {
  await initializeBindings();
  await switchBackend('sparky');
  
  // Access the sparky-adapter internals
  const sparkyAdapter = await import('./dist/node/bindings/sparky-adapter.js');
  
  console.log('🔍 Checking sparky-adapter internal state...');
  
  // The sparky-adapter should have access to sparkyInstance
  // Let's try to access it directly through the module
  
  // Alternative: access through the WASM module directly
  try {
    const sparkyWasm = await import('./dist/node/bindings/compiled/sparky_node/sparky_wasm.cjs');
    console.log('✅ WASM module loaded');
    
    const snarkyInstance = new sparkyWasm.Snarky();
    console.log('✅ Snarky instance created');
    
    const constraintSystemObj = snarkyInstance.constraintSystem;
    console.log('🔍 WASM constraintSystem type:', typeof constraintSystemObj);
    console.log('🔍 WASM constraintSystem properties:');
    
    for (const prop in constraintSystemObj) {
      console.log(`  - ${prop}: ${typeof constraintSystemObj[prop]}`);
    }
    
    // Test the WASM rows method directly
    console.log('📊 Testing WASM rows() directly...');
    const result = constraintSystemObj.rows({});
    console.log('📊 WASM rows() result:', result);
    
  } catch (error) {
    console.error('❌ Error accessing WASM directly:', error.message);
  }
}

debugWasmMethods().catch(console.error);