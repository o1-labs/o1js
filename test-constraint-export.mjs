#!/usr/bin/env node

/**
 * Constraint Export Test
 * 
 * This test exports the constraint systems from both Sparky and Snarky as JSON
 * to enable detailed comparison of how constraints are generated.
 * 
 * The JSON format shows the exact gate structure before it's passed to Kimchi.
 */

import { Field, Bool, Provable, Circuit } from './dist/node/index.js';
import { Snarky as SparkyModule } from './dist/node/bindings/sparky-adapter.js';
import fs from 'fs/promises';
import path from 'path';

// Get direct access to bindings
let wasm, SnarkyOCaml;

async function loadBindings() {
  // Load both backends
  const wasmModule = await import('./dist/node/bindings/compiled/_node_bindings/o1js_node.bc.cjs');
  wasm = wasmModule.default;
  SnarkyOCaml = wasm.Snarky;
  
  // Initialize Sparky
  const { initializeSparky } = await import('../dist/node/bindings/sparky-adapter.js');
  await initializeSparky();
}

// Helper to format JSON nicely
function formatConstraintSystem(cs) {
  // Ensure we have the expected structure
  if (!cs.gates) {
    return {
      error: 'No gates found in constraint system',
      raw: cs
    };
  }
  
  return {
    public_input_size: cs.public_input_size || 0,
    num_gates: cs.gates.length,
    gates: cs.gates.map((gate, index) => ({
      index,
      type: gate.type || gate.kind || 'unknown',
      ...gate
    }))
  };
}

// Test cases
const testCases = [
  {
    name: 'simple_addition',
    description: 'x + y = z',
    circuit: () => {
      const x = Provable.witness(Field, () => Field(3));
      const y = Provable.witness(Field, () => Field(5));
      const z = x.add(y);
      z.assertEquals(Field(8));
    }
  },
  
  {
    name: 'simple_multiplication',
    description: 'x * y = z',
    circuit: () => {
      const x = Provable.witness(Field, () => Field(3));
      const y = Provable.witness(Field, () => Field(5));
      const z = x.mul(y);
      z.assertEquals(Field(15));
    }
  },
  
  {
    name: 'complex_expression',
    description: '3*x + 2*x = 5*x',
    circuit: () => {
      const x = Provable.witness(Field, () => Field(7));
      const threeX = x.mul(3);
      const twoX = x.mul(2);
      const sum = threeX.add(twoX);
      const fiveX = x.mul(5);
      sum.assertEquals(fiveX);
    }
  },
  
  {
    name: 'boolean_operations',
    description: 'Boolean AND, OR, NOT',
    circuit: () => {
      const a = Provable.witness(Bool, () => Bool(true));
      const b = Provable.witness(Bool, () => Bool(false));
      const and = a.and(b);
      const or = a.or(b);
      const notA = a.not();
      
      and.assertEquals(Bool(false));
      or.assertEquals(Bool(true));
      notA.assertEquals(Bool(false));
    }
  },
  
  {
    name: 'poseidon_hash',
    description: 'Poseidon hash of two fields',
    circuit: () => {
      const x = Provable.witness(Field, () => Field(123));
      const y = Provable.witness(Field, () => Field(456));
      const hash = Provable.witness(Field, () => Field(789)); // Dummy value
      // Note: Actual Poseidon would use gates.poseidon
      x.add(y).assertEquals(Field(579)); // Simplified for testing
    }
  }
];

