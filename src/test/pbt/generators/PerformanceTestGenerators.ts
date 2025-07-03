/**
 * Performance Test Generators for Snarky vs Sparky Backend Comparison
 * 
 * These generators create statistically rigorous test scenarios for accurate
 * performance profiling that will drive critical project decisions.
 */

import { fc } from 'fast-check';
import type { Field } from '../../../../dist/node/index.js';

/**
 * Performance test configuration with statistical parameters
 */
export interface PerformanceTestConfig {
  warmupIterations: number;
  measurementIterations: number;
  confidenceLevel: number; // 0.95 or 0.99
  outlierDetection: 'IQR' | 'MAD' | 'none';
  timingPrecision: 'hrtime' | 'performance.now';
}

/**
 * Operation complexity levels for realistic workloads
 */
export enum ComplexityLevel {
  TRIVIAL = 'trivial',     // 1-10 operations
  SIMPLE = 'simple',       // 10-100 operations  
  MEDIUM = 'medium',       // 100-1000 operations
  COMPLEX = 'complex',     // 1000-10000 operations
  EXTREME = 'extreme'      // 10000+ operations
}

/**
 * Performance test scenario structure
 */
export interface PerformanceScenario {
  name: string;
  description: string;
  complexity: ComplexityLevel;
  operations: Array<() => void>;
  expectedConstraints?: number;
  memoryIntensive?: boolean;
  parallelizable?: boolean;
}

/**
 * Performance measurement result
 */
export interface PerformanceMeasurement {
  snarkyTimes: bigint[];
  sparkyTimes: bigint[];
  snarkyMemory: number[];
  sparkyMemory: number[];
  snarkyConstraints?: number;
  sparkyConstraints?: number;
  metadata: {
    timestamp: Date;
    nodeVersion: string;
    platform: string;
    cpuCount: number;
  };
}

export class PerformanceTestGenerators {
  /**
   * Generate statistically sound test configuration
   */
  static testConfig(): fc.Arbitrary<PerformanceTestConfig> {
    return fc.record({
      warmupIterations: fc.constantFrom(50, 100, 200),
      measurementIterations: fc.constantFrom(100, 500, 1000),
      confidenceLevel: fc.constantFrom(0.95, 0.99),
      outlierDetection: fc.constantFrom('IQR', 'MAD', 'none'),
      timingPrecision: fc.constant('hrtime') // Always use hrtime for accuracy
    });
  }

  /**
   * Generate field values for performance testing
   */
  static performanceFields(): fc.Arbitrary<bigint[]> {
    const FIELD_MODULUS = 28948022309329048855892746252171976963363056481941560715954676764349967630337n;
    
    return fc.oneof(
      // Small values (common case)
      fc.array(fc.bigInt(0n, 1000000n), { minLength: 10, maxLength: 100 }),
      
      // Medium values
      fc.array(fc.bigInt(1000000n, FIELD_MODULUS / 2n), { minLength: 10, maxLength: 100 }),
      
      // Large values (near field boundary)
      fc.array(fc.bigInt(FIELD_MODULUS - 1000000n, FIELD_MODULUS - 1n), { minLength: 10, maxLength: 100 }),
      
      // Mixed values (realistic)
      fc.array(
        fc.oneof(
          fc.bigInt(0n, 1000n),
          fc.bigInt(1000000n, 1000000000n),
          fc.bigInt(FIELD_MODULUS - 1000n, FIELD_MODULUS - 1n)
        ),
        { minLength: 10, maxLength: 100 }
      )
    );
  }

  /**
   * Generate basic operation scenarios
   */
  static basicOperationScenario(): fc.Arbitrary<PerformanceScenario> {
    return fc.record({
      name: fc.constantFrom(
        'field_addition',
        'field_multiplication',
        'field_division',
        'field_inversion',
        'field_square',
        'field_sqrt'
      ),
      description: fc.constant('Basic field operation performance test'),
      complexity: fc.constant(ComplexityLevel.SIMPLE),
      operations: fc.constant([]), // Will be filled by property
      memoryIntensive: fc.constant(false),
      parallelizable: fc.constant(true)
    });
  }

