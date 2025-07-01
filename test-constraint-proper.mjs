#!/usr/bin/env node

/**
 * Test constraints with proper field element format
 */

import { Snarky, initializeBindings, switchBackend } from './dist/node/bindings.js';
import fs from 'fs/promises';

async function testWithProperFormat(backendName) {
  console.log(`\n🔧 ${backendName} with Proper Format:`);
  
  if (backendName === 'sparky') {
    await switchBackend('sparky');
  } else {
    await initializeBindings('snarky');
  }
  
  try {
    // Enter constraint system mode
    const finishCS = Snarky.run.enterConstraintSystem();
    
    // Create witness variables (these are already in [tag, value] format)
    const x = Snarky.run.existsOne(() => 3n);
    const y = Snarky.run.existsOne(() => 5n);
    
    console.log('  Variable x:', JSON.stringify(x));
    console.log('  Variable y:', JSON.stringify(y));
    
    // For Snarky, coefficients might need to be field elements too
    // Let's try creating constant field elements for coefficients
    console.log('\n  Creating coefficient field elements...');
    
    // Method 1: Try using the exists mechanism for constants
    const one = [0, 1n];  // Constant field element format
    const negEight = [0, -8n];
    const zero = [0, 0n];
    
    console.log('  Coefficient format:', { one, negEight, zero });
    
    // Try adding constraint with these formats
    console.log('\n  Adding constraint: 1*x + 1*y + 0*x + 0 - 8 = 0');
    
    // The generic gate might expect different things for coefficients vs variables
    // OCaml interface: generic : s:t -> x:t -> s:t -> y:t -> s:t -> z:t -> s:t -> s:t -> unit
    // This suggests all parameters should be field elements (type t)
    
    try {
      // Try 1: All as field elements
      console.log('  Try 1: All as field elements...');
      Snarky.gates.generic(
        one, x,        // s*x
        one, y,        // s*y  
        zero, x,       // s*z (dummy)
        zero,          // s (multiplication coefficient)
        negEight       // s (constant)
      );
      console.log('  ✅ Success!');
    } catch (e) {
      console.log('  ❌ Failed:', e.message);
      
      // Try 2: Coefficients as numbers
      console.log('\n  Try 2: Coefficients as numbers...');
      try {
        Snarky.gates.generic(
          1, x,
          1, y,
          0, x,
          0,
          -8
        );
        console.log('  ✅ Success!');
      } catch (e2) {
        console.log('  ❌ Failed:', e2.message);
      }
    }
    
    // Get constraint system
    let cs;
    if (backendName === 'sparky') {
      cs = Snarky.run.getConstraintSystem();
      finishCS();
    } else {
      cs = finishCS();
    }
    
    const json = Snarky.constraintSystem.toJson(cs);
    const digest = Snarky.constraintSystem.digest(cs);
    const rows = Snarky.constraintSystem.rows(cs);
    
    console.log(`\n  Results:`);
    console.log(`    Rows: ${rows}`);
    console.log(`    Digest: ${digest}`);
    console.log(`    Gates: ${json.gates?.length || 0}`);
    
    if (json.gates?.length > 0) {
      console.log(`    First gate:`, JSON.stringify(json.gates[0], null, 2));
    }
    
    return { rows, digest, gates: json.gates || [], json };
    
  } catch (e) {
    console.error('  ❌ Error:', e.message);
    console.error('  Stack:', e.stack);
    return null;
  }
}

// Test using high-level Field API
async function testWithFieldAPI(backendName) {
  console.log(`\n📦 ${backendName} with Field API:`);
  
  if (backendName === 'sparky') {
    await switchBackend('sparky');
  } else {
    await initializeBindings('snarky');
  }
  
  try {
    const { Field } = await import('./dist/node/lib/provable/field.js');
    const { Provable } = await import('./dist/node/lib/provable/provable.js');
    
    const finishCS = Snarky.run.enterConstraintSystem();
    
    // Use Provable.runUnchecked to avoid witness generation issues
    await Provable.runUnchecked(() => {
      const x = Provable.witness(Field, () => Field(3));
      const y = Provable.witness(Field, () => Field(5));
      
      // Simple constraint: x + y = 8
      const sum = x.add(y);
      sum.assertEquals(Field(8));
    });
    
    let cs;
    if (backendName === 'sparky') {
      cs = Snarky.run.getConstraintSystem();
      finishCS();
    } else {
      cs = finishCS();
    }
    
    const json = Snarky.constraintSystem.toJson(cs);
    const digest = Snarky.constraintSystem.digest(cs);
    const rows = Snarky.constraintSystem.rows(cs);
    
    console.log(`  Rows: ${rows}`);
    console.log(`  Digest: ${digest}`);
    console.log(`  Gates: ${json.gates?.length || 0}`);
    
    return { rows, digest, gates: json.gates || [] };
    
  } catch (e) {
    console.error('  ❌ Error:', e.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Proper Constraint Format Test');
  console.log('================================\n');
  
  // Create output directory
  const outputDir = './constraint-format-test';
  await fs.mkdir(outputDir, { recursive: true });
  
  // Test with manual format
  console.log('🔹 Manual Format Tests:');
  const snarkyManual = await testWithProperFormat('snarky');
  const sparkyManual = await testWithProperFormat('sparky');
  
  // Test with Field API
  console.log('\n🔹 Field API Tests:');
  const snarkyField = await testWithFieldAPI('snarky');
  const sparkyField = await testWithFieldAPI('sparky');
  
  // Summary
  console.log('\n📊 Summary:');
  console.log('┌─────────────────┬────────────┬────────────┬─────────┐');
  console.log('│ Test            │ Snarky     │ Sparky     │ Match   │');
  console.log('├─────────────────┼────────────┼────────────┼─────────┤');
  
  if (snarkyManual && sparkyManual) {
    const match = snarkyManual.digest === sparkyManual.digest ? '✅' : '❌';
    console.log(`│ Manual Format   │ ${String(snarkyManual.rows).padEnd(10)} │ ${String(sparkyManual.rows).padEnd(10)} │ ${match}      │`);
  }
  
  if (snarkyField && sparkyField) {
    const match = snarkyField.digest === sparkyField.digest ? '✅' : '❌';
    console.log(`│ Field API       │ ${String(snarkyField.rows).padEnd(10)} │ ${String(sparkyField.rows).padEnd(10)} │ ${match}      │`);
  }
  
  console.log('└─────────────────┴────────────┴────────────┴─────────┘');
  
  // Save results
  if (snarkyManual) {
    await fs.writeFile(
      `${outputDir}/snarky-manual.json`,
      JSON.stringify(snarkyManual, null, 2)
    );
  }
  
  if (sparkyManual) {
    await fs.writeFile(
      `${outputDir}/sparky-manual.json`,
      JSON.stringify(sparkyManual, null, 2)
    );
  }
  
  console.log(`\n📁 Results saved to: ${outputDir}/`);
}

main().catch(console.error);