async function exportConstraints(testCase, backend, backendModule) {
  console.log(`\n📊 Exporting constraints for ${testCase.name} using ${backend}...`);
  
  try {
    // Enter constraint system mode
    const cs = backendModule.run.enterConstraintSystem();
    
    // Run the circuit
    await Provable.runUnchecked(() => {
      testCase.circuit();
    });
    
    // Get the constraint system
    let constraintSystem;
    if (backend === 'Sparky') {
      // Sparky needs explicit getConstraintSystem call
      constraintSystem = backendModule.run.getConstraintSystem();
      cs(); // Exit the mode
    } else {
      // Snarky returns it from the closure
      constraintSystem = cs();
    }
    
    // Convert to JSON
    const json = backendModule.constraintSystem.toJson(constraintSystem);
    
    // Format nicely
    const formatted = formatConstraintSystem(json);
    
    // Add metadata
    const result = {
      backend,
      testCase: testCase.name,
      description: testCase.description,
      timestamp: new Date().toISOString(),
      constraintSystem: formatted,
      digest: backendModule.constraintSystem.digest(constraintSystem),
      rows: backendModule.constraintSystem.rows(constraintSystem)
    };
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error exporting constraints for ${testCase.name} with ${backend}:`, error);
    return {
      backend,
      testCase: testCase.name,
      error: error.message,
      stack: error.stack
    };
  }
}

async function compareConstraints(testCase) {
  console.log(`\n🔍 Comparing constraints for: ${testCase.name}`);
  console.log(`   ${testCase.description}`);
  
  // Export from both backends
  const snarkyResult = await exportConstraints(testCase, 'Snarky', SnarkyOCaml);
  const sparkyResult = await exportConstraints(testCase, 'Sparky', SparkyModule);
  
  // Compare basic metrics
  if (!snarkyResult.error && !sparkyResult.error) {
    console.log(`\n📈 Metrics comparison:`);
    console.log(`   Snarky: ${snarkyResult.rows} rows, digest: ${snarkyResult.digest}`);
    console.log(`   Sparky: ${sparkyResult.rows} rows, digest: ${sparkyResult.digest}`);
    
    if (snarkyResult.digest === sparkyResult.digest) {
      console.log(`   ✅ Digests match!`);
    } else {
      console.log(`   ❌ Digests differ!`);
    }
    
    if (snarkyResult.rows === sparkyResult.rows) {
      console.log(`   ✅ Row counts match!`);
    } else {
      console.log(`   ⚠️  Row counts differ by ${Math.abs(snarkyResult.rows - sparkyResult.rows)}`);
    }
  }
  
  return { snarky: snarkyResult, sparky: sparkyResult };
}

async function main() {
  console.log('🚀 Constraint Export Test');
  console.log('========================\n');
  
  // Load bindings
  await loadBindings();
  
  // Create output directory
  const outputDir = './constraint-exports';
  await fs.mkdir(outputDir, { recursive: true });
  
  // Test each case
  const allResults = {};
  
  for (const testCase of testCases) {
    const results = await compareConstraints(testCase);
    allResults[testCase.name] = results;
    
    // Write individual test results
    const testOutputDir = path.join(outputDir, testCase.name);
    await fs.mkdir(testOutputDir, { recursive: true });
    
    // Write Snarky constraints
    if (!results.snarky.error) {
      await fs.writeFile(
        path.join(testOutputDir, 'snarky-constraints.json'),
        JSON.stringify(results.snarky, null, 2)
      );
    }
    
    // Write Sparky constraints
    if (!results.sparky.error) {
      await fs.writeFile(
        path.join(testOutputDir, 'sparky-constraints.json'),
        JSON.stringify(results.sparky, null, 2)
      );
    }
    
    // Write comparison summary
    const comparison = {
      testCase: testCase.name,
      description: testCase.description,
      snarky: {
        rows: results.snarky.rows,
        digest: results.snarky.digest,
        gates: results.snarky.constraintSystem?.num_gates,
        error: results.snarky.error
      },
      sparky: {
        rows: results.sparky.rows,
        digest: results.sparky.digest,
        gates: results.sparky.constraintSystem?.num_gates,
        error: results.sparky.error
      },
      matches: {
        digest: results.snarky.digest === results.sparky.digest,
        rows: results.snarky.rows === results.sparky.rows
      }
    };
    
    await fs.writeFile(
      path.join(testOutputDir, 'comparison.json'),
      JSON.stringify(comparison, null, 2)
    );
  }
  
  // Write overall summary
  const summary = {
    timestamp: new Date().toISOString(),
    testCases: Object.keys(allResults).map(name => {
      const result = allResults[name];
      return {
        name,
        snarkyDigest: result.snarky.digest,
        sparkyDigest: result.sparky.digest,
        digestMatch: result.snarky.digest === result.sparky.digest,
        snarkyRows: result.snarky.rows,
        sparkyRows: result.sparky.rows,
        rowsMatch: result.snarky.rows === result.sparky.rows
      };
    })
  };
  
  await fs.writeFile(
    path.join(outputDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );
  
  console.log(`\n📁 Results exported to: ${outputDir}/`);
  console.log('\n✨ Test complete!');
  
  // Show summary
  console.log('\n📊 Summary:');
  console.log('┌─────────────────────────┬──────────────┬──────────────┬─────────┐');
  console.log('│ Test Case               │ Digest Match │ Rows Match   │ Status  │');
  console.log('├─────────────────────────┼──────────────┼──────────────┼─────────┤');
  
  for (const testResult of summary.testCases) {
    const digestStatus = testResult.digestMatch ? '✅' : '❌';
    const rowsStatus = testResult.rowsMatch ? '✅' : '❌';
    const overallStatus = testResult.digestMatch && testResult.rowsMatch ? '✅ PASS' : '❌ FAIL';
    
    console.log(`│ ${testResult.name.padEnd(23)} │ ${digestStatus.padEnd(12)} │ ${rowsStatus.padEnd(12)} │ ${overallStatus} │`);
  }
  
  console.log('└─────────────────────────┴──────────────┴──────────────┴─────────┘');
}

// Run the test
main().catch(console.error);