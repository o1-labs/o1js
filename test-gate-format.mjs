#!/usr/bin/env node

/**
 * Test to understand the exact format needed for gates
 */

import { Snarky, initializeBindings, switchBackend } from './dist/node/bindings.js';

async function testGateFormat() {
  console.log('🔬 Gate Format Investigation\n');
  
  // First test with Snarky to see what works
  console.log('📘 Testing Snarky:');
  await initializeBindings('snarky');
  
  try {
    const cs = Snarky.run.enterConstraintSystem();
    
    // Create witness vars
    const x = Snarky.run.existsOne(() => 3n);
    const y = Snarky.run.existsOne(() => 5n);
    
    console.log('  Variable format:');
    console.log('    x =', JSON.stringify(x));
    console.log('    typeof x =', typeof x);
    console.log('    Array.isArray(x) =', Array.isArray(x));
    
    // Try generic gate
    console.log('\n  Calling generic gate...');
    Snarky.gates.generic(1, x, 1, y, 0, x, 0, -8);
    
    const constraintSystem = cs();
    const rows = Snarky.constraintSystem.rows(constraintSystem);
    console.log('  ✅ Success! Rows:', rows);
    
  } catch (e) {
    console.error('  ❌ Error:', e.message);
  }
  
  // Now test with Sparky
  console.log('\n📙 Testing Sparky:');
  await switchBackend('sparky');
  
  try {
    const cs = Snarky.run.enterConstraintSystem();
    
    // Create witness vars
    const x = Snarky.run.existsOne(() => 3n);
    const y = Snarky.run.existsOne(() => 5n);
    
    console.log('  Variable format:');
    console.log('    x =', JSON.stringify(x));
    console.log('    typeof x =', typeof x);
    console.log('    Array.isArray(x) =', Array.isArray(x));
    
    // Check what getGatesModule returns
    console.log('\n  Checking gates module...');
    const adapter = await import('./dist/node/bindings/sparky-adapter.js');
    console.log('    Has getGatesModule:', typeof adapter.getGatesModule !== 'undefined');
    
    // Try different formats for generic gate
    console.log('\n  Testing different gate formats:');
    
    // Format 1: Direct call
    try {
      console.log('    Format 1: Direct parameters...');
      Snarky.gates.generic(1, x, 1, y, 0, x, 0, -8);
      console.log('    ✅ Success!');
    } catch (e) {
      console.log('    ❌ Failed:', e.message);
      
      // Let's look at the actual error more closely
      if (e.message.includes('is not iterable')) {
        console.log('    📝 Note: Sparky expects iterable for some parameter');
      }
    }
    
    // Format 2: Try with arrays
    try {
      console.log('\n    Format 2: Coefficients as arrays...');
      Snarky.gates.generic([1], x, [1], y, [0], x, [0], [-8]);
      console.log('    ✅ Success!');
    } catch (e) {
      console.log('    ❌ Failed:', e.message);
    }
    
    // Format 3: All as arrays
    try {
      console.log('\n    Format 3: Everything as arrays...');
      Snarky.gates.generic([1, x], [1, y], [0, x], [0], [-8]);
      console.log('    ✅ Success!');
    } catch (e) {
      console.log('    ❌ Failed:', e.message);
    }
    
    // Get constraint system
    const constraintSystem = Snarky.run.getConstraintSystem();
    cs(); // Exit
    
    const rows = Snarky.constraintSystem.rows(constraintSystem);
    console.log('\n  Final rows:', rows);
    
  } catch (e) {
    console.error('\n  ❌ Overall error:', e.message);
    console.error('  Stack:', e.stack);
  }
}

// Also let's look directly at the WASM module
async function inspectWASM() {
  console.log('\n\n🔍 Direct WASM Inspection:');
  
  try {
    // Load Sparky adapter
    const { initializeSparky } = await import('./dist/node/bindings/sparky-adapter.js');
    await initializeSparky();
    
    // Try to access the WASM module directly
    const sparkyWasm = await import('./dist/node/bindings/compiled/sparky_node/sparky_wasm.cjs');
    console.log('  WASM exports:', Object.keys(sparkyWasm));
    
    // Check if there's a Snarky class
    if (sparkyWasm.Snarky) {
      const instance = new sparkyWasm.Snarky();
      console.log('  Snarky instance methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(instance)));
      
      // Check gates
      if (instance.gates) {
        console.log('  Gates methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(instance.gates)));
      }
    }
    
  } catch (e) {
    console.error('  Error:', e.message);
  }
}

async function main() {
  await testGateFormat();
  await inspectWASM();
}

main().catch(console.error);