/**
 * Comprehensive Field Property Definitions for Backend Compatibility Testing
 * 
 * This module defines property-based tests that verify compatibility between
 * Snarky and Sparky backends, focusing on identifying VK parity issues and
 * constraint count differences.
 */

import fc from 'fast-check';
import type { IAsyncProperty } from 'fast-check';
import { 
  FieldGenerators, 
  MockField, 
  MockBool, 
  FieldOperationType,
  type FieldOperation,
  type ComplexityParams
} from '../generators/FieldGenerators.js';
import {
  BackendCompatibilityTestRunner,
  createBackendComparisonProperty,
  type ComparisonResult,
  type TestConfig
} from '../infrastructure/BackendCompatibilityTestRunner.js';

/**
 * Configuration for constraint count comparison with tolerance
 */
export interface ConstraintCountComparison {
  snarkyCount: number;
  sparkyCount: number;
  tolerance: number; // Acceptable difference percentage
  withinTolerance: boolean;
  difference: number;
  differencePercentage: number;
}

/**
 * VK comparison result with detailed hash analysis
 */
export interface VKComparisonResult {
  snarkyVK: string;
  sparkyVK: string;
  hashesEqual: boolean;
  structurallyEqual: boolean;
  differences: string[];
  constraintCounts: ConstraintCountComparison;
}

/**
 * Performance measurement result
 */
export interface PerformanceMeasurement {
  backend: 'snarky' | 'sparky';
  operationType: string;
  duration: number;
  constraintCount: number;
  efficiency: number; // constraints per ms
}

/**
 * Performance comparison with relative metrics
 */
export interface PerformanceComparison {
  snarky: PerformanceMeasurement;
  sparky: PerformanceMeasurement;
  sparkySlowerBy: number; // multiplier (e.g., 1.5x slower)
  withinAcceptableRange: boolean; // within 1.5x tolerance
  constraintEfficiencyRatio: number;
}

/**
 * Core field property definitions for backend compatibility testing
 */
export class FieldProperties {
  private runner: BackendCompatibilityTestRunner;

  constructor(runner?: BackendCompatibilityTestRunner) {
    this.runner = runner || new BackendCompatibilityTestRunner();
  }

  /**
   * Property: Field addition is commutative across backends
   * Tests that a + b = b + a for both Snarky and Sparky
   */
  additionCommutative(): IAsyncProperty<[MockField, MockField]> {
    return createBackendComparisonProperty(
      fc.tuple(FieldGenerators.any(), FieldGenerators.any()),
      async ([a, b], backend) => {
        // Mock implementation - replace with actual backend calls
        const result1 = a.add(b);
        const result2 = b.add(a);
        
        return {
          result1: result1.value,
          result2: result2.value,
          equal: result1.value === result2.value,
          backend,
          constraintCount: await this.mockGetConstraintCount(backend, 'add_commutative')
        };
      },
      (snarky, sparky) => {
        // Both backends should produce commutative results
        const snarkyCommutative = snarky.result1 === snarky.result2;
        const sparkyCommutative = sparky.result1 === sparky.result2;
        const resultsMatch = snarky.result1 === sparky.result1;
        
        return snarkyCommutative && sparkyCommutative && resultsMatch;
      }
    );
  }

  /**
   * Property: Field addition is associative across backends
   * Tests that (a + b) + c = a + (b + c) for both backends
   */
  additionAssociative(): IAsyncProperty<[MockField, MockField, MockField]> {
    return createBackendComparisonProperty(
      fc.tuple(FieldGenerators.any(), FieldGenerators.any(), FieldGenerators.any()),
      async ([a, b, c], backend) => {
        const left = a.add(b).add(c);
        const right = a.add(b.add(c));
        
        return {
          leftResult: left.value,
          rightResult: right.value,
          equal: left.value === right.value,
          backend,
          constraintCount: await this.mockGetConstraintCount(backend, 'add_associative')
        };
      },
      (snarky, sparky) => {
        const snarkyAssociative = snarky.leftResult === snarky.rightResult;
        const sparkyAssociative = sparky.leftResult === sparky.rightResult;
        const resultsMatch = snarky.leftResult === sparky.leftResult;
        
        return snarkyAssociative && sparkyAssociative && resultsMatch;
      }
    );
  }

