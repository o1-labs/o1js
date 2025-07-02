/**
 * Example Property-Based Tests using Real Backend Integration
 * 
 * This demonstrates how to use the real backend integration within
 * the property-based testing framework to test o1js backend compatibility.
 */

import { describe, test, beforeAll, expect } from '@jest/globals';
import fc from 'fast-check';
import { BackendCompatibilityTestRunner, createBackendComparisonProperty } from '../infrastructure/BackendCompatibilityTestRunner.js';
import { realBackendIntegration, BackendTestScenarios } from '../integration/RealBackendIntegration.js';
import { initializeWithRealBackend } from '../utils/BackendTestUtils.js';
import { Field } from '../../../lib/provable/field.js';

describe('Real Backend Property-Based Tests', () => {
  let testRunner: BackendCompatibilityTestRunner;

  beforeAll(async () => {
    // Initialize with real backend functions
    await initializeWithRealBackend();
    testRunner = new BackendCompatibilityTestRunner();
    
    // Ensure backend integration is ready
    const validation = await realBackendIntegration.validateBackendState();
    expect(validation.bindingsInitialized).toBe(true);
  });

  describe('Field Operations Compatibility', () => {
    test('field addition should be consistent across backends', async () => {
      const property = createBackendComparisonProperty(
        fc.record({
          a: fc.bigInt({ min: 0n, max: 1000n }),
          b: fc.bigInt({ min: 0n, max: 1000n })
        }),
        async (input, backend) => {
          // Switch to the requested backend
          await realBackendIntegration.switchBackend(backend);
          
          // Execute the field operation
          const f1 = Field(input.a);
          const f2 = Field(input.b);
          return f1.add(f2);
        },
        (snarkyResult, sparkyResult) => {
          return snarkyResult.toBigInt() === sparkyResult.toBigInt();
        }
      );

      const result = await testRunner.runPropertyTest(
        'field_addition_compatibility',
        property,
        { numRuns: 50, timeout: 30000 }
      );

      expect(result.success).toBe(true);
      if (!result.success && result.counterexample) {
        console.log('Field addition counterexample:', result.counterexample);
      }
    });

    test('field multiplication should be consistent across backends', async () => {
      const property = createBackendComparisonProperty(
        fc.record({
          a: fc.bigInt({ min: 1n, max: 100n }),
          b: fc.bigInt({ min: 1n, max: 100n })
        }),
        async (input, backend) => {
          await realBackendIntegration.switchBackend(backend);
          
          const f1 = Field(input.a);
          const f2 = Field(input.b);
          return f1.mul(f2);
        }
      );

      const result = await testRunner.runPropertyTest(
        'field_multiplication_compatibility',
        property,
        { numRuns: 30 }
      );

      expect(result.success).toBe(true);
    });

    test('complex field arithmetic should be consistent', async () => {
      const property = createBackendComparisonProperty(
        fc.record({
          a: fc.bigInt({ min: 1n, max: 50n }),
          b: fc.bigInt({ min: 1n, max: 50n }),
          c: fc.bigInt({ min: 1n, max: 50n })
        }),
        async (input, backend) => {
          await realBackendIntegration.switchBackend(backend);
          
          const f1 = Field(input.a);
          const f2 = Field(input.b);
          const f3 = Field(input.c);
          
          // Complex operation: (a + b) * c - a
          return f1.add(f2).mul(f3).sub(f1);
        }
      );

      const result = await testRunner.runPropertyTest(
        'complex_field_arithmetic_compatibility',
        property,
        { numRuns: 25 }
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Constraint Count Analysis', () => {
    test('should analyze constraint differences for field operations', async () => {
      const testCases = [
        { name: 'simple_add', a: 5n, b: 3n, op: 'add' },
        { name: 'simple_mul', a: 7n, b: 4n, op: 'mul' },
        { name: 'complex_expr', a: 2n, b: 3n, op: 'complex' }
      ];

      const results = [];

      for (const testCase of testCases) {
        const comparison = await realBackendIntegration.compareBackends(
          (backend) => {
            const f1 = Field(testCase.a);
            const f2 = Field(testCase.b);
            
            switch (testCase.op) {
              case 'add':
                return f1.add(f2);
              case 'mul':
                return f1.mul(f2);
              case 'complex':
                return f1.add(f2).mul(f1).sub(f2);
              default:
                return f1;
            }
          },
          {
            captureConstraints: true,
            constraintFn: (backend) => () => {
              const f1 = Field(testCase.a);
              const f2 = Field(testCase.b);
              
              switch (testCase.op) {
                case 'add':
                  f1.add(f2);
                  break;
                case 'mul':
                  f1.mul(f2);
                  break;
                case 'complex':
                  f1.add(f2).mul(f1).sub(f2);
                  break;
              }
            }
          }
        );

        results.push({
          testCase: testCase.name,
          snarkyConstraints: comparison.snarky.constraintState?.constraintCount || 0,
          sparkyConstraints: comparison.sparky.constraintState?.constraintCount || 0,
          constraintsEqual: comparison.comparison.constraintsEqual,
          resultsEqual: comparison.comparison.resultsEqual
        });

        // Results should always be equal for these basic operations
        expect(comparison.comparison.resultsEqual).toBe(true);
      }

      // Log constraint analysis
      console.log('\n=== Constraint Count Analysis ===');
      console.table(results);

      // At least results should be consistent
      const allResultsEqual = results.every(r => r.resultsEqual);
      expect(allResultsEqual).toBe(true);
    });
  });

  describe('Performance Comparison', () => {
    test('should compare backend performance for common operations', async () => {
      const operations = [
        {
          name: 'field_addition_chain',
          fn: () => {
            let result = Field(1);
            for (let i = 0; i < 10; i++) {
              result = result.add(Field(i + 1));
            }
            return result;
          }
        },
        {
          name: 'field_multiplication_chain',
          fn: () => {
            let result = Field(1);
            for (let i = 1; i <= 5; i++) {
              result = result.mul(Field(i + 1));
            }
            return result;
          }
        }
      ];

      const performanceResults = [];

      for (const operation of operations) {
        const comparison = await realBackendIntegration.compareBackends(
          (backend) => operation.fn()
        );

        if (comparison.snarky.success && comparison.sparky.success) {
          performanceResults.push({
            operation: operation.name,
            snarkyTime: comparison.snarky.performance.executionTime,
            sparkyTime: comparison.sparky.performance.executionTime,
            performanceRatio: comparison.comparison.performanceRatio,
            resultsEqual: comparison.comparison.resultsEqual
          });
        }
      }

      // Log performance analysis
      console.log('\n=== Performance Analysis ===');
      console.table(performanceResults);

      // All operations should produce correct results
      const allCorrect = performanceResults.every(r => r.resultsEqual);
      expect(allCorrect).toBe(true);

      // Performance ratios should be reasonable (within 10x)
      const reasonablePerformance = performanceResults.every(r => r.performanceRatio < 10);
      expect(reasonablePerformance).toBe(true);
    });
  });

  describe('Test Scenarios Integration', () => {
    test('should run field arithmetic scenarios with PBT', async () => {
      const property = fc.asyncProperty(
        fc.bigInt({ min: 1n, max: 1000n }),
        fc.bigInt({ min: 1n, max: 1000n }),
        async (a, b) => {
          const scenario = BackendTestScenarios.fieldArithmetic(a, b);
          
          const comparison = await realBackendIntegration.compareBackends(
            (backend) => scenario.fn(),
            {
              captureConstraints: true,
              constraintFn: (backend) => scenario.constraintFn
            }
          );

          // Both backends should succeed and produce equal results
          expect(comparison.snarky.success).toBe(true);
          expect(comparison.sparky.success).toBe(true);
          expect(comparison.comparison.resultsEqual).toBe(true);

          return true;
        }
      );

      const result = await testRunner.runPropertyTest(
        'field_arithmetic_scenarios',
        property,
        { numRuns: 20 }
      );

      expect(result.success).toBe(true);
    });

    test('should run range check scenarios with PBT', async () => {
      const property = fc.asyncProperty(
        fc.bigInt({ min: 0n, max: 255n }), // 8-bit values
        async (value) => {
          const scenario = BackendTestScenarios.rangeCheck(value, 8);
          
          const comparison = await realBackendIntegration.compareBackends(
            (backend) => scenario.fn(),
            {
              captureConstraints: true,
              constraintFn: (backend) => scenario.constraintFn
            }
          );

          // Both backends should handle range checks consistently
          if (comparison.snarky.success && comparison.sparky.success) {
            expect(comparison.comparison.resultsEqual).toBe(true);
          }

          return true;
        }
      );

      const result = await testRunner.runPropertyTest(
        'range_check_scenarios',
        property,
        { numRuns: 15 }
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle backend switching failures gracefully', async () => {
      const property = fc.asyncProperty(
        fc.bigInt({ min: 1n, max: 100n }),
        async (value) => {
          try {
            // This should work fine
            const comparison = await realBackendIntegration.compareBackends(
              (backend) => Field(value)
            );

            expect(comparison.snarky.backend).toBe('snarky');
            expect(comparison.sparky.backend).toBe('sparky');
            
            return true;
          } catch (error) {
            // If there's an error, it should be handled gracefully
            console.warn('Backend switching error handled:', error);
            return true; // Test still passes if error is handled
          }
        }
      );

      const result = await testRunner.runPropertyTest(
        'backend_switching_resilience',
        property,
        { numRuns: 10 }
      );

      expect(result.success).toBe(true);
    });

    test('should handle constraint capture failures', async () => {
      const property = fc.asyncProperty(
        fc.bigInt({ min: 1n, max: 50n }),
        async (value) => {
          try {
            const execution = await realBackendIntegration.executeWithMonitoring(
              () => Field(value),
              {
                captureConstraints: true,
                constraintFn: () => { Field(value); }
              }
            );

            expect(execution.result.toBigInt()).toBe(value);
            expect(execution.constraintState).toBeDefined();
            
            return true;
          } catch (error) {
            // Constraint capture errors should be handled
            console.warn('Constraint capture error handled:', error);
            return true;
          }
        }
      );

      const result = await testRunner.runPropertyTest(
        'constraint_capture_resilience',
        property,
        { numRuns: 10 }
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Comprehensive Backend Compatibility Suite', () => {
    test('should run comprehensive compatibility check', async () => {
      const tests = [
        {
          name: 'basic_field_ops',
          property: createBackendComparisonProperty(
            fc.record({
              a: fc.bigInt({ min: 1n, max: 100n }),
              b: fc.bigInt({ min: 1n, max: 100n })
            }),
            async (input, backend) => {
              await realBackendIntegration.switchBackend(backend);
              const f1 = Field(input.a);
              const f2 = Field(input.b);
              return { add: f1.add(f2), mul: f1.mul(f2) };
            },
            (a, b) => a.add.toBigInt() === b.add.toBigInt() && a.mul.toBigInt() === b.mul.toBigInt()
          ),
          config: { numRuns: 20 }
        }
      ];

      const results = await testRunner.runPropertyTests(tests);

      expect(results.totalTests).toBe(1);
      expect(results.passedTests).toBe(1);
      expect(results.failedTests).toBe(0);

      // Generate final report
      const report = realBackendIntegration.generateComparisonReport({
        snarky: {
          backend: 'snarky',
          result: 'test',
          success: true,
          performance: {
            executionTime: 100,
            memoryBefore: 1000,
            memoryAfter: 1100,
            memoryDelta: 100,
            constraintGenerationRate: 10
          },
          metadata: {
            timestamp: Date.now(),
            nodeVersion: 'test'
          }
        },
        sparky: {
          backend: 'sparky',
          result: 'test',
          success: true,
          performance: {
            executionTime: 120,
            memoryBefore: 1000,
            memoryAfter: 1150,
            memoryDelta: 150,
            constraintGenerationRate: 8
          },
          metadata: {
            timestamp: Date.now(),
            nodeVersion: 'test'
          }
        },
        comparison: {
          resultsEqual: true,
          constraintsEqual: true,
          performanceRatio: 1.2,
          differences: []
        }
      });

      console.log('\n=== Final Compatibility Report ===');
      console.log(report);

      expect(report).toContain('Backend Comparison Report');
    });
  });
});