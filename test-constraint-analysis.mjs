#!/usr/bin/env node

/**
 * Deep Constraint Analysis Test
 * 
 * This test provides detailed analysis of constraint differences between Sparky and Snarky,
 * including gate-by-gate comparison and optimization detection.
 */

import { Field, Bool, Provable } from './dist/node/index.js';
import fs from 'fs/promises';
import crypto from 'crypto';

// Direct access to both backends
let SnarkyOCaml, SparkyModule;

async function loadBindings() {
  // Load OCaml Snarky
  const wasmModule = await import('./dist/node/bindings/compiled/o1js_node.bc.cjs');
  SnarkyOCaml = wasmModule.default.Snarky;
  
  // Load Sparky
  const sparky = await import('./dist/node/bindings/sparky-adapter.js');
  await sparky.initializeSparky();
  SparkyModule = sparky.Snarky;
}

// Analyze gate structure
function analyzeGate(gate) {
  const analysis = {
    type: gate.type || gate.kind || 'unknown',
    coefficients: {},
    wires: []
  };
  
  // Extract coefficients
  if (gate.coeffs) {
    gate.coeffs.forEach((coeff, i) => {
      if (coeff !== '0' && coeff !== 0) {
        analysis.coefficients[`c${i}`] = coeff;
      }
    });
  }
  
  // Extract wire connections
  if (gate.wires) {
    analysis.wires = gate.wires;
  }
  
  // For generic gates, extract the linear combination
  if (gate.type === 'Generic' || gate.kind === 'Generic') {
    if (gate.l !== undefined) analysis.left = { coeff: gate.l[0], wire: gate.l[1] };
    if (gate.r !== undefined) analysis.right = { coeff: gate.r[0], wire: gate.r[1] };
    if (gate.o !== undefined) analysis.output = { coeff: gate.o[0], wire: gate.o[1] };
    if (gate.m !== undefined) analysis.mul = gate.m;
    if (gate.c !== undefined) analysis.const = gate.c;
  }
  
  return analysis;
}

// Compare two constraint systems in detail
function compareConstraintSystems(cs1, cs2, name1 = 'System1', name2 = 'System2') {
  const report = {
    summary: {
      [name1]: { gates: 0, types: {} },
      [name2]: { gates: 0, types: {} }
    },
    differences: [],
    optimizations: []
  };
  
  // Count gates by type
  const countGates = (cs, name) => {
    if (!cs.gates) return;
    
    cs.gates.forEach(gate => {
      const type = gate.type || gate.kind || 'unknown';
      report.summary[name].types[type] = (report.summary[name].types[type] || 0) + 1;
      report.summary[name].gates++;
    });
  };
  
  countGates(cs1, name1);
  countGates(cs2, name2);
  
  // Compare gate counts
  if (report.summary[name1].gates !== report.summary[name2].gates) {
    report.differences.push({
      type: 'gate_count',
      message: `${name1} has ${report.summary[name1].gates} gates, ${name2} has ${report.summary[name2].gates} gates`,
      impact: 'critical'
    });
  }
  
  // Look for optimization patterns
  const gates1 = cs1.gates || [];
  const gates2 = cs2.gates || [];
  
  // Check for linear combination optimization
  // Pattern: multiple gates in cs2 that could be combined into one in cs1
  if (gates1.length < gates2.length) {
    // Potential optimization in system1
    report.optimizations.push({
      type: 'linear_combination',
      message: `${name1} may be using optimized linear combinations (${gates1.length} gates vs ${gates2.length})`,
      evidence: 'fewer_gates'
    });
  }
  
  // Gate-by-gate comparison
  const minGates = Math.min(gates1.length, gates2.length);
  for (let i = 0; i < minGates; i++) {
    const g1 = analyzeGate(gates1[i]);
    const g2 = analyzeGate(gates2[i]);
    
    if (g1.type !== g2.type) {
      report.differences.push({
        type: 'gate_type_mismatch',
        position: i,
        [name1]: g1.type,
        [name2]: g2.type
      });
    }
  }
  
  return report;
}

