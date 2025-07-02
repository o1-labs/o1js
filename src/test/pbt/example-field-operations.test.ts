/**
 * Example: Field Operations Property-Based Tests
 * 
 * This file demonstrates how to use the PBT infrastructure
 * to test field operations across backends.
 */

import fc from 'fast-check';
import { describe, test, expect } from '@jest/globals';
import {
  BackendCompatibilityTestRunner,
  createBackendComparisonProperty,
  compareBackends,
  FieldCompare,
  ConstraintCompare,
  formatAggregatedResults,
  aggregateResults
} from './index.js';

// Mock Field type for example (will be replaced with actual o1js import)
interface Field {
  toBigInt(): bigint;
  add(other: Field): Field;
  mul(other: Field): Field;
  div(other: Field): Field;
  sqrt(): Field;
  inverse(): Field;
}

// Mock field arbitrary generator (will be replaced with actual implementation)
const fieldArbitrary = fc.bigInt({ min: 0n, max: 1000n }).map(n => ({
  toBigInt: () => n,
  add: (other: Field) => ({ toBigInt: () => n + other.toBigInt() } as Field),
  mul: (other: Field) => ({ toBigInt: () => n * other.toBigInt() } as Field),
  div: (other: Field) => ({ toBigInt: () => n / other.toBigInt() } as Field),
  sqrt: () => ({ toBigInt: () => BigInt(Math.floor(Math.sqrt(Number(n)))) } as Field),
  inverse: () => ({ toBigInt: () => 1n } as Field) // Simplified
}));

describe('Field Operations Backend Compatibility', () => {
  const runner = new BackendCompatibilityTestRunner();

  test('field addition produces identical results', async () => {
    const property = createBackendComparisonProperty(
      fc.tuple(fieldArbitrary, fieldArbitrary),
      async ([a, b], backend) => {
        // In real implementation, this would switch backends and perform operation
        console.log(`Running field addition on ${backend} backend`);
        return a.add(b);
      },
      (snarky, sparky) => FieldCompare.equals(snarky, sparky)
    );

    const result = await runner.runPropertyTest(
      'field-addition',
      property,
      { numRuns: 100, seed: 42 }
    );

    expect(result.success).toBe(true);
  });

  test('field multiplication produces identical results', async () => {
    const property = createBackendComparisonProperty(
      fc.tuple(fieldArbitrary, fieldArbitrary),
      async ([a, b], backend) => {
        console.log(`Running field multiplication on ${backend} backend`);
        return a.mul(b);
      },
      (snarky, sparky) => FieldCompare.equals(snarky, sparky)
    );

    const result = await runner.runPropertyTest(
      'field-multiplication',
      property,
      { numRuns: 100 }
    );

    expect(result.success).toBe(true);
  });

  test('complex field operations maintain consistency', async () => {
    const property = createBackendComparisonProperty(
      fc.tuple(fieldArbitrary, fieldArbitrary, fieldArbitrary),
      async ([a, b, c], backend) => {
        // Complex operation: (a + b) * c
        const sum = a.add(b);
        return sum.mul(c);
      },
      (snarky, sparky) => FieldCompare.equals(snarky, sparky)
    );

    const result = await runner.runPropertyTest(
      'complex-field-operation',
      property,
      { numRuns: 200 }
    );

    expect(result.success).toBe(true);
  });

  test('batch property tests with reporting', async () => {
    const tests = [
      {
        name: 'addition',
        property: createBackendComparisonProperty(
          fc.tuple(fieldArbitrary, fieldArbitrary),
          async ([a, b]) => a.add(b)
        )
      },
      {
        name: 'multiplication',
        property: createBackendComparisonProperty(
          fc.tuple(fieldArbitrary, fieldArbitrary),
          async ([a, b]) => a.mul(b)
        )
      },
      {
        name: 'inverse',
        property: createBackendComparisonProperty(
          fieldArbitrary,
          async (a) => a.inverse()
        )
      }
    ];

    const results = await runner.runPropertyTests(tests);
    
    console.log(`Total tests: ${results.totalTests}`);
    console.log(`Passed: ${results.passedTests}`);
    console.log(`Failed: ${results.failedTests}`);

    expect(results.failedTests).toBe(0);
  });

  test('constraint count comparison', async () => {
    const results = await compareBackends(async (backend) => {
      console.log(`Running constraint count test on ${backend}`);
      
      // Mock constraint counts (in real implementation, these would be captured)
      const mockConstraints = backend === 'snarky' ? 3 : 5;
      
      return {
        result: 'mock-result',
        constraints: mockConstraints
      };
    });

    const constraintRatio = ConstraintCompare.ratio(
      results.snarky.constraintCount || 0,
      results.sparky.constraintCount || 0
    );

    console.log(ConstraintCompare.format(
      results.snarky.constraintCount || 0,
      results.sparky.constraintCount || 0
    ));

    // Known issue: Sparky has ~1.67x more constraints
    expect(constraintRatio).toBeLessThanOrEqual(2.0);
  });

  test('aggregate results reporting', async () => {
    // Run multiple tests and aggregate results
    const testResults = [];

    for (let i = 0; i < 5; i++) {
      const result = await compareBackends(async (backend) => {
        return { value: i * 2 };
      });

      testResults.push({
        name: `test-${i}`,
        snarky: result.snarky,
        sparky: result.sparky,
        equal: true // Simplified for example
      });
    }

    const aggregated = aggregateResults(testResults);
    const report = formatAggregatedResults(aggregated);

    console.log('\n' + report);

    expect(aggregated.matchingResults).toBe(aggregated.totalTests);
  });
});

/**
 * Example of a custom property generator
 */
const fieldOperationArbitrary = fc.oneof(
  fc.record({
    type: fc.constant('add' as const),
    inputs: fc.tuple(fieldArbitrary, fieldArbitrary)
  }),
  fc.record({
    type: fc.constant('mul' as const),
    inputs: fc.tuple(fieldArbitrary, fieldArbitrary)
  }),
  fc.record({
    type: fc.constant('inverse' as const),
    inputs: fc.tuple(fieldArbitrary)
  })
);

describe('Field Operation Generators', () => {
  test('generated operations are valid', () => {
    fc.assert(
      fc.property(fieldOperationArbitrary, (op) => {
        // Verify operation structure
        expect(op.type).toMatch(/^(add|mul|inverse)$/);
        expect(op.inputs).toBeDefined();
        
        if (op.type === 'add' || op.type === 'mul') {
          expect(op.inputs).toHaveLength(2);
        } else {
          expect(op.inputs).toHaveLength(1);
        }
      })
    );
  });
});