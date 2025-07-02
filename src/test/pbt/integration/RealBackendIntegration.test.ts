/**
 * Tests for Real Backend Integration
 * 
 * This test suite validates the real backend integration functionality
 * including backend switching, constraint system capture, and performance monitoring.
 */

import { describe, test, beforeAll, afterAll, expect } from '@jest/globals';
import { RealBackendIntegration, Backend, BackendTestScenarios } from './RealBackendIntegration.js';
import { Field } from '../../../lib/provable/field.js';

describe('RealBackendIntegration', () => {
  let integration: RealBackendIntegration;
  let originalBackend: Backend;

  beforeAll(async () => {
    integration = new RealBackendIntegration();
    
    // Wait for initialization and capture original backend
    await new Promise(resolve => setTimeout(resolve, 100));
    originalBackend = integration.getCurrentBackend();
  });

  afterAll(async () => {
    // Restore original backend
    if (integration) {
      try {
        await integration.switchBackend(originalBackend);
      } catch (error) {
        console.warn('Failed to restore original backend:', error);
      }
    }
  });

  describe('Initialization and Backend State', () => {
    test('should initialize successfully', async () => {
      const validation = await integration.validateBackendState();
      
      expect(validation.bindingsInitialized).toBe(true);
      expect(validation.errors.length).toBe(0);
      expect(['snarky', 'sparky']).toContain(validation.currentBackend);
    });

    test('should get current backend correctly', () => {
      const backend = integration.getCurrentBackend();
      expect(['snarky', 'sparky']).toContain(backend);
    });

    test('should validate backend state', async () => {
      const validation = await integration.validateBackendState();
      
      expect(validation).toMatchObject({
        bindingsInitialized: true,
        globalStateConsistent: true,
        errors: []
      });
    });
  });

  describe('Backend Switching', () => {
    test('should switch to Snarky backend successfully', async () => {
      const validation = await integration.switchBackend('snarky');
      
      expect(validation).toMatchObject({
        requestedBackend: 'snarky',
        actualBackend: 'snarky',
        switchSuccessful: true
      });
      
      expect(validation.switchTime).toBeGreaterThan(0);
      expect(validation.error).toBeUndefined();
    });

    test('should switch to Sparky backend successfully', async () => {
      const validation = await integration.switchBackend('sparky');
      
      expect(validation).toMatchObject({
        requestedBackend: 'sparky',
        actualBackend: 'sparky',
        switchSuccessful: true
      });
      
      expect(validation.switchTime).toBeGreaterThan(0);
      expect(validation.error).toBeUndefined();
    });

    test('should maintain backend state after switching', async () => {
      // Switch to Snarky
      await integration.switchBackend('snarky');
      expect(integration.getCurrentBackend()).toBe('snarky');
      
      // Switch to Sparky
      await integration.switchBackend('sparky');
      expect(integration.getCurrentBackend()).toBe('sparky');
      
      // Switch back to Snarky
      await integration.switchBackend('snarky');
      expect(integration.getCurrentBackend()).toBe('snarky');
    });
  });

  describe('Constraint System Capture', () => {
    test('should capture constraint state for simple field operation', async () => {
      const constraintState = await integration.captureConstraintState(() => {
        const f1 = Field(1);
        const f2 = Field(2);
        f1.add(f2);
      });

      expect(constraintState).toMatchObject({
        constraintCount: expect.any(Number),
        publicInputSize: expect.any(Number),
        witnessSize: expect.any(Number),
        digest: expect.any(String)
      });
      
      expect(constraintState.gates).toBeInstanceOf(Array);
      expect(constraintState.gatesSummary).toBeInstanceOf(Object);
      expect(constraintState.constraintCount).toBeGreaterThanOrEqual(0);
    });

    test('should capture different constraint counts for different operations', async () => {
      const simpleState = await integration.captureConstraintState(() => {
        Field(1).add(Field(2));
      });

      const complexState = await integration.captureConstraintState(() => {
        const f1 = Field(1);
        const f2 = Field(2);
        const f3 = Field(3);
        f1.add(f2).mul(f3).sub(f1);
      });

      // Complex operation should generally have more constraints
      expect(complexState.constraintCount).toBeGreaterThanOrEqual(simpleState.constraintCount);
    });
  });

  describe('Performance Monitoring', () => {
    test('should monitor execution performance', async () => {
      const execution = await integration.executeWithMonitoring(
        () => {
          const f1 = Field(1);
          const f2 = Field(2);
          return f1.add(f2);
        },
        {
          captureConstraints: true,
          constraintFn: () => {
            const f1 = Field(1);
            const f2 = Field(2);
            f1.add(f2);
          }
        }
      );

      expect(execution.result.toBigInt()).toBe(3n);
      expect(execution.performance).toMatchObject({
        executionTime: expect.any(Number),
        memoryBefore: expect.any(Number),
        memoryAfter: expect.any(Number),
        memoryDelta: expect.any(Number),
        constraintGenerationRate: expect.any(Number)
      });
      
      expect(execution.performance.executionTime).toBeGreaterThan(0);
      expect(execution.constraintState).toBeDefined();
      expect(execution.constraintState!.constraintCount).toBeGreaterThanOrEqual(0);
    });

    test('should handle monitoring of async operations', async () => {
      const execution = await integration.executeWithMonitoring(async () => {
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 10));
        return Field(42);
      });

      expect(execution.result.toBigInt()).toBe(42n);
      expect(execution.performance.executionTime).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Backend Comparison', () => {
    test('should compare simple field arithmetic between backends', async () => {
      const comparison = await integration.compareBackends(
        (backend) => {
          const f1 = Field(5);
          const f2 = Field(3);
          return f1.add(f2);
        },
        {
          captureConstraints: true,
          constraintFn: (backend) => () => {
            const f1 = Field(5);
            const f2 = Field(3);
            f1.add(f2);
          }
        }
      );

      expect(comparison.snarky.success).toBe(true);
      expect(comparison.sparky.success).toBe(true);
      expect(comparison.snarky.result.toBigInt()).toBe(8n);
      expect(comparison.sparky.result.toBigInt()).toBe(8n);
      expect(comparison.comparison.resultsEqual).toBe(true);
      
      // Both backends should capture constraints
      expect(comparison.snarky.constraintState).toBeDefined();
      expect(comparison.sparky.constraintState).toBeDefined();
      expect(comparison.snarky.constraintState!.constraintCount).toBeGreaterThanOrEqual(0);
      expect(comparison.sparky.constraintState!.constraintCount).toBeGreaterThanOrEqual(0);
    });

    test('should handle backend-specific errors gracefully', async () => {
      const comparison = await integration.compareBackends(
        (backend) => {
          if (backend === 'sparky') {
            // Simulate an operation that might fail on Sparky
            throw new Error('Simulated Sparky error for testing');
          }
          return Field(1);
        }
      );

      expect(comparison.snarky.success).toBe(true);
      expect(comparison.sparky.success).toBe(false);
      expect(comparison.sparky.error).toBeDefined();
      expect(comparison.comparison.resultsEqual).toBe(false);
      expect(comparison.comparison.differences).toContain('Success status: Snarky true, Sparky false');
    });

    test('should detect constraint count differences', async () => {
      // This test might reveal actual constraint differences between backends
      const comparison = await integration.compareBackends(
        (backend) => {
          const f1 = Field(1);
          const f2 = Field(2);
          const f3 = Field(3);
          return f1.add(f2).mul(f3);
        },
        {
          captureConstraints: true,
          constraintFn: (backend) => () => {
            const f1 = Field(1);
            const f2 = Field(2);
            const f3 = Field(3);
            f1.add(f2).mul(f3);
          }
        }
      );

      if (comparison.snarky.success && comparison.sparky.success) {
        const snarkyConstraints = comparison.snarky.constraintState!.constraintCount;
        const sparkyConstraints = comparison.sparky.constraintState!.constraintCount;
        
        console.log(`Constraint counts - Snarky: ${snarkyConstraints}, Sparky: ${sparkyConstraints}`);
        
        // This test documents whether constraint counts match between backends
        if (snarkyConstraints !== sparkyConstraints) {
          expect(comparison.comparison.constraintsEqual).toBe(false);
          expect(comparison.comparison.differences).toContain(
            expect.stringContaining('Constraint counts:')
          );
        } else {
          expect(comparison.comparison.constraintsEqual).toBe(true);
        }
      }
    });
  });

  describe('Performance Baselines and Regression Detection', () => {
    test('should create performance baseline', async () => {
      const simpleTests = [
        {
          name: 'simple_add',
          fn: () => Field(1).add(Field(2)),
          constraintFn: () => { Field(1).add(Field(2)); }
        },
        {
          name: 'simple_mul',
          fn: () => Field(3).mul(Field(4)),
          constraintFn: () => { Field(3).mul(Field(4)); }
        }
      ];

      const baseline = await integration.createPerformanceBaseline(simpleTests);
      
      expect(baseline.size).toBe(simpleTests.length);
      expect(baseline.get('simple_add')).toBeDefined();
      expect(baseline.get('simple_mul')).toBeDefined();
      
      const addMetrics = baseline.get('simple_add')!;
      expect(addMetrics.executionTime).toBeGreaterThan(0);
      expect(addMetrics.constraintGenerationRate).toBeGreaterThanOrEqual(0);
    });

    test('should detect performance regressions', async () => {
      const baseline = {
        executionTime: 100,
        memoryBefore: 1000,
        memoryAfter: 1100,
        memoryDelta: 100,
        constraintGenerationRate: 10
      };

      // Test regression detection
      const regressed = {
        executionTime: 200, // 2x slower
        memoryBefore: 1000,
        memoryAfter: 1300,
        memoryDelta: 300, // 3x more memory
        constraintGenerationRate: 5 // 0.5x rate
      };

      const analysis = integration.detectPerformanceRegressions(regressed, baseline);
      
      expect(analysis.hasRegressions).toBe(true);
      expect(analysis.regressions.length).toBeGreaterThan(0);
      expect(analysis.regressions.some(r => r.includes('Execution time regression'))).toBe(true);
    });
  });

  describe('Test Scenarios', () => {
    test('should execute field arithmetic scenario', async () => {
      const scenario = BackendTestScenarios.fieldArithmetic(5n, 3n);
      
      const execution = await integration.executeWithMonitoring(
        scenario.fn,
        { captureConstraints: true, constraintFn: scenario.constraintFn }
      );

      expect(execution.result).toBeDefined();
      expect(execution.result.toBigInt()).toBeDefined();
      expect(execution.constraintState).toBeDefined();
    });

    test('should execute range check scenario', async () => {
      const scenario = BackendTestScenarios.rangeCheck(255n, 8);
      
      const execution = await integration.executeWithMonitoring(
        scenario.fn,
        { captureConstraints: true, constraintFn: scenario.constraintFn }
      );

      expect(execution.result).toBeDefined();
      expect(execution.constraintState).toBeDefined();
      expect(execution.constraintState!.constraintCount).toBeGreaterThan(0);
    });
  });

  describe('Report Generation', () => {
    test('should generate comprehensive comparison report', async () => {
      const comparison = await integration.compareBackends(
        (backend) => Field(10).add(Field(20))
      );

      const report = integration.generateComparisonReport(comparison);
      
      expect(report).toContain('Backend Comparison Report');
      expect(report).toContain('Results Comparison:');
      expect(report).toContain('Performance Comparison:');
      expect(report).toContain('Snarky Execution Time:');
      expect(report).toContain('Sparky Execution Time:');
      expect(report).toContain('Performance Ratio:');
    });
  });

  describe('Error Handling', () => {
    test('should handle constraint capture errors gracefully', async () => {
      await expect(
        integration.captureConstraintState(() => {
          throw new Error('Test constraint error');
        })
      ).rejects.toThrow('Failed to capture constraint state');
    });

    test('should handle execution monitoring errors', async () => {
      const execution = await integration.executeWithMonitoring(() => {
        throw new Error('Test execution error');
      });

      // The function should not return successful execution but should throw
      await expect(
        integration.executeWithMonitoring(() => {
          throw new Error('Test execution error');
        })
      ).rejects.toThrow();
    });

    test('should handle backend switch failures', async () => {
      // Try switching to invalid backend
      const validation = await integration.switchBackend('invalid' as Backend);
      
      expect(validation.switchSuccessful).toBe(false);
      expect(validation.error).toBeDefined();
    });
  });
});

