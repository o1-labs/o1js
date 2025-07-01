#!/usr/bin/env node

/**
 * Constraint Export Test - Fixed Version
 * 
 * This test exports the constraint systems from both Sparky and Snarky as JSON
 * to enable detailed comparison of how constraints are generated.
 */

import { Field, Bool, Provable } from './dist/node/index.js';
import { Snarky, initializeBindings, switchBackend } from './dist/node/bindings.js';
import fs from 'fs/promises';

// Helper to format JSON nicely
function formatConstraintSystem(cs) {
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
      type: gate.typ || gate.type || gate.kind || 'unknown',
      wires: gate.wires,
      coeffs: gate.coeffs,
      ...gate
    }))
  };
}

// Test cases
const testCases = [
  {
    name: 'simple_addition',
    description: 'x + y = z',
    circuit: async () => {
      const x = Provable.witness(Field, () => Field(3));
      const y = Provable.witness(Field, () => Field(5));
      const z = x.add(y);
      z.assertEquals(Field(8));
    }
  },
  
  {
    name: 'simple_multiplication',
    description: 'x * y = z',
    circuit: async () => {
      const x = Provable.witness(Field, () => Field(3));
      const y = Provable.witness(Field, () => Field(5));
      const z = x.mul(y);
      z.assertEquals(Field(15));
    }
  },
  
  {
    name: 'complex_expression',
    description: '3*x + 2*x = 5*x',
    circuit: async () => {
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
    circuit: async () => {
      const a = Provable.witness(Bool, () => Bool(true));
      const b = Provable.witness(Bool, () => Bool(false));
      const and = a.and(b);
      const or = a.or(b);
      const notA = a.not();
      
      and.assertEquals(Bool(false));
      or.assertEquals(Bool(true));
      notA.assertEquals(Bool(false));
    }
  }
];

async function exportConstraints(testCase, backend) {
  console.log(`\n📊 Exporting constraints for ${testCase.name} using ${backend}...`);
  
  try {
    // Initialize the backend
    if (backend === 'sparky') {
      await switchBackend('sparky');
    } else {
      await initializeBindings('snarky');
    }
    
    // Enter constraint system mode
    const cs = Snarky.run.enterConstraintSystem();
    
    // Run the circuit
    await Provable.runUnchecked(testCase.circuit);
    
    // Get the constraint system
    const constraintSystem = cs();
    
    // Convert to JSON
    const json = Snarky.constraintSystem.toJson(constraintSystem);
    
    // Format nicely
    const formatted = formatConstraintSystem(json);
    
    // Add metadata
    const result = {
      backend,
      testCase: testCase.name,
      description: testCase.description,
      timestamp: new Date().toISOString(),
      constraintSystem: formatted,
      digest: Snarky.constraintSystem.digest(constraintSystem),
      rows: Snarky.constraintSystem.rows(constraintSystem),
      rawJSON: json
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
  const snarkyResult = await exportConstraints(testCase, 'snarky');
  const sparkyResult = await exportConstraints(testCase, 'sparky');
  
  // Compare basic metrics
  if (!snarkyResult.error && !sparkyResult.error) {
    console.log(`\n📈 Metrics comparison:`);
    console.log(`   Snarky: ${snarkyResult.rows} rows, ${snarkyResult.constraintSystem.num_gates || 0} gates, digest: ${snarkyResult.digest}`);
    console.log(`   Sparky: ${sparkyResult.rows} rows, ${sparkyResult.constraintSystem.num_gates || 0} gates, digest: ${sparkyResult.digest}`);
    
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
    
    // Compare gate structures
    const snarkyGates = snarkyResult.constraintSystem.num_gates || 0;
    const sparkyGates = sparkyResult.constraintSystem.num_gates || 0;
    
    if (snarkyGates === sparkyGates) {
      console.log(`   ✅ Gate counts match!`);
    } else {
      console.log(`   ⚠️  Gate counts differ: Snarky=${snarkyGates}, Sparky=${sparkyGates}`);
    }
  }
  
  return { snarky: snarkyResult, sparky: sparkyResult };
}

async function main() {
  console.log('🚀 Constraint Export Test - Fixed Version');
  console.log('=========================================\n');
  
  // Create output directory
  const outputDir = './constraint-exports-fixed';
  await fs.mkdir(outputDir, { recursive: true });
  
  // Test each case
  const allResults = {};
  
  for (const testCase of testCases) {
    const results = await compareConstraints(testCase);
    allResults[testCase.name] = results;
    
    // Write individual test results
    const testOutputDir = `${outputDir}/${testCase.name}`;
    await fs.mkdir(testOutputDir, { recursive: true });
    
    // Write Snarky constraints
    if (!results.snarky.error) {
      await fs.writeFile(
        `${testOutputDir}/snarky-constraints.json`,
        JSON.stringify(results.snarky, null, 2)
      );
    }
    
    // Write Sparky constraints
    if (!results.sparky.error) {
      await fs.writeFile(
        `${testOutputDir}/sparky-constraints.json`,
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
        rows: results.snarky.rows === results.sparky.rows,
        gates: (results.snarky.constraintSystem?.num_gates || 0) === (results.sparky.constraintSystem?.num_gates || 0)
      }
    };
    
    await fs.writeFile(
      `${testOutputDir}/comparison.json`,
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
        rowsMatch: result.snarky.rows === result.sparky.rows,
        snarkyGates: result.snarky.constraintSystem?.num_gates || 0,
        sparkyGates: result.sparky.constraintSystem?.num_gates || 0,
        gatesMatch: (result.snarky.constraintSystem?.num_gates || 0) === (result.sparky.constraintSystem?.num_gates || 0)
      };
    })
  };
  
  await fs.writeFile(
    `${outputDir}/summary.json`,
    JSON.stringify(summary, null, 2)
  );
  
  console.log(`\n📁 Results exported to: ${outputDir}/`);
  console.log('\n✨ Test complete!');
  
  // Show summary table
  console.log('\n📊 Summary:');
  console.log('┌─────────────────────────┬──────────────┬──────────────┬─────────┬──────────┐');
  console.log('│ Test Case               │ Digest Match │ Rows Match   │ Gates   │ Status   │');
  console.log('├─────────────────────────┼──────────────┼──────────────┼─────────┼──────────┤');
  
  for (const testResult of summary.testCases) {
    const digestStatus = testResult.digestMatch ? '✅' : '❌';
    const rowsStatus = testResult.rowsMatch ? '✅' : '❌';
    const gatesInfo = `${testResult.snarkyGates}/${testResult.sparkyGates}`;
    const overallStatus = testResult.digestMatch && testResult.rowsMatch && testResult.gatesMatch ? '✅ PASS' : '❌ DIFF';
    
    console.log(`│ ${testResult.name.padEnd(23)} │ ${digestStatus.padEnd(12)} │ ${rowsStatus.padEnd(12)} │ ${gatesInfo.padEnd(7)} │ ${overallStatus} │`);
  }
  
  console.log('└─────────────────────────┴──────────────┴──────────────┴─────────┴──────────┘');
  
  console.log('\n💡 Key Insights:');
  console.log('   - Constraint differences indicate missing optimizations in one backend');
  console.log('   - Different digests show different constraint generation strategies');
  console.log('   - Gate count differences reveal optimization opportunities');
}

main().catch(console.error);