  /**
   * Generate complex expression scenarios
   */
  static complexExpressionScenario(): fc.Arbitrary<PerformanceScenario> {
    return fc.record({
      name: fc.constantFrom(
        'nested_arithmetic',
        'polynomial_evaluation',
        'matrix_operations',
        'circuit_expression'
      ),
      description: fc.constant('Complex expression performance test'),
      complexity: fc.constantFrom(ComplexityLevel.MEDIUM, ComplexityLevel.COMPLEX),
      operations: fc.constant([]), // Will be filled by property
      memoryIntensive: fc.boolean(),
      parallelizable: fc.boolean()
    });
  }

  /**
   * Generate constraint system scenarios
   */
  static constraintSystemScenario(): fc.Arbitrary<PerformanceScenario> {
    return fc.record({
      name: fc.constantFrom(
        'single_constraint',
        'batch_constraints',
        'circuit_compilation',
        'vk_generation'
      ),
      description: fc.constant('Constraint system performance test'),
      complexity: fc.constantFrom(ComplexityLevel.SIMPLE, ComplexityLevel.COMPLEX),
      operations: fc.constant([]),
      expectedConstraints: fc.nat({ max: 10000 }),
      memoryIntensive: fc.constant(true),
      parallelizable: fc.constant(false)
    });
  }

  /**
   * Generate cryptographic workload scenarios
   */
  static cryptographicScenario(): fc.Arbitrary<PerformanceScenario> {
    return fc.record({
      name: fc.constantFrom(
        'poseidon_hash',
        'merkle_tree',
        'signature_verification',
        'ec_operations'
      ),
      description: fc.constant('Cryptographic operation performance test'),
      complexity: fc.constantFrom(ComplexityLevel.MEDIUM, ComplexityLevel.COMPLEX),
      operations: fc.constant([]),
      memoryIntensive: fc.boolean(),
      parallelizable: fc.boolean()
    });
  }

  /**
   * Generate memory-intensive scenarios
   */
  static memoryIntensiveScenario(): fc.Arbitrary<PerformanceScenario> {
    return fc.record({
      name: fc.constantFrom(
        'large_array_operations',
        'memory_allocation_storm',
        'gc_pressure_test',
        'wasm_memory_growth'
      ),
      description: fc.constant('Memory-intensive performance test'),
      complexity: fc.constantFrom(ComplexityLevel.COMPLEX, ComplexityLevel.EXTREME),
      operations: fc.constant([]),
      memoryIntensive: fc.constant(true),
      parallelizable: fc.constant(false)
    });
  }

  /**
   * Generate real-world zkApp patterns
   */
  static zkAppScenario(): fc.Arbitrary<PerformanceScenario> {
    return fc.record({
      name: fc.constantFrom(
        'token_transfer',
        'amm_swap',
        'merkle_update',
        'signature_aggregation',
        'recursive_proof'
      ),
      description: fc.constant('Real-world zkApp pattern performance test'),
      complexity: fc.constantFrom(ComplexityLevel.MEDIUM, ComplexityLevel.COMPLEX),
      operations: fc.constant([]),
      memoryIntensive: fc.boolean(),
      parallelizable: fc.boolean()
    });
  }

  /**
   * Generate batch size for operations
   */
  static batchSize(complexity: ComplexityLevel): fc.Arbitrary<number> {
    switch (complexity) {
      case ComplexityLevel.TRIVIAL:
        return fc.integer({ min: 1, max: 10 });
      case ComplexityLevel.SIMPLE:
        return fc.integer({ min: 10, max: 100 });
      case ComplexityLevel.MEDIUM:
        return fc.integer({ min: 100, max: 1000 });
      case ComplexityLevel.COMPLEX:
        return fc.integer({ min: 1000, max: 10000 });
      case ComplexityLevel.EXTREME:
        return fc.integer({ min: 10000, max: 100000 });
    }
  }

