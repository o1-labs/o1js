#!/usr/bin/env node

/**
 * Test to see the actual JSON output from constraint systems
 */

import { Snarky, initializeBindings, switchBackend } from './dist/node/bindings.js';

async function testConstraintJSON(backendName) {
  console.log(`\n📊 ${backendName} Constraint JSON:`);
  
  if (backendName === 'sparky') {
    await switchBackend('sparky');
  } else {
    await initializeBindings('snarky');
  }
  
  try {
    // Enter constraint system mode
    const finishCS = Snarky.run.enterConstraintSystem();
    
    // Create simple circuit
    const x = Snarky.run.existsOne(() => 3n);
    const y = Snarky.run.existsOne(() => 5n);
    
    console.log('  Adding constraint: x + y - 8 = 0');
    
    // Add constraint using generic gate
    Snarky.gates.generic(
      1, x,     // 1*x
      1, y,     // 1*y  
      0, x,     // 0*x (dummy)
      0,        // no multiplication
      -8        // constant -8
    );
    
    // Get constraint system
    let cs;
    if (backendName === 'sparky') {
      cs = Snarky.run.getConstraintSystem();
      finishCS(); // Exit mode
    } else {
      cs = finishCS();
    }
    
    // Get all the info
    const json = Snarky.constraintSystem.toJson(cs);
    const digest = Snarky.constraintSystem.digest(cs);
    const rows = Snarky.constraintSystem.rows(cs);
    
    console.log(`  Rows: ${rows}`);
    console.log(`  Digest: ${digest}`);
    console.log(`  JSON structure:`, {
      hasGates: 'gates' in json,
      gatesLength: json.gates?.length || 0,
      publicInputSize: json.public_input_size,
      keys: Object.keys(json)
    });
    
    if (json.gates && json.gates.length > 0) {
      console.log(`  First gate:`, JSON.stringify(json.gates[0], null, 2));
    }
    
    console.log(`  Full JSON:`, JSON.stringify(json, null, 2));
    
    // Also try adding multiple constraints
    console.log('\n  Adding more constraints...');
    const finishCS2 = Snarky.run.enterConstraintSystem();
    
    const a = Snarky.run.existsOne(() => 2n);
    const b = Snarky.run.existsOne(() => 3n);
    const c = Snarky.run.existsOne(() => 6n);
    
    // a + b - 5 = 0
    Snarky.gates.generic(1, a, 1, b, 0, a, 0, -5);
    
    // a * b - c = 0
    Snarky.gates.generic(0, a, 0, b, -1, c, 1, 0);
    
    let cs2;
    if (backendName === 'sparky') {
      cs2 = Snarky.run.getConstraintSystem();
      finishCS2();
    } else {
      cs2 = finishCS2();
    }
    
    const json2 = Snarky.constraintSystem.toJson(cs2);
    const rows2 = Snarky.constraintSystem.rows(cs2);
    
    console.log(`  Second test - Rows: ${rows2}, Gates: ${json2.gates?.length || 0}`);
    
  } catch (e) {
    console.error('  ❌ Error:', e.message);
    console.error('  Stack:', e.stack);
  }
}

async function main() {
  console.log('🔬 Constraint System JSON Test');
  console.log('==============================');
  
  await testConstraintJSON('snarky');
  await testConstraintJSON('sparky');
  
  console.log('\n✨ Done');
}

main().catch(console.error);