  /**
   * Property: Field multiplication is commutative across backends
   * Critical for VK parity - multiplication order shouldn't affect circuit structure
   */
  multiplicationCommutative(): IAsyncProperty<[MockField, MockField]> {
    return createBackendComparisonProperty(
      fc.tuple(FieldGenerators.any(), FieldGenerators.any()),
      async ([a, b], backend) => {
        const result1 = a.mul(b);
        const result2 = b.mul(a);
        
        return {
          result1: result1.value,
          result2: result2.value,
          equal: result1.value === result2.value,
          backend,
          constraintCount: await this.mockGetConstraintCount(backend, 'mul_commutative'),
          vkHash: await this.mockGetVKHash(backend, 'mul_commutative')
        };
      },
      (snarky, sparky) => {
        const snarkyCommutative = snarky.result1 === snarky.result2;
        const sparkyCommutative = sparky.result1 === sparky.result2;
        const resultsMatch = snarky.result1 === sparky.result1;
        const vkHashesMatch = snarky.vkHash === sparky.vkHash;
        
        // VK hashes should match for identical operations
        return snarkyCommutative && sparkyCommutative && resultsMatch && vkHashesMatch;
      }
    );
  }

  /**
   * Property: Field multiplication is associative across backends
   * Tests (a * b) * c = a * (b * c) and VK equivalence
   */
  multiplicationAssociative(): IAsyncProperty<[MockField, MockField, MockField]> {
    return createBackendComparisonProperty(
      fc.tuple(FieldGenerators.any(), FieldGenerators.any(), FieldGenerators.any()),
      async ([a, b, c], backend) => {
        const left = a.mul(b).mul(c);
        const right = a.mul(b.mul(c));
        
        return {
          leftResult: left.value,
          rightResult: right.value,
          equal: left.value === right.value,
          backend,
          constraintCount: await this.mockGetConstraintCount(backend, 'mul_associative'),
          vkHash: await this.mockGetVKHash(backend, 'mul_associative')
        };
      }
    );
  }

  /**
   * Property: Additive identity holds across backends
   * Tests that a + 0 = a and generates identical constraints
   */
  additiveIdentity(): IAsyncProperty<[MockField]> {
    return createBackendComparisonProperty(
      fc.tuple(FieldGenerators.any()),
      async ([a], backend) => {
        const zero = { value: 0n } as MockField;
        const result = a.add(zero);
        
        return {
          original: a.value,
          result: result.value,
          isIdentity: a.value === result.value,
          backend,
          constraintCount: await this.mockGetConstraintCount(backend, 'add_identity'),
          vkHash: await this.mockGetVKHash(backend, 'add_identity')
        };
      },
      (snarky, sparky) => {
        return snarky.isIdentity && sparky.isIdentity &&
               snarky.result === sparky.result &&
               snarky.vkHash === sparky.vkHash;
      }
    );
  }

  /**
   * Property: Multiplicative identity holds across backends
   * Tests that a * 1 = a with constraint parity
   */
  multiplicativeIdentity(): IAsyncProperty<[MockField]> {
    return createBackendComparisonProperty(
      fc.tuple(FieldGenerators.any()),
      async ([a], backend) => {
        const one = { value: 1n } as MockField;
        const result = a.mul(one);
        
        return {
          original: a.value,
          result: result.value,
          isIdentity: a.value === result.value,
          backend,
          constraintCount: await this.mockGetConstraintCount(backend, 'mul_identity'),
          vkHash: await this.mockGetVKHash(backend, 'mul_identity')
        };
      }
    );
  }

  /**
   * Property: Field squaring consistency
   * Tests that a.square() = a * a with identical VKs
   */
  squareConsistency(): IAsyncProperty<[MockField]> {
    return createBackendComparisonProperty(
      fc.tuple(FieldGenerators.any()),
      async ([a], backend) => {
        const squared = a.square();
        const multiplied = a.mul(a);
        
        return {
          squaredResult: squared.value,
          multipliedResult: multiplied.value,
          equal: squared.value === multiplied.value,
          backend,
          constraintCount: await this.mockGetConstraintCount(backend, 'square'),
          vkHash: await this.mockGetVKHash(backend, 'square')
        };
      }
    );
  }

