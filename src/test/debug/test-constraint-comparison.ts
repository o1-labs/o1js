#!/usr/bin/env node

/**
 * Standalone Test Script for Constraint Comparison
 * 
 * This script demonstrates the constraint comparison tool on specific circuits
 * that are known to fail, providing detailed insights into the differences.
 */

import { Field, Bool, Provable, Poseidon, switchBackend, Gadgets } from '../../../dist/node/index.js';
import { compareConstraintSystems, analyzeConstraintSystem, generateConstraintReport } from './constraint-comparison.js';

async function runConstraintAnalysis() {
  console.log('🔍 Starting Constraint Analysis Between Snarky and Sparky\n');
  
  // Test cases that are known to fail
  const testCases = [
    {
      name: 'Simple Addition',
      circuit: () => {
        const a = Provable.witness(Field, () => Field(5));
        const b = Provable.witness(Field, () => Field(7));
        const c = Provable.witness(Field, () => Field(12));
        a.add(b).assertEquals(c);
      }
    },
    {
      name: 'Field Multiplication',
      circuit: () => {
        const a = Provable.witness(Field, () => Field(6));
        const b = Provable.witness(Field, () => Field(7));
        const c = Provable.witness(Field, () => Field(42));
        a.mul(b).assertEquals(c);
      }
    },
    {
      name: 'Boolean Operations',
      circuit: () => {
        const a = Provable.witness(Bool, () => Bool(true));
        const b = Provable.witness(Bool, () => Bool(false));
        const and = a.and(b);
        const or = a.or(b);
        and.or(or).assertEquals(Bool(true));
      }
    },
    {
      name: 'Poseidon Hash',
      circuit: () => {
        const inputs = [
          Provable.witness(Field, () => Field(1)),
          Provable.witness(Field, () => Field(2)),
          Provable.witness(Field, () => Field(3)),
        ];
        const hash = Poseidon.hash(inputs);
        hash.assertEquals(hash); // Trivial constraint to ensure hash is computed
      }
    },
    {
      name: 'Range Check 32-bit',
      circuit: () => {
        const value = Provable.witness(Field, () => Field((1n << 32n) - 1n));
        Gadgets.rangeCheck32(value);
      }
    }
  ];

  console.log('📊 Individual Test Case Analysis:\n');
  
  // Run detailed comparison for each test case
  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧪 Testing: ${testCase.name}`);
    console.log(`${'='.repeat(80)}`);
    
    try {
      // Detailed constraint comparison
      const comparison = await compareConstraintSystems(
        testCase.name, 
        testCase.circuit,
        {
          verboseOutput: false, // Set to true for even more detail
          maxDifferences: 15,
          showIdentical: false
        }
      );
      
      // Individual backend analysis
      console.log('\n🔬 Analyzing Snarky implementation:');
      await analyzeConstraintSystem(testCase.name + ' (Snarky)', testCase.circuit, 'snarky');
      
      console.log('\n🔬 Analyzing Sparky implementation:');
      await analyzeConstraintSystem(testCase.name + ' (Sparky)', testCase.circuit, 'sparky');
      
    } catch (error) {
      console.error(`❌ Failed to analyze ${testCase.name}:`, error);
      console.error('Error details:', error.stack);
    }
    
    // Add a small delay to avoid overwhelming the output
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 Generating Comprehensive Report');
  console.log('='.repeat(80));
  
  // Generate comprehensive report
  try {
    await generateConstraintReport(testCases, 'reports/constraint-comparison-report.md');
  } catch (error) {
    console.error('❌ Failed to generate report:', error);
    // Generate report to console instead
    await generateConstraintReport(testCases);
  }
  
  console.log('\n✅ Constraint analysis complete!');
  console.log('\n🎯 Key findings will help identify the root cause of Sparky/Snarky differences.');
}

// Run the analysis
runConstraintAnalysis().catch(error => {
  console.error('💥 Constraint analysis failed:', error);
  process.exit(1);
});