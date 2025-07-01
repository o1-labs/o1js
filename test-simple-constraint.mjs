#!/usr/bin/env node

/**
 * Simple Constraint Test
 * 
 * Quick test to verify constraint export is working
 */

import { Snarky, initializeBindings, switchBackend } from './dist/node/bindings.js';

async function test() {
  // Initialize Snarky backend first
  await initializeBindings('snarky');
  
  // Get direct reference to Snarky module
  const SnarkyOCaml = Snarky;
  
  console.log('Testing constraint export...\n');
  
  // Test Snarky
  console.log('🔵 Snarky:');
  try {
    const cs = SnarkyOCaml.run.enterConstraintSystem();
    
    // Simple circuit: x + y = 5
    const x = SnarkyOCaml.run.existsOne(() => 2);
    const y = SnarkyOCaml.run.existsOne(() => 3);
    const five = [0, [0, 5n]]; // Direct FieldVar format: [type=Constant, [0, bigint]]
    
    // x + y = 5
    SnarkyOCaml.gates.generic(
      1, x,    // 1*x
      1, y,    // 1*y  
      -1, five, // -1*5
      0,       // no multiplication
      0        // no constant
    );
    
    const constraintSystem = cs();
    const json = SnarkyOCaml.constraintSystem.toJson(constraintSystem);
    const digest = SnarkyOCaml.constraintSystem.digest(constraintSystem);
    const rows = SnarkyOCaml.constraintSystem.rows(constraintSystem);
    
    console.log(`  Rows: ${rows}`);
    console.log(`  Digest: ${digest}`);
    console.log(`  JSON: ${JSON.stringify(json, null, 2)}\n`);
    
  } catch (e) {
    console.error('  Error:', e.message);
  }
  
  // Switch to Sparky and test
  await switchBackend('sparky');
  const SparkyModule = Snarky; // After switching, Snarky now points to Sparky
  
  console.log('🟠 Sparky:');
  try {
    const cs = SparkyModule.run.enterConstraintSystem();
    
    // Simple circuit: x + y = 5
    const x = SparkyModule.run.existsOne(() => 2);
    const y = SparkyModule.run.existsOne(() => 3);
    const five = [0, [0, 5n]]; // Constant field var
    
    // x + y = 5
    SparkyModule.gates.generic(
      1, x,    // 1*x
      1, y,    // 1*y  
      -1, five, // -1*5
      0,       // no multiplication
      0        // no constant
    );
    
    const constraintSystem = SparkyModule.run.getConstraintSystem();
    cs(); // Exit mode
    
    const json = SparkyModule.constraintSystem.toJson(constraintSystem);
    const digest = SparkyModule.constraintSystem.digest(constraintSystem);
    const rows = SparkyModule.constraintSystem.rows(constraintSystem);
    
    console.log(`  Rows: ${rows}`);
    console.log(`  Digest: ${digest}`);
    console.log(`  JSON: ${JSON.stringify(json, null, 2)}\n`);
    
  } catch (e) {
    console.error('  Error:', e.message);
    console.error('  Stack:', e.stack);
  }
}

test().catch(console.error);