describe('Backend Integration Edge Cases', () => {
  let integration: RealBackendIntegration;

  beforeAll(() => {
    integration = new RealBackendIntegration();
  });

  test('should handle concurrent backend operations', async () => {
    // This tests that the integration can handle multiple concurrent operations
    const promises = [
      integration.executeWithMonitoring(() => Field(1).add(Field(2))),
      integration.executeWithMonitoring(() => Field(3).mul(Field(4))),
      integration.executeWithMonitoring(() => Field(5).sub(Field(1)))
    ];

    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(3);
    expect(results[0].result.toBigInt()).toBe(3n);
    expect(results[1].result.toBigInt()).toBe(12n);
    expect(results[2].result.toBigInt()).toBe(4n);
  });

  test('should handle timeout scenarios', async () => {
    const timeoutTest = integration.compareBackends(
      async (backend) => {
        // Simulate slow operation
        await new Promise(resolve => setTimeout(resolve, 100));
        return Field(1);
      },
      { timeoutMs: 50 } // Short timeout
    );

    const results = await timeoutTest;
    
    // Either both should timeout or both should succeed (depending on actual execution time)
    expect(results.snarky.success === results.sparky.success).toBe(true);
  });

  test('should maintain state isolation between tests', async () => {
    // First operation
    const result1 = await integration.executeWithMonitoring(() => {
      return Field(100);
    });

    // Switch backend
    await integration.switchBackend('sparky');

    // Second operation should not be affected by first
    const result2 = await integration.executeWithMonitoring(() => {
      return Field(200);
    });

    expect(result1.result.toBigInt()).toBe(100n);
    expect(result2.result.toBigInt()).toBe(200n);
  });
});