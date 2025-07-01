#!/usr/bin/env node

/**
 * Basic Sparky test following the adapter pattern
 */

import { Snarky, initializeBindings, switchBackend } from './dist/node/bindings.js';

async function testBasicConstraint(backendName) {
  console.log(`\n🔧 ${backendName} Basic Constraint Test:`);
  
  if (backendName === 'sparky') {
    await switchBackend('sparky');
  } else {
    await initializeBindings('snarky');
  }
  
  try {
    // Follow the exact pattern from the adapter
    const finishCS = Snarky.run.enterConstraintSystem();
    
    // Create simple constraint
    const x = Snarky.run.existsOne(() => 3n);
    const y = Snarky.run.existsOne(() => 5n);
    
    console.log(`  Variables: x=${JSON.stringify(x)}, y=${JSON.stringify(y)}`);
    
    // Use the simplest possible constraint
    Snarky.field.assertEqual(x, y);
    
    // Get constraint system using the pattern from adapter
    const cs = finishCS();
    
    // Extract info
    const json = Snarky.constraintSystem.toJson(cs);
    const digest = Snarky.constraintSystem.digest(cs);
    const rows = Snarky.constraintSystem.rows(cs);
    
    console.log(`  Rows: ${rows}`);
    console.log(`  Digest: ${digest}`);
    console.log(`  Gates: ${json.gates?.length || 0}`);
    
    if (json.gates && json.gates.length > 0) {
      console.log(`  Gate types:`, json.gates.map(g => g.type || g.kind || 'unknown'));
    }
    
    return { backend: backendName, rows, digest, gates: json.gates?.length || 0 };
    
  } catch (e) {
    console.error(`  ❌ Error: ${e.message}`);
    return null;
  }
}

async function testSparkyDirectly() {
  console.log('\n🔬 Direct Sparky WASM Test:');
  
  try {
    // Initialize Sparky
    const { initializeSparky } = await import('./dist/node/bindings/sparky-adapter.js');
    await initializeSparky();
    
    // Try to access Sparky WASM directly
    console.log('  Attempting to load Sparky WASM module...');
    
    // The sparky-adapter creates sparkyInstance but doesn't export it
    // Let's try a different approach - use the initialized Snarky after switching
    await switchBackend('sparky');
    
    console.log('  Testing basic operations:');
    
    // Test 1: Can we create variables?
    try {
      const x = Snarky.run.existsOne(() => 42n);
      console.log('    ✅ Variable creation works, x =', JSON.stringify(x));
    } catch (e) {
      console.log('    ❌ Variable creation failed:', e.message);
    }
    
    // Test 2: Can we read variables in prover mode?
    try {
      Snarky.run.asProver(() => {
        const x = Snarky.run.existsOne(() => 42n);
        const value = Snarky.field.readVar(x);
        console.log('    ✅ Variable reading works, value =', value);
      });
    } catch (e) {
      console.log('    ❌ Variable reading failed:', e.message);
    }
    
    // Test 3: Constraint system without gates
    try {
      const cs = Snarky.run.enterConstraintSystem();
      const constraintSystem = cs();
      const rows = Snarky.constraintSystem.rows(constraintSystem);
      console.log('    ✅ Empty constraint system works, rows =', rows);
    } catch (e) {
      console.log('    ❌ Empty constraint system failed:', e.message);
    }
    
  } catch (e) {
    console.error('  ❌ Error:', e.message);
  }
}

async function compareDigests() {
  console.log('\n📊 Digest Comparison:');
  
  // Test multiple simple circuits
  const circuits = [
    {
      name: 'empty',
      build: () => {}
    },
    {
      name: 'single_var',
      build: () => {
        Snarky.run.existsOne(() => 1n);
      }
    },
    {
      name: 'two_vars',
      build: () => {
        Snarky.run.existsOne(() => 1n);
        Snarky.run.existsOne(() => 2n);
      }
    },
    {
      name: 'assert_equal',
      build: () => {
        const x = Snarky.run.existsOne(() => 5n);
        const y = Snarky.run.existsOne(() => 5n);
        Snarky.field.assertEqual(x, y);
      }
    }
  ];
  
  console.log('┌─────────────────┬──────────────────┬──────────────────┐');
  console.log('│ Circuit         │ Snarky Digest    │ Sparky Digest    │');
  console.log('├─────────────────┼──────────────────┼──────────────────┤');
  
  for (const circuit of circuits) {
    // Test Snarky
    await initializeBindings('snarky');
    const csS = Snarky.run.enterConstraintSystem();
    circuit.build();
    const snarkyCS = csS();
    const snarkyDigest = Snarky.constraintSystem.digest(snarkyCS);
    
    // Test Sparky
    await switchBackend('sparky');
    const csP = Snarky.run.enterConstraintSystem();
    circuit.build();
    const sparkyCS = csP();
    const sparkyDigest = Snarky.constraintSystem.digest(sparkyCS);
    
    console.log(`│ ${circuit.name.padEnd(15)} │ ${snarkyDigest.padEnd(16)} │ ${sparkyDigest.padEnd(16)} │`);
  }
  
  console.log('└─────────────────┴──────────────────┴──────────────────┘');
}

async function main() {
  console.log('🚀 Sparky Basic Test');
  console.log('===================');
  
  // Test basic constraints
  const snarkyResult = await testBasicConstraint('snarky');
  const sparkyResult = await testBasicConstraint('sparky');
  
  // Direct WASM test
  await testSparkyDirectly();
  
  // Compare digests
  await compareDigests();
  
  // Summary
  console.log('\n📈 Summary:');
  if (snarkyResult && sparkyResult) {
    console.log(`  Gate difference: ${sparkyResult.gates - snarkyResult.gates}`);
    console.log(`  Digest match: ${snarkyResult.digest === sparkyResult.digest ? '✅' : '❌'}`);
  }
}

main().catch(console.error);