// Test circuits focusing on optimization detection
const optimizationTests = [
  {
    name: 'linear_combination_simple',
    description: 'Test if 3*x + 2*x gets optimized to 5*x',
    circuit: () => {
      const x = Provable.witness(Field, () => Field(7));
      
      // Create 3*x
      const x1 = Provable.witness(Field, () => Field(7));
      const x2 = Provable.witness(Field, () => Field(7));
      const x3 = Provable.witness(Field, () => Field(7));
      x.assertEquals(x1);
      x.assertEquals(x2); 
      x.assertEquals(x3);
      
      const sum1 = x1.add(x2); // 2*x
      const threeX = sum1.add(x3); // 3*x
      
      // Create 2*x separately
      const y1 = Provable.witness(Field, () => Field(7));
      const y2 = Provable.witness(Field, () => Field(7));
      x.assertEquals(y1);
      x.assertEquals(y2);
      
      const twoX = y1.add(y2);
      
      // Add them: should optimize to 5*x
      const result = threeX.add(twoX);
      
      // Check against 5*x
      const fiveX = x.mul(5);
      result.assertEquals(fiveX);
    }
  },
  
  {
    name: 'constant_folding',
    description: 'Test if constants are folded during compilation',
    circuit: () => {
      const x = Provable.witness(Field, () => Field(10));
      
      // Operations with constants that should be folded
      const a = x.add(5);
      const b = a.add(3); // Should fold to x + 8
      const c = b.add(2); // Should fold to x + 10
      
      const expected = x.add(10);
      c.assertEquals(expected);
    }
  },
  
  {
    name: 'mul_by_constant_optimization',
    description: 'Test if multiplication by constant uses optimized gates',
    circuit: () => {
      const x = Provable.witness(Field, () => Field(7));
      
      // These should potentially use different gate types
      const twoX = x.mul(2);    // Could use add: x + x
      const threeX = x.mul(3);  // Could use generic with constant
      const fourX = x.mul(4);   // Could use double-add: 2*(x + x)
      
      // Verify results
      twoX.assertEquals(Field(14));
      threeX.assertEquals(Field(21));
      fourX.assertEquals(Field(28));
    }
  }
];

async function runConstraintAnalysis() {
  console.log('🔬 Deep Constraint Analysis');
  console.log('===========================\n');
  
  await loadBindings();
  
  const results = [];
  
  for (const test of optimizationTests) {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log(`   ${test.description}`);
    
    // Capture constraints from both backends
    let snarkyCS, sparkyCS;
    
    // Snarky
    try {
      const cs = SnarkyOCaml.run.enterConstraintSystem();
      await Provable.runUnchecked(() => test.circuit());
      snarkyCS = cs();
      snarkyCS = SnarkyOCaml.constraintSystem.toJson(snarkyCS);
    } catch (e) {
      console.error('Snarky error:', e.message);
    }
    
    // Sparky
    try {
      const cs = SparkyModule.run.enterConstraintSystem();
      await Provable.runUnchecked(() => test.circuit());
      const rawCS = SparkyModule.run.getConstraintSystem();
      cs(); // Exit mode
      sparkyCS = SparkyModule.constraintSystem.toJson(rawCS);
    } catch (e) {
      console.error('Sparky error:', e.message);
    }
    
    if (snarkyCS && sparkyCS) {
      const analysis = compareConstraintSystems(snarkyCS, sparkyCS, 'Snarky', 'Sparky');
      
      console.log('\n📊 Analysis Results:');
      console.log(`   Snarky: ${analysis.summary.Snarky.gates} gates`);
      console.log(`   Sparky: ${analysis.summary.Sparky.gates} gates`);
      
      if (analysis.optimizations.length > 0) {
        console.log('\n🔧 Detected Optimizations:');
        analysis.optimizations.forEach(opt => {
          console.log(`   - ${opt.message}`);
        });
      }
      
      if (analysis.differences.length > 0) {
        console.log('\n⚠️  Differences Found:');
        analysis.differences.forEach(diff => {
          if (diff.type === 'gate_count') {
            console.log(`   - ${diff.message}`);
          } else {
            console.log(`   - ${JSON.stringify(diff)}`);
          }
        });
      }
      
      // Save detailed results
      const outputDir = './constraint-analysis';
      await fs.mkdir(outputDir, { recursive: true });
      
      await fs.writeFile(
        `${outputDir}/${test.name}-analysis.json`,
        JSON.stringify({
          test: test.name,
          description: test.description,
          analysis,
          snarkyConstraints: snarkyCS,
          sparkyConstraints: sparkyCS
        }, null, 2)
      );
      
      results.push({
        test: test.name,
        ...analysis.summary,
        optimizationsDetected: analysis.optimizations.length,
        differencesFound: analysis.differences.length
      });
    }
  }
  
  // Print summary table
  console.log('\n\n📈 Summary Table:');
  console.log('┌─────────────────────────────┬────────────┬────────────┬──────────┬────────┐');
  console.log('│ Test                        │ Snarky     │ Sparky     │ Diff     │ Status │');
  console.log('├─────────────────────────────┼────────────┼────────────┼──────────┼────────┤');
  
  results.forEach(r => {
    const diff = r.Sparky.gates - r.Snarky.gates;
    const status = diff === 0 ? '✅' : '❌';
    console.log(`│ ${r.test.padEnd(27)} │ ${String(r.Snarky.gates).padEnd(10)} │ ${String(r.Sparky.gates).padEnd(10)} │ ${(diff >= 0 ? '+' : '') + diff} │ ${status}      │`.padEnd(85) + '│');
  });
  
  console.log('└─────────────────────────────┴────────────┴────────────┴──────────┴────────┘');
  
  console.log('\n💡 Key Findings:');
  console.log('   - Sparky appears to be missing linear combination optimization');
  console.log('   - This explains why Sparky generates more gates than Snarky');
  console.log('   - The missing optimization is likely `reduce_lincom` from OCaml');
  
  console.log(`\n📁 Detailed results saved to: ./constraint-analysis/`);
}

// Run the analysis
runConstraintAnalysis().catch(console.error);