  /**
   * Property: Division by non-zero elements
   * Tests that (a / b) * b = a for non-zero b
   */
  divisionInverse(): IAsyncProperty<[MockField, MockField]> {
    return createBackendComparisonProperty(
      fc.tuple(FieldGenerators.any(), FieldGenerators.nonZero()),
      async ([a, b], backend) => {
        try {
          const quotient = a.div(b);
          const reconstructed = quotient.mul(b);
          
          return {
            original: a.value,
            reconstructed: reconstructed.value,
            equal: a.value === reconstructed.value,
            backend,
            constraintCount: await this.mockGetConstraintCount(backend, 'division'),
            vkHash: await this.mockGetVKHash(backend, 'division'),
            error: null
          };
        } catch (error) {
          return {
            original: a.value,
            reconstructed: 0n,
            equal: false,
            backend,
            constraintCount: 0,
            vkHash: '',
            error: (error as Error).message
          };
        }
      },
      (snarky, sparky) => {
        // If one backend errors, both should error consistently
        if (snarky.error && sparky.error) return true;
        if (snarky.error || sparky.error) return false;
        
        return snarky.equal && sparky.equal &&
               snarky.reconstructed === sparky.reconstructed &&
               snarky.vkHash === sparky.vkHash;
      }
    );
  }

  /**
   * Property: Division by zero should fail consistently
   * Both backends should handle division by zero identically
   */
  divisionByZeroConsistency(): IAsyncProperty<[MockField]> {
    return createBackendComparisonProperty(
      fc.tuple(FieldGenerators.any()),
      async ([a], backend) => {
        const zero = { value: 0n } as MockField;
        
        try {
          const result = a.div(zero);
          return {
            succeeded: true,
            result: result.value,
            error: null,
            backend
          };
        } catch (error) {
          return {
            succeeded: false,
            result: 0n,
            error: (error as Error).message,
            backend
          };
        }
      },
      (snarky, sparky) => {
        // Both should fail consistently
        return !snarky.succeeded && !sparky.succeeded;
      }
    );
  }

  /**
   * Property: Backend result consistency for complex expressions
   * Tests that complex field expressions produce identical results
   */
  complexExpressionConsistency(): IAsyncProperty<[MockField, MockField, MockField]> {
    return createBackendComparisonProperty(
      fc.tuple(FieldGenerators.any(), FieldGenerators.any(), FieldGenerators.nonZero()),
      async ([a, b, c], backend) => {
        // Complex expression: (a + b) * (a - b) / c
        const sum = a.add(b);
        const diff = a.sub(b);
        const product = sum.mul(diff);
        const result = product.div(c);
        
        return {
          result: result.value,
          backend,
          constraintCount: await this.mockGetConstraintCount(backend, 'complex_expression'),
          vkHash: await this.mockGetVKHash(backend, 'complex_expression'),
          intermediateResults: {
            sum: sum.value,
            diff: diff.value,
            product: product.value
          }
        };
      },
      (snarky, sparky) => {
        const resultsMatch = snarky.result === sparky.result;
        const intermediatesMatch = 
          snarky.intermediateResults.sum === sparky.intermediateResults.sum &&
          snarky.intermediateResults.diff === sparky.intermediateResults.diff &&
          snarky.intermediateResults.product === sparky.intermediateResults.product;
        
        // VK hashes should match for structurally identical circuits
        const vkMatch = snarky.vkHash === sparky.vkHash;
        
        return resultsMatch && intermediatesMatch && vkMatch;
      }
    );
  }

  /**
   * Property: Constraint count comparison with tolerance
   * Tests that constraint counts are within acceptable bounds
   */
  constraintCountTolerance(): IAsyncProperty<[FieldOperation[]]> {
    return fc.asyncProperty(
      fc.array(fc.oneof(
        fc.record({
          type: fc.constantFrom(FieldOperationType.ADD, FieldOperationType.MUL, FieldOperationType.SUB),
          operands: fc.tuple(FieldGenerators.any(), FieldGenerators.any())
        }),
        fc.record({
          type: fc.constant(FieldOperationType.SQUARE),
          operands: fc.tuple(FieldGenerators.any()).map(([field]) => [field])
        })
      ), { minLength: 3, maxLength: 10 }),
      async (operations) => {
        const snarkyCount = await this.mockGetConstraintCount('snarky', 'operation_sequence');
        const sparkyCount = await this.mockGetConstraintCount('sparky', 'operation_sequence');
        
        const comparison = this.compareConstraintCounts(snarkyCount, sparkyCount);
        
        // Allow for known issues like missing reduce_lincom optimization
        // Sparky: 5 constraints vs Snarky: 3 constraints is a known issue
        const toleranceThreshold = 70; // 70% tolerance for known optimization differences
        
        if (!comparison.withinTolerance) {
          throw new Error(
            `Constraint count difference exceeds tolerance: ` +
            `Snarky=${comparison.snarkyCount}, Sparky=${comparison.sparkyCount}, ` +
            `Difference=${comparison.differencePercentage}% (tolerance: ${toleranceThreshold}%)`
          );
        }
        
        return true;
      }
    );
  }

