/**
 * Test constraint generation with optimization pipeline
 */

import { switchBackend } from './dist/node/index.js';

async function testConstraintOptimization() {
  console.log('🔍 Testing constraint generation with optimization...');
  
  try {
    // Switch to Sparky
    await switchBackend('sparky');
    console.log('✓ Switched to Sparky backend');
    
    // Import Sparky adapter to test constraint generation directly
    const { Snarky } = await import('./dist/node/bindings/sparky-adapter.js');
    
    console.log('📊 Testing constraint system generation...');
    
    // Enter constraint system mode
    const finishConstraintSystem = Snarky.run.enterConstraintSystem();
    
    // Create operations that generate constraints
    const x = Snarky.field.mul([0, '3'], [0, '4']);
    const y = Snarky.field.add(x, [0, '1']);
    
    console.log('✓ Field operations completed');
    
    // Get the constraint system (this should trigger optimization pipeline)
    const system = finishConstraintSystem();
    
    console.log('✓ Constraint system generated');
    
    // Get constraint count
    const count = Snarky.constraintSystem.rows(system);
    console.log('Constraint count:', count);
    
    console.log('✅ Constraint generation with optimization completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('time not implemented')) {
      console.error('🚨 TIMING ISSUE - optimization pipeline failing');
    } else if (error.message.includes('sparkyInstance') || error.message.includes('run')) {
      console.error('ℹ️  WASM module loading issue - expected with current setup');
    } else {
      console.error('Stack:', error.stack);
    }
  }
}

testConstraintOptimization().catch(console.error);