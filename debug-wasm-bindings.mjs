/**
 * Debug WASM bindings to see what functions are available
 */

import { switchBackend } from './dist/node/index.js';

async function debugWasmBindings() {
  console.log('🔍 Debugging WASM bindings...\n');
  
  // Switch to Sparky to load WASM
  await switchBackend('sparky');
  
  // Access the Sparky adapter
  const sparkyAdapter = await import('./src/bindings/sparky-adapter.js');
  
  console.log('🔧 Sparky adapter loaded');
  
  // Try to get various modules and inspect their methods
  console.log('\n📦 Available modules:');
  
  try {
    // Check if we can access internal WASM instance
    if (sparkyAdapter.sparkyInstance) {
      console.log('sparkyInstance available');
      console.log('sparkyInstance keys:', Object.keys(sparkyAdapter.sparkyInstance));
    } else {
      console.log('sparkyInstance not available');
    }
    
    // Try to access Run module
    console.log('\n🏃 Run module:');
    try {
      const runModule = sparkyAdapter.getRunModule ? sparkyAdapter.getRunModule() : null;
      if (runModule) {
        console.log('Run module available');
        console.log('Run module keys:', Object.keys(runModule));
        console.log('Has constraintMode:', typeof runModule.constraintMode);
        console.log('Has getConstraintSystem:', typeof runModule.getConstraintSystem);
      } else {
        console.log('Run module not available');
      }
    } catch (error) {
      console.log('Error accessing Run module:', error.message);
    }
    
    // Try to access Field module
    console.log('\n🔢 Field module:');
    try {
      const fieldModule = sparkyAdapter.getFieldModule ? sparkyAdapter.getFieldModule() : null;
      if (fieldModule) {
        console.log('Field module available');
        console.log('Field module keys:', Object.keys(fieldModule));
        console.log('Has add:', typeof fieldModule.add);
        console.log('Has mul:', typeof fieldModule.mul);
        console.log('Has assertEqual:', typeof fieldModule.assertEqual);
      } else {
        console.log('Field module not available');
      }
    } catch (error) {
      console.log('Error accessing Field module:', error.message);
    }
    
    // Try to access ConstraintSystem module
    console.log('\n⚙️ ConstraintSystem module:');
    try {
      const csModule = sparkyAdapter.getConstraintSystemModule ? sparkyAdapter.getConstraintSystemModule() : null;
      if (csModule) {
        console.log('ConstraintSystem module available');
        console.log('ConstraintSystem module keys:', Object.keys(csModule));
        console.log('Has toJson:', typeof csModule.toJson);
      } else {
        console.log('ConstraintSystem module not available');
      }
    } catch (error) {
      console.log('Error accessing ConstraintSystem module:', error.message);
    }
    
    // Check WASM exports directly
    console.log('\n🦀 Direct WASM inspection:');
    const sparkyWasmPath = './src/bindings/compiled/sparky_node/sparky_wasm.cjs';
    try {
      const wasmModule = await import(sparkyWasmPath);
      console.log('WASM module loaded');
      console.log('WASM exports:', Object.keys(wasmModule));
      
      if (wasmModule.Snarky) {
        console.log('WASM Snarky class available');
        const instance = new wasmModule.Snarky();
        console.log('Instance created');
        console.log('Instance keys:', Object.keys(instance));
        
        if (instance.run) {
          console.log('instance.run available');
          console.log('instance.run keys:', Object.keys(instance.run));
        }
        
        if (instance.constraintSystem) {
          console.log('instance.constraintSystem available');
          console.log('instance.constraintSystem keys:', Object.keys(instance.constraintSystem));
        }
      }
    } catch (error) {
      console.log('Error loading WASM directly:', error.message);
    }
    
  } catch (error) {
    console.error('Error during debugging:', error);
  }
}

debugWasmBindings().catch(console.error);