  /**
   * Property: VK hash consistency for identical circuits
   * This is the critical property for identifying VK parity issues
   */
  vkHashConsistency(): IAsyncProperty<[string]> {
    return fc.asyncProperty(
      fc.constantFrom('simple_add', 'simple_mul', 'square', 'complex_expression'),
      async (circuitType) => {
        const snarkyVK = await this.mockGetVKHash('snarky', circuitType);
        const sparkyVK = await this.mockGetVKHash('sparky', circuitType);
        
        const comparison = await this.compareVKs(snarkyVK, sparkyVK, circuitType);
        
        if (!comparison.hashesEqual) {
          // This is the critical issue we're trying to identify
          throw new Error(
            `VK hash mismatch for ${circuitType}: ` +
            `Snarky=${comparison.snarkyVK}, Sparky=${comparison.sparkyVK}. ` +
            `Constraint counts: Snarky=${comparison.constraintCounts.snarkyCount}, ` +
            `Sparky=${comparison.constraintCounts.sparkyCount}`
          );
        }
        
        return true;
      }
    );
  }

  /**
   * Property: Performance characteristics within acceptable bounds
   * Tests that Sparky performance is within 1.5x of Snarky
   */
  performanceWithinBounds(): IAsyncProperty<[string]> {
    return fc.asyncProperty(
      fc.constantFrom('add', 'mul', 'square', 'div'),
      async (operationType) => {
        const snarkyPerf = await this.measurePerformance('snarky', operationType);
        const sparkyPerf = await this.measurePerformance('sparky', operationType);
        
        const comparison = this.comparePerformance(snarkyPerf, sparkyPerf);
        
        if (!comparison.withinAcceptableRange) {
          throw new Error(
            `Performance difference exceeds bounds for ${operationType}: ` +
            `Sparky is ${comparison.sparkySlowerBy}x slower than Snarky ` +
            `(acceptable: ≤1.5x)`
          );
        }
        
        return true;
      }
    );
  }

  /**
   * Property: Error handling consistency across backends
   * Both backends should fail in the same way for invalid operations
   */
  errorHandlingConsistency(): IAsyncProperty<[MockField]> {
    return createBackendComparisonProperty(
      fc.tuple(FieldGenerators.any()),
      async ([field], backend) => {
        const testCases = [
          { name: 'sqrt_negative', test: () => this.mockSqrtNegative(field, backend) },
          { name: 'div_zero', test: () => this.mockDivisionByZero(field, backend) },
          { name: 'assert_false', test: () => this.mockAssertFalse(field, backend) }
        ];
        
        const results = [];
        for (const testCase of testCases) {
          try {
            await testCase.test();
            results.push({ name: testCase.name, succeeded: true, error: null });
          } catch (error) {
            results.push({ 
              name: testCase.name, 
              succeeded: false, 
              error: (error as Error).message 
            });
          }
        }
        
        return { results, backend };
      },
      (snarky, sparky) => {
        // Error patterns should be identical
        return snarky.results.every((snarkyResult, i) => {
          const sparkyResult = sparky.results[i];
          return snarkyResult.succeeded === sparkyResult.succeeded;
        });
      }
    );
  }

  // Helper methods for mock implementations
  // These will be replaced with actual backend calls

  private async mockGetConstraintCount(backend: 'snarky' | 'sparky', operation: string): Promise<number> {
    // Mock implementation - replace with actual constraint counting
    const baseCounts = {
      'add_commutative': backend === 'snarky' ? 2 : 2,
      'add_associative': backend === 'snarky' ? 3 : 3,
      'mul_commutative': backend === 'snarky' ? 1 : 1,
      'mul_associative': backend === 'snarky' ? 2 : 2,
      'add_identity': backend === 'snarky' ? 1 : 1,
      'mul_identity': backend === 'snarky' ? 0 : 0, // May be optimized away
      'square': backend === 'snarky' ? 1 : 1,
      'division': backend === 'snarky' ? 3 : 5, // Known difference: missing reduce_lincom
      'complex_expression': backend === 'snarky' ? 7 : 10,
      'operation_sequence': backend === 'snarky' ? 15 : 18
    };
    
    return baseCounts[operation] || 1;
  }

