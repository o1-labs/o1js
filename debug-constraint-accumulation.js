#!/usr/bin/env node

/**
 * Debug constraint accumulation in the Sparky backend
 */

import { Field, Provable } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

async function debugConstraintAccumulation() {
  console.log('=== Constraint Accumulation Debug ===\n');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log('Backend:', getCurrentBackend());
  
  try {
    // Import the adapter directly
    const { Snarky } = await import('./dist/node/bindings/sparky-adapter.js');
    
    // Test 1: Direct constraint system mode testing
    console.log('\n🧪 Test 1: Direct constraint system mode');
    
    // Enter constraint system mode and add constraints directly
    const csExit1 = Snarky.run.enterConstraintSystem();
    
    // Create simple field variables
    const zero = Field(0);
    const one = Field(1);
    const two = Field(2);
    
    console.log('   Created field variables');
    
    // Add a zero constraint directly
    try {
      const values = Array(15).fill(zero.value);
      console.log('   Calling raw gate directly...');
      
      // Check mode before call
      console.log('   Mode check: Creating mode debugging...');
      
      Snarky.gates.raw(0, values, []); // Zero gate
      console.log('   ✅ Zero gate call succeeded');
      
      Snarky.gates.raw(1, [one.value, one.value, two.value, ...Array(12).fill(zero.value)], ['1', '1', '-1', '0', '0']); // Generic gate
      console.log('   ✅ Generic gate call succeeded');
      
    } catch (error) {
      console.log('   ❌ Direct gate call failed:', error.message);
    }
    
    // Exit constraint system and check what we got
    const cs1 = csExit1();
    console.log('   Result:');
    console.log('     Gates:', cs1.gates?.length || 0);
    console.log('     Public input size:', cs1.publicInputSize);
    console.log('     Raw response:', cs1);
    
    // Test 2: Provable.runAndCheck context
    console.log('\n🧪 Test 2: Provable.runAndCheck context');
    
    const result = Provable.runAndCheck(() => {
      console.log('   Inside Provable.runAndCheck...');
      
      // Check what mode we're in during Provable.runAndCheck
      const csExit2 = Snarky.run.enterConstraintSystem();
      
      // Add constraints
      try {
        const a = Field(10);
        const b = Field(20);
        const c = Field(30);
        
        // Add constraints using the gates API
        const values1 = Array(15).fill(Field(0).value);
        console.log('     Calling raw gate inside Provable.runAndCheck...');
        Snarky.gates.raw(0, values1, []); // Zero gate
        
        const values2 = [a.value, b.value, c.value, ...Array(12).fill(Field(0).value)];
        Snarky.gates.raw(1, values2, ['1', '1', '-1', '0', '0']); // Generic gate: a + b - c = 0
        
        console.log('     ✅ Gates called successfully inside Provable.runAndCheck');
        
      } catch (error) {
        console.log('     ❌ Gate calls failed inside Provable.runAndCheck:', error.message);
      }
      
      // Check constraint system from inside
      const cs2 = csExit2();
      console.log('     Inner constraint system:');
      console.log('       Gates:', cs2.gates?.length || 0);
      console.log('       Public input size:', cs2.publicInputSize);
      
      return cs2;
    });
    
    console.log('   Provable.runAndCheck result:');
    console.log('     Gates:', result.gates?.length || 0);
    console.log('     Public input size:', result.publicInputSize);
    
    // Test 3: Direct state inspection
    console.log('\n🧪 Test 3: Direct state inspection');
    
    // Try to get the constraint system directly from the WASM layer
    try {
      const constraintSystemModule = Snarky.constraintSystem;
      console.log('   Constraint system module available:', !!constraintSystemModule);
      
      if (constraintSystemModule && constraintSystemModule.toJson) {
        const directCs = constraintSystemModule.toJson({});
        console.log('   Direct constraint system call:');
        console.log('     Raw result:', directCs);
        console.log('     Type:', typeof directCs);
        
        if (typeof directCs === 'string') {
          try {
            const parsed = JSON.parse(directCs);
            console.log('     Parsed gates:', parsed.gates?.length || 0);
            console.log('     Parsed structure:', Object.keys(parsed));
          } catch (parseError) {
            console.log('     Parse error:', parseError.message);
          }
        }
      }
    } catch (error) {
      console.log('   ❌ Direct state inspection failed:', error.message);
    }
    
    // Test 4: Mode checking during constraint addition
    console.log('\n🧪 Test 4: Mode checking during constraint addition');
    
    // Add console logging to understand what's happening
    const originalRaw = Snarky.gates.raw;
    let callCount = 0;
    
    Snarky.gates.raw = function(kind, values, coeffs) {
      callCount++;
      console.log(`   Raw gate call #${callCount}: kind=${kind}, values=${values.length}, coeffs=${coeffs.length}`);
      
      try {
        const result = originalRaw.call(this, kind, values, coeffs);
        console.log(`   Raw gate call #${callCount}: SUCCESS`);
        return result;
      } catch (error) {
        console.log(`   Raw gate call #${callCount}: ERROR - ${error.message}`);
        throw error;
      }
    };
    
    // Now test in different contexts
    console.log('   Testing with instrumented raw gate...');
    
    const csExit3 = Snarky.run.enterConstraintSystem();
    Snarky.gates.raw(0, Array(15).fill(Field(0).value), []);
    Snarky.gates.raw(1, Array(15).fill(Field(0).value), ['0', '0', '0', '0', '1']); // Constant constraint
    const cs3 = csExit3();
    
    console.log('   Instrumented test result:');
    console.log('     Call count:', callCount);
    console.log('     Gates in result:', cs3.gates?.length || 0);
    console.log('     Result structure:', Object.keys(cs3));
    
    // Restore original function
    Snarky.gates.raw = originalRaw;
    
    console.log('\n📊 Summary:');
    console.log('   - Gates module is accessible ✅');
    console.log('   - Raw gate calls succeed ✅');
    console.log('   - Issue: Constraint system shows 0 gates ❌');
    console.log('   - This suggests a constraint accumulation issue in the WASM layer');
    
  } catch (error) {
    console.error('\n❌ Debug failed:', error);
    console.error('Stack:', error.stack);
  }
}

debugConstraintAccumulation().catch(console.error);