  /**
   * Generate expression depth for nested operations
   */
  static expressionDepth(complexity: ComplexityLevel): fc.Arbitrary<number> {
    switch (complexity) {
      case ComplexityLevel.TRIVIAL:
        return fc.integer({ min: 1, max: 3 });
      case ComplexityLevel.SIMPLE:
        return fc.integer({ min: 3, max: 10 });
      case ComplexityLevel.MEDIUM:
        return fc.integer({ min: 10, max: 50 });
      case ComplexityLevel.COMPLEX:
        return fc.integer({ min: 50, max: 200 });
      case ComplexityLevel.EXTREME:
        return fc.integer({ min: 200, max: 1000 });
    }
  }

  /**
   * Generate complete performance test suite
   */
  static performanceTestSuite(): fc.Arbitrary<PerformanceScenario[]> {
    return fc.array(
      fc.oneof(
        this.basicOperationScenario(),
        this.complexExpressionScenario(),
        this.constraintSystemScenario(),
        this.cryptographicScenario(),
        this.memoryIntensiveScenario(),
        this.zkAppScenario()
      ),
      { minLength: 5, maxLength: 20 }
    );
  }
}

/**
 * Statistical utilities for performance analysis
 */
export class PerformanceStatistics {
  /**
   * Calculate mean with confidence interval
   */
  static meanWithCI(values: bigint[], confidenceLevel: number): {
    mean: number;
    ci: { lower: number; upper: number };
    stdDev: number;
  } {
    const numbers = values.map(v => Number(v));
    const n = numbers.length;
    const mean = numbers.reduce((a, b) => a + b, 0) / n;
    
    const variance = numbers.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    
    // T-distribution critical values
    const tCritical = confidenceLevel === 0.99 ? 2.576 : 1.96; // Approximation for large n
    const marginOfError = tCritical * (stdDev / Math.sqrt(n));
    
    return {
      mean,
      ci: {
        lower: mean - marginOfError,
        upper: mean + marginOfError
      },
      stdDev
    };
  }

  /**
   * Detect outliers using Interquartile Range (IQR)
   */
  static detectOutliersIQR(values: bigint[]): {
    outliers: bigint[];
    cleaned: bigint[];
  } {
    const sorted = [...values].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    const n = sorted.length;
    
    const q1Index = Math.floor(n * 0.25);
    const q3Index = Math.floor(n * 0.75);
    
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - (iqr * 3n) / 2n;
    const upperBound = q3 + (iqr * 3n) / 2n;
    
    const outliers: bigint[] = [];
    const cleaned: bigint[] = [];
    
    for (const value of values) {
      if (value < lowerBound || value > upperBound) {
        outliers.push(value);
      } else {
        cleaned.push(value);
      }
    }
    
    return { outliers, cleaned };
  }

  /**
   * Calculate performance ratio with statistical significance
   */
  static performanceRatio(snarkyTimes: bigint[], sparkyTimes: bigint[]): {
    ratio: number;
    significant: boolean;
    pValue: number;
    effectSize: number;
  } {
    const snarkyStats = this.meanWithCI(snarkyTimes, 0.95);
    const sparkyStats = this.meanWithCI(sparkyTimes, 0.95);
    
    const ratio = sparkyStats.mean / snarkyStats.mean;
    
    // Simple t-test approximation
    const pooledStdDev = Math.sqrt(
      (snarkyStats.stdDev ** 2 + sparkyStats.stdDev ** 2) / 2
    );
    const effectSize = Math.abs(sparkyStats.mean - snarkyStats.mean) / pooledStdDev;
    
    // Simplified p-value calculation (would use proper t-test in production)
    const tStatistic = Math.abs(sparkyStats.mean - snarkyStats.mean) / 
      (pooledStdDev * Math.sqrt(2 / snarkyTimes.length));
    const pValue = tStatistic > 2.0 ? 0.01 : tStatistic > 1.96 ? 0.05 : 0.1;
    
    return {
      ratio,
      significant: pValue < 0.05,
      pValue,
      effectSize
    };
  }
}