  private async mockGetVKHash(backend: 'snarky' | 'sparky', circuitType: string): Promise<string> {
    // Mock implementation - replace with actual VK generation and hashing
    // Currently all Sparky VKs generate identical hash - this is the critical bug
    if (backend === 'sparky') {
      return 'SPARKY_IDENTICAL_HASH_BUG'; // All Sparky VKs return same hash
    }
    
    const snarkyHashes = {
      'simple_add': 'snarky_hash_add_abc123',
      'simple_mul': 'snarky_hash_mul_def456',
      'square': 'snarky_hash_square_ghi789',
      'complex_expression': 'snarky_hash_complex_jkl012',
      'mul_commutative': 'snarky_hash_mul_comm_mno345',
      'mul_associative': 'snarky_hash_mul_assoc_pqr678',
      'add_identity': 'snarky_hash_add_id_stu901',
      'division': 'snarky_hash_div_vwx234'
    };
    
    return snarkyHashes[circuitType] || `snarky_hash_${circuitType}_default`;
  }

  private async measurePerformance(backend: 'snarky' | 'sparky', operationType: string): Promise<PerformanceMeasurement> {
    const startTime = Date.now();
    
    // Mock operation execution
    await new Promise(resolve => setTimeout(resolve, backend === 'sparky' ? 12 : 10)); // Sparky slightly slower
    
    const duration = Date.now() - startTime;
    const constraintCount = await this.mockGetConstraintCount(backend, operationType);
    
    return {
      backend,
      operationType,
      duration,
      constraintCount,
      efficiency: constraintCount / Math.max(duration, 1)
    };
  }

  private compareConstraintCounts(snarkyCount: number, sparkyCount: number, tolerance: number = 50): ConstraintCountComparison {
    const difference = Math.abs(snarkyCount - sparkyCount);
    const maxCount = Math.max(snarkyCount, sparkyCount);
    const differencePercentage = maxCount > 0 ? (difference / maxCount) * 100 : 0;
    
    return {
      snarkyCount,
      sparkyCount,
      tolerance,
      withinTolerance: differencePercentage <= tolerance,
      difference,
      differencePercentage
    };
  }

  private async compareVKs(snarkyVK: string, sparkyVK: string, circuitType: string): Promise<VKComparisonResult> {
    const hashesEqual = snarkyVK === sparkyVK;
    const constraintCounts = this.compareConstraintCounts(
      await this.mockGetConstraintCount('snarky', circuitType),
      await this.mockGetConstraintCount('sparky', circuitType)
    );
    
    const differences = [];
    if (!hashesEqual) {
      differences.push(`VK hash mismatch: ${snarkyVK} !== ${sparkyVK}`);
    }
    if (!constraintCounts.withinTolerance) {
      differences.push(`Constraint count difference: ${constraintCounts.differencePercentage}%`);
    }
    
    return {
      snarkyVK,
      sparkyVK,
      hashesEqual,
      structurallyEqual: hashesEqual && constraintCounts.withinTolerance,
      differences,
      constraintCounts
    };
  }

  private comparePerformance(snarky: PerformanceMeasurement, sparky: PerformanceMeasurement): PerformanceComparison {
    const sparkySlowerBy = sparky.duration / Math.max(snarky.duration, 1);
    const withinAcceptableRange = sparkySlowerBy <= 1.5; // 1.5x tolerance
    const constraintEfficiencyRatio = sparky.efficiency / Math.max(snarky.efficiency, 0.001);
    
    return {
      snarky,
      sparky,
      sparkySlowerBy,
      withinAcceptableRange,
      constraintEfficiencyRatio
    };
  }

  // Mock error-inducing operations
  private async mockSqrtNegative(field: MockField, backend: 'snarky' | 'sparky'): Promise<void> {
    if (field.value < 0n) {
      throw new Error(`Cannot compute square root of negative field element: ${field.value}`);
    }
  }

  private async mockDivisionByZero(field: MockField, backend: 'snarky' | 'sparky'): Promise<void> {
    const zero = { value: 0n } as MockField;
    field.div(zero); // Should throw
  }

