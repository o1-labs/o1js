#!/usr/bin/env node

/**
 * Debug script to investigate constraint system generation issue
 * Created: January 5, 2025, 00:50 UTC
 */

import { Field, Bool, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Snarky, initializeBindings } from './dist/node/bindings.js';

async function debugConstraintSystem() {
  console.log('🔍 Debugging constraint system generation issue\n');
  
  try {
    // First, ensure bindings are initialized
    await initializeBindings('snarky');
    console.log('✅ Bindings initialized for snarky');
    console.log(`📍 Current backend: ${getCurrentBackend()}`);
    
    // Check if Snarky is available
    console.log('\n🔍 Checking Snarky object:');
    console.log('  • typeof Snarky:', typeof Snarky);
    console.log('  • Snarky keys:', Snarky ? Object.keys(Snarky).slice(0, 10).join(', ') + '...' : 'null');
    
    // Check if constraintSystem exists
    if (Snarky && Snarky.constraintSystem) {
      console.log('  • Snarky.constraintSystem exists:', true);
      console.log('  • constraintSystem methods:', Object.keys(Snarky.constraintSystem).join(', '));
    } else {
      console.log('  • Snarky.constraintSystem exists:', false);
    }
    
    // Try to create a simple Field
    console.log('\n🔍 Testing Field creation:');
    try {
      const a = Field(10);
      console.log('  ✅ Field(10) created successfully');
      console.log('  • Field value:', a.toString());
    } catch (e) {
      console.error('  ❌ Field creation failed:', e.message);
    }
    
    // Try to run a simple constraint system
    console.log('\n🔍 Testing constraint system generation:');
    try {
      const cs = await Provable.constraintSystem(() => {
        console.log('    • Inside constraint system function');
        const a = Field(10);
        const b = Field(20);
        const c = a.add(b);
        return c;
      });
      
      console.log('  ✅ Constraint system generated');
      console.log('  • CS type:', typeof cs);
      console.log('  • CS keys:', cs ? Object.keys(cs).join(', ') : 'null');
      console.log('  • CS rows:', cs && cs.rows ? cs.rows : 'N/A');
      console.log('  • CS gates:', cs && cs.gates ? cs.gates.length : 'N/A');
      
      // Try to convert to JSON
      if (Snarky && Snarky.constraintSystem && Snarky.constraintSystem.toJson) {
        console.log('\n🔍 Testing toJson conversion:');
        try {
          const json = Snarky.constraintSystem.toJson(cs);
          console.log('  ✅ toJson succeeded');
          console.log('  • JSON keys:', json ? Object.keys(json).join(', ') : 'null');
          console.log('  • Gates count:', json && json.gates ? json.gates.length : 'N/A');
        } catch (e) {
          console.error('  ❌ toJson failed:', e.message);
          console.error('  • Stack:', e.stack);
        }
      }
      
    } catch (e) {
      console.error('  ❌ Constraint system generation failed:', e.message);
      console.error('  • Stack:', e.stack);
    }
    
    // Try with witness variables
    console.log('\n🔍 Testing with witness variables:');
    try {
      const cs = await Provable.constraintSystem(() => {
        console.log('    • Creating witness variables');
        const a = Provable.witness(Field, () => Field(10));
        const b = Provable.witness(Field, () => Field(20));
        const c = a.add(b);
        c.assertEquals(c);
        return c;
      });
      
      console.log('  ✅ Constraint system with witnesses generated');
      console.log('  • CS rows:', cs && cs.rows ? cs.rows : 'N/A');
      
    } catch (e) {
      console.error('  ❌ Witness constraint system failed:', e.message);
    }
    
    // Now test with Sparky
    console.log('\n\n🔄 Switching to Sparky backend...');
    await switchBackend('sparky');
    console.log(`📍 Current backend: ${getCurrentBackend()}`);
    
    console.log('\n🔍 Testing Sparky constraint system:');
    try {
      const cs = await Provable.constraintSystem(() => {
        const a = Provable.witness(Field, () => Field(10));
        const b = Provable.witness(Field, () => Field(20));
        const c = a.add(b);
        c.assertEquals(c);
        return c;
      });
      
      console.log('  ✅ Sparky constraint system generated');
      console.log('  • CS type:', typeof cs);
      console.log('  • CS keys:', cs ? Object.keys(cs).join(', ') : 'null');
      console.log('  • CS rows:', cs && cs.rows ? cs.rows : 'N/A');
      console.log('  • CS gates:', cs && cs.gates ? cs.gates.length : 'N/A');
      
    } catch (e) {
      console.error('  ❌ Sparky constraint system failed:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
  }
}

// Run the debug script
debugConstraintSystem().catch(console.error);