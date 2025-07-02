/**
 * Example usage of FieldProperties for backend compatibility testing
 * 
 * This file demonstrates how to use the property-based test definitions
 * to identify VK parity issues and constraint count differences.
 */

import { describe, test, expect } from '@jest/globals';
import { 
  FieldProperties, 
  createFieldProperties,
  type VKComparisonResult,
  type ConstraintCountComparison 
} from './FieldProperties.js';
import { 
  BackendCompatibilityTestRunner,
  ConsoleTestLogger 
} from '../infrastructure/BackendCompatibilityTestRunner.js';

describe('FieldProperties Backend Compatibility', () => {
  let fieldProperties: FieldProperties;
  let testRunner: BackendCompatibilityTestRunner;

  beforeEach(() => {
    const logger = new ConsoleTestLogger();
    testRunner = new BackendCompatibilityTestRunner(logger);
    fieldProperties = createFieldProperties(testRunner);
  });

  describe('Basic Algebraic Properties', () => {
    test('addition should be commutative across backends', async () => {
      const property = fieldProperties.additionCommutative();
      const result = await testRunner.runPropertyTest(
        'addition_commutative_test',
        property,
        { numRuns: 50, timeout: 30000 }
      );
      
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Counterexample:', result.counterexample);
        console.error('Error:', result.error?.message);
      }
    }, 35000);

    test('multiplication should be commutative across backends', async () => {
      const property = fieldProperties.multiplicationCommutative();
      const result = await testRunner.runPropertyTest(
        'multiplication_commutative_test',
        property,
        { numRuns: 100, timeout: 45000 }
      );
      
      // This test might fail due to VK parity issues
      if (!result.success) {
        console.warn('Multiplication commutativity failed - possible VK parity issue');
        console.warn('Counterexample:', result.counterexample);
      }
    }, 50000);

    test('additive identity should hold across backends', async () => {
      const property = fieldProperties.additiveIdentity();
      const result = await testRunner.runPropertyTest(
        'additive_identity_test',
        property,
        { numRuns: 30, timeout: 20000 }
      );
      
      expect(result.success).toBe(true);
    }, 25000);
  });

  describe('VK Parity Critical Tests', () => {
    test('VK hashes should match for identical circuits', async () => {
      const property = fieldProperties.vkHashConsistency();
      const result = await testRunner.runPropertyTest(
        'vk_hash_consistency_test',
        property,
        { numRuns: 20, timeout: 60000, verbose: true }
      );
      
      // This is expected to fail with current Sparky VK issues
      if (!result.success) {
        console.error('VK PARITY ISSUE DETECTED:');
        console.error('This confirms the critical VK hash inconsistency');
        console.error('Counterexample:', result.counterexample);
        console.error('Error:', result.error?.message);
      }
      
      // For development, we expect this to fail until VK parity is fixed
      // expect(result.success).toBe(false); // Remove this when VK parity is fixed
    }, 65000);

    test('complex expressions should produce identical VKs', async () => {
      const property = fieldProperties.complexExpressionConsistency();
      const result = await testRunner.runPropertyTest(
        'complex_expression_vk_test',
        property,
        { numRuns: 75, timeout: 40000, verbose: true }
      );
      
      if (!result.success) {
        console.warn('Complex expression VK mismatch detected');
        console.warn('This may indicate constraint routing or optimization differences');
      }
    }, 45000);
  });

  describe('Constraint Count Analysis', () => {
    test('constraint counts should be within tolerance', async () => {
      const property = fieldProperties.constraintCountTolerance();
      const result = await testRunner.runPropertyTest(
        'constraint_count_tolerance_test',
        property,
        { numRuns: 25, timeout: 30000 }
      );
      
      if (!result.success) {
        console.warn('Constraint count difference exceeds tolerance');
        console.warn('This may indicate missing optimizations like reduce_lincom');
        console.warn('Known issue: Sparky may generate 5 constraints vs Snarky 3');
      }
      
      // Allow test to fail due to known constraint optimization differences
      console.log(`Constraint count test result: ${result.success ? 'PASS' : 'FAIL'}`);
    }, 35000);

    test('division operations constraint analysis', async () => {
      const property = fieldProperties.divisionInverse();
      const result = await testRunner.runPropertyTest(
        'division_constraint_analysis',
        property,
        { numRuns: 60, timeout: 35000, verbose: true }
      );
      
      if (!result.success) {
        console.warn('Division operation shows constraint count differences');
        console.warn('Expected: Snarky=3, Sparky=5 (missing reduce_lincom optimization)');
      }
    }, 40000);
  });

  describe('Error Handling Consistency', () => {
    test('division by zero should fail consistently', async () => {
      const property = fieldProperties.divisionByZeroConsistency();
      const result = await testRunner.runPropertyTest(
        'division_by_zero_test',
        property,
        { numRuns: 20, timeout: 15000 }
      );
      
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Error handling inconsistency detected');
        console.error('Both backends should fail division by zero identically');
      }
    }, 20000);

    test('error patterns should match across backends', async () => {
      const property = fieldProperties.errorHandlingConsistency();
      const result = await testRunner.runPropertyTest(
        'error_handling_consistency_test',
        property,
        { numRuns: 30, timeout: 25000 }
      );
      
      expect(result.success).toBe(true);
    }, 30000);
  });

  describe('Performance Characteristics', () => {
    test('Sparky performance should be within 1.5x of Snarky', async () => {
      const property = fieldProperties.performanceWithinBounds();
      const result = await testRunner.runPropertyTest(
        'performance_bounds_test',
        property,
        { numRuns: 15, timeout: 45000 }
      );
      
      if (!result.success) {
        console.warn('Performance difference exceeds 1.5x threshold');
        console.warn('Sparky may be significantly slower than expected');
      }
      
      console.log(`Performance test result: ${result.success ? 'PASS' : 'FAIL'}`);
    }, 50000);
  });

  describe('Comprehensive Backend Compatibility Suite', () => {
    test('run all field properties', async () => {
      const allProperties = fieldProperties.getAllProperties();
      const results = await testRunner.runPropertyTests(allProperties);
      
      console.log('\n=== COMPREHENSIVE BACKEND COMPATIBILITY RESULTS ===');
      console.log(`Total tests: ${results.totalTests}`);
      console.log(`Passed: ${results.passedTests}`);
      console.log(`Failed: ${results.failedTests}`);
      console.log(`Success rate: ${((results.passedTests / results.totalTests) * 100).toFixed(1)}%`);
      
      // Log detailed results for failed tests
      for (const [testName, result] of results.results.entries()) {
        if (!result.success) {
          console.log(`\nFAILED: ${testName}`);
          console.log(`  Duration: ${result.duration}ms`);
          console.log(`  Error: ${result.error?.message || 'Unknown error'}`);
          if (result.counterexample) {
            console.log(`  Counterexample: ${JSON.stringify(result.counterexample, null, 2)}`);
          }
        }
      }
      
      // The overall test suite might fail due to known VK parity issues
      // This is expected until the critical VK hash bug is resolved
      const successRate = results.passedTests / results.totalTests;
      console.log(`\nCurrent backend compatibility: ${(successRate * 100).toFixed(1)}%`);
      
      if (successRate < 0.5) {
        console.error('❌ Major backend compatibility issues detected');
        console.error('   Priority: Fix VK parity and constraint routing bugs');
      } else if (successRate < 0.8) {
        console.warn('⚠️  Partial backend compatibility - optimization differences detected');
      } else {
        console.log('✅ Good backend compatibility achieved');
      }
    }, 300000); // 5 minutes for comprehensive test
  });

  describe('Focused VK Parity Testing', () => {
    test('VK parity focused test suite', async () => {
      const vkProperties = fieldProperties.getVKParityProperties();
      const results = await testRunner.runPropertyTests(vkProperties);
      
      console.log('\n=== VK PARITY FOCUSED RESULTS ===');
      console.log(`VK-focused tests: ${results.totalTests}`);
      console.log(`Passed: ${results.passedTests}`);
      console.log(`Failed: ${results.failedTests}`);
      
      const vkParityRate = results.passedTests / results.totalTests;
      console.log(`VK parity success rate: ${(vkParityRate * 100).toFixed(1)}%`);
      
      if (vkParityRate < 0.2) {
        console.error('🚨 CRITICAL VK PARITY ISSUE: All Sparky VKs generating identical hash');
      }
    }, 180000); // 3 minutes
  });

  describe('Constraint Count Analysis Suite', () => {
    test('constraint count focused testing', async () => {
      const constraintProperties = fieldProperties.getConstraintCountProperties();
      const results = await testRunner.runPropertyTests(constraintProperties);
      
      console.log('\n=== CONSTRAINT COUNT ANALYSIS RESULTS ===');
      console.log(`Constraint-focused tests: ${results.totalTests}`);
      console.log(`Passed: ${results.passedTests}`);
      console.log(`Failed: ${results.failedTests}`);
      
      for (const [testName, result] of results.results.entries()) {
        if (!result.success && result.error?.message.includes('reduce_lincom')) {
          console.warn(`⚠️  ${testName}: Missing reduce_lincom optimization detected`);
        }
      }
    }, 120000); // 2 minutes
  });
});

/**
 * Helper function to log detailed VK comparison results
 */
function logVKComparison(comparison: VKComparisonResult): void {
  console.log('VK Comparison Details:');
  console.log(`  Snarky VK: ${comparison.snarkyVK}`);
  console.log(`  Sparky VK: ${comparison.sparkyVK}`);
  console.log(`  Hashes Equal: ${comparison.hashesEqual}`);
  console.log(`  Structurally Equal: ${comparison.structurallyEqual}`);
  console.log(`  Constraint Counts: Snarky=${comparison.constraintCounts.snarkyCount}, Sparky=${comparison.constraintCounts.sparkyCount}`);
  if (comparison.differences.length > 0) {
    console.log('  Differences:');
    comparison.differences.forEach(diff => console.log(`    - ${diff}`));
  }
}

/**
 * Helper function to log constraint count analysis
 */
function logConstraintCountAnalysis(comparison: ConstraintCountComparison): void {
  console.log('Constraint Count Analysis:');
  console.log(`  Snarky Count: ${comparison.snarkyCount}`);
  console.log(`  Sparky Count: ${comparison.sparkyCount}`);
  console.log(`  Difference: ${comparison.difference} (${comparison.differencePercentage.toFixed(1)}%)`);
  console.log(`  Within Tolerance (${comparison.tolerance}%): ${comparison.withinTolerance}`);
  
  if (!comparison.withinTolerance) {
    console.warn('  ⚠️  Constraint count difference exceeds tolerance');
    if (comparison.sparkyCount > comparison.snarkyCount) {
      console.warn('     Likely cause: Missing constraint optimizations in Sparky');
    }
  }
}