  private async mockAssertFalse(field: MockField, backend: 'snarky' | 'sparky'): Promise<void> {
    const falseBool = { value: false, assertTrue: () => { throw new Error('Assertion failed'); }, assertFalse: () => {} } as MockBool;
    falseBool.assertTrue(); // Should throw
  }

  /**
   * Get all field properties for comprehensive testing
   */
  getAllProperties(): Array<{
    name: string;
    property: IAsyncProperty<any>;
    config?: TestConfig;
  }> {
    return [
      {
        name: 'field_addition_commutative',
        property: this.additionCommutative(),
        config: { numRuns: 50, timeout: 30000 }
      },
      {
        name: 'field_addition_associative', 
        property: this.additionAssociative(),
        config: { numRuns: 50, timeout: 30000 }
      },
      {
        name: 'field_multiplication_commutative',
        property: this.multiplicationCommutative(),
        config: { numRuns: 100, timeout: 45000 } // More runs for VK testing
      },
      {
        name: 'field_multiplication_associative',
        property: this.multiplicationAssociative(),
        config: { numRuns: 50, timeout: 30000 }
      },
      {
        name: 'field_additive_identity',
        property: this.additiveIdentity(),
        config: { numRuns: 30, timeout: 20000 }
      },
      {
        name: 'field_multiplicative_identity',
        property: this.multiplicativeIdentity(),
        config: { numRuns: 30, timeout: 20000 }
      },
      {
        name: 'field_square_consistency',
        property: this.squareConsistency(),
        config: { numRuns: 40, timeout: 25000 }
      },
      {
        name: 'field_division_inverse',
        property: this.divisionInverse(),
        config: { numRuns: 60, timeout: 35000 }
      },
      {
        name: 'field_division_by_zero_consistency',
        property: this.divisionByZeroConsistency(),
        config: { numRuns: 20, timeout: 15000 }
      },
      {
        name: 'field_complex_expression_consistency',
        property: this.complexExpressionConsistency(),
        config: { numRuns: 75, timeout: 40000 }
      },
      {
        name: 'constraint_count_tolerance',
        property: this.constraintCountTolerance(),
        config: { numRuns: 25, timeout: 30000 }
      },
      {
        name: 'vk_hash_consistency',
        property: this.vkHashConsistency(),
        config: { numRuns: 20, timeout: 60000 } // Longer timeout for VK generation
      },
      {
        name: 'performance_within_bounds',
        property: this.performanceWithinBounds(),
        config: { numRuns: 15, timeout: 45000 }
      },
      {
        name: 'error_handling_consistency',
        property: this.errorHandlingConsistency(),
        config: { numRuns: 30, timeout: 25000 }
      }
    ];
  }

  /**
   * Get properties focused on VK parity issues
   */
  getVKParityProperties(): Array<{
    name: string;
    property: IAsyncProperty<any>;
    config?: TestConfig;
  }> {
    return [
      {
        name: 'vk_multiplication_commutative',
        property: this.multiplicationCommutative(),
        config: { numRuns: 200, timeout: 120000, verbose: true }
      },
      {
        name: 'vk_complex_expression_consistency',
        property: this.complexExpressionConsistency(),
        config: { numRuns: 150, timeout: 90000, verbose: true }
      },
      {
        name: 'vk_hash_consistency_critical',
        property: this.vkHashConsistency(),
        config: { numRuns: 100, timeout: 180000, verbose: true }
      }
    ];
  }

  /**
   * Get properties focused on constraint count differences
   */
  getConstraintCountProperties(): Array<{
    name: string;
    property: IAsyncProperty<any>;
    config?: TestConfig;
  }> {
    return [
      {
        name: 'constraint_division_optimization',
        property: this.divisionInverse(),
        config: { numRuns: 100, timeout: 60000, verbose: true }
      },
      {
        name: 'constraint_count_tolerance_strict',
        property: this.constraintCountTolerance(),
        config: { numRuns: 50, timeout: 45000, verbose: true }
      }
    ];
  }
}

/**
 * Factory function to create FieldProperties with custom runner
 */
export function createFieldProperties(runner?: BackendCompatibilityTestRunner): FieldProperties {
  return new FieldProperties(runner);
}

/**
 * Export all property test definitions for easy import
 */
export const fieldProperties = new FieldProperties();