/**
 * Real Backend Integration for Property-Based Testing Framework
 * 
 * This module provides real integration with o1js backend switching and
 * constraint system analysis, replacing mock implementations with actual
 * backend switching, performance monitoring, and constraint system capture.
 */

import { switchBackend, getCurrentBackend } from '../../../index.js';
import { Provable } from '../../../lib/provable/provable.js';
import { Field } from '../../../lib/provable/field.js';
import { initializeBindings } from '../../../bindings.js';
import { constraintSystem } from '../../../lib/provable/core/provable-context.js';

/**
 * Backend type
 */
export type Backend = 'snarky' | 'sparky';

/**
 * Detailed constraint system state
 */
export interface ConstraintSystemState {
  constraintCount: number;
  publicInputSize: number;
  witnessSize: number;
  gates: Array<{
    type: string;
    wires: any[];
    coeffs: string[];
  }>;
  digest: string;
  gatesSummary: Record<string, number>;
}

/**
 * Performance metrics for backend operations
 */
export interface PerformanceMetrics {
  executionTime: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
  constraintGenerationRate: number; // constraints per millisecond
  gcPauses?: number;
  cpuTime?: number;
}

/**
 * Backend operation result with comprehensive metrics
 */
export interface BackendResult<T> {
  backend: Backend;
  result: T;
  success: boolean;
  constraintState?: ConstraintSystemState;
  performance: PerformanceMetrics;
  error?: Error;
  metadata: {
    timestamp: number;
    nodeVersion: string;
    backendVersion?: string;
  };
}

/**
 * Backend switching validation result
 */
export interface BackendSwitchValidation {
  requestedBackend: Backend;
  actualBackend: Backend;
  switchSuccessful: boolean;
  switchTime: number;
  error?: Error;
}

/**
 * Real backend integration class providing actual o1js backend switching
 * and constraint system analysis
 */
export class RealBackendIntegration {
  private initializationPromise: Promise<void> | null = null;
  private isInitialized = false;
  private performanceBaselines = new Map<Backend, PerformanceMetrics>();

  constructor() {
    this.initializationPromise = this.initialize();
  }

  /**
   * Initialize the backend integration
   */
  private async initialize(): Promise<void> {
    try {
      await initializeBindings();
      this.isInitialized = true;
    } catch (error) {
      this.isInitialized = false;
      throw new Error(`Failed to initialize backend integration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Ensure initialization is complete
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
      this.initializationPromise = null;
    }
    
    if (!this.isInitialized) {
      throw new Error('Backend integration not initialized');
    }
  }

  /**
   * Switch to specified backend with validation
   */
  async switchBackend(backend: Backend): Promise<BackendSwitchValidation> {
    await this.ensureInitialized();
    
    const startTime = performance.now();
    const previousBackend = getCurrentBackend();
    
    try {
      await switchBackend(backend);
      const switchTime = performance.now() - startTime;
      const actualBackend = getCurrentBackend();
      
      const validation: BackendSwitchValidation = {
        requestedBackend: backend,
        actualBackend,
        switchSuccessful: actualBackend === backend,
        switchTime
      };

      if (!validation.switchSuccessful) {
        validation.error = new Error(
          `Backend switch failed: requested ${backend}, but got ${actualBackend}`
        );
      }

      return validation;
    } catch (error) {
      const switchTime = performance.now() - startTime;
      
      return {
        requestedBackend: backend,
        actualBackend: previousBackend,
        switchSuccessful: false,
        switchTime,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Get current backend with validation
   */
  getCurrentBackend(): Backend {
    const backend = getCurrentBackend();
    if (!['snarky', 'sparky'].includes(backend)) {
      throw new Error(`Invalid backend state: ${backend}`);
    }
    return backend as Backend;
  }

  /**
   * Capture constraint system state for a given circuit
   */
  async captureConstraintState(
    circuitFn: (() => Promise<void>) | (() => void)
  ): Promise<ConstraintSystemState> {
    await this.ensureInitialized();
    
    try {
      const csResult = await constraintSystem(circuitFn);
      
      return {
        constraintCount: csResult.rows,
        publicInputSize: csResult.publicInputSize,
        witnessSize: 0, // TODO: Extract witness size if available
        gates: csResult.gates.map(gate => ({
          type: gate.type,
          wires: gate.wires,
          coeffs: gate.coeffs
        })),
        digest: csResult.digest,
        gatesSummary: csResult.summary()
      };
    } catch (error) {
      throw new Error(
        `Failed to capture constraint state: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Measure memory usage
   */
  private measureMemory(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    // Fallback for environments without process.memoryUsage
    return 0;
  }

  /**
   * Execute a function with comprehensive performance monitoring
   */
  async executeWithMonitoring<T>(
    fn: () => Promise<T> | T,
    options: {
      captureConstraints?: boolean;
      constraintFn?: (() => Promise<void>) | (() => void);
    } = {}
  ): Promise<{ result: T; performance: PerformanceMetrics; constraintState?: ConstraintSystemState }> {
    await this.ensureInitialized();
    
    const memoryBefore = this.measureMemory();
    const startTime = performance.now();
    const startCpuTime = typeof process !== 'undefined' ? process.cpuUsage() : null;
    
    let result: T;
    let constraintState: ConstraintSystemState | undefined;
    
    try {
      // Execute the function
      result = await fn();
      
      // Capture constraints if requested
      if (options.captureConstraints && options.constraintFn) {
        constraintState = await this.captureConstraintState(options.constraintFn);
      }
    } catch (error) {
      const executionTime = performance.now() - startTime;
      const memoryAfter = this.measureMemory();
      
      throw new Error(
        `Execution failed after ${executionTime.toFixed(2)}ms: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    
    const endTime = performance.now();
    const memoryAfter = this.measureMemory();
    const endCpuTime = typeof process !== 'undefined' ? process.cpuUsage(startCpuTime || undefined) : null;
    
    const executionTime = endTime - startTime;
    const memoryDelta = memoryAfter - memoryBefore;
    
    const performance: PerformanceMetrics = {
      executionTime,
      memoryBefore,
      memoryAfter,
      memoryDelta,
      constraintGenerationRate: constraintState 
        ? constraintState.constraintCount / Math.max(executionTime, 0.001)
        : 0,
      cpuTime: endCpuTime ? (endCpuTime.user + endCpuTime.system) / 1000 : undefined
    };
    
    return { result, performance, constraintState };
  }

  /**
   * Execute a function on both backends and compare results
   */
  async compareBackends<T>(
    fn: (backend: Backend) => Promise<T> | T,
    options: {
      captureConstraints?: boolean;
      constraintFn?: (backend: Backend) => (() => Promise<void>) | (() => void);
      compareFn?: (a: T, b: T) => boolean;
      timeoutMs?: number;
    } = {}
  ): Promise<{
    snarky: BackendResult<T>;
    sparky: BackendResult<T>;
    comparison: {
      resultsEqual: boolean;
      constraintsEqual: boolean;
      performanceRatio: number;
      differences: string[];
    };
  }> {
    await this.ensureInitialized();
    
    const timeout = options.timeoutMs || 60000;
    const originalBackend = this.getCurrentBackend();
    
    try {
      // Execute on Snarky backend
      const snarkyResult = await this.executeOnBackend('snarky', fn, {
        captureConstraints: options.captureConstraints,
        constraintFn: options.constraintFn ? options.constraintFn('snarky') : undefined,
        timeoutMs: timeout
      });

      // Execute on Sparky backend
      const sparkyResult = await this.executeOnBackend('sparky', fn, {
        captureConstraints: options.captureConstraints,
        constraintFn: options.constraintFn ? options.constraintFn('sparky') : undefined,
        timeoutMs: timeout
      });

      // Compare results
      const comparison = this.compareResults(snarkyResult, sparkyResult, options.compareFn);

      return { snarky: snarkyResult, sparky: sparkyResult, comparison };
    } finally {
      // Restore original backend
      await this.switchBackend(originalBackend);
    }
  }

  /**
   * Execute function on specific backend
   */
  private async executeOnBackend<T>(
    backend: Backend,
    fn: (backend: Backend) => Promise<T> | T,
    options: {
      captureConstraints?: boolean;
      constraintFn?: (() => Promise<void>) | (() => void);
      timeoutMs: number;
    }
  ): Promise<BackendResult<T>> {
    const startTime = Date.now();
    
    try {
      // Switch to target backend
      const switchValidation = await this.switchBackend(backend);
      if (!switchValidation.switchSuccessful) {
        throw switchValidation.error || new Error(`Failed to switch to ${backend}`);
      }

      // Execute with timeout
      const executionPromise = this.executeWithMonitoring(
        () => fn(backend),
        {
          captureConstraints: options.captureConstraints,
          constraintFn: options.constraintFn
        }
      );

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Execution timeout after ${options.timeoutMs}ms`)), options.timeoutMs);
      });

      const execution = await Promise.race([executionPromise, timeoutPromise]);

      return {
        backend,
        result: execution.result,
        success: true,
        constraintState: execution.constraintState,
        performance: execution.performance,
        metadata: {
          timestamp: startTime,
          nodeVersion: typeof process !== 'undefined' ? process.version : 'unknown'
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        backend,
        result: null as any,
        success: false,
        performance: {
          executionTime,
          memoryBefore: 0,
          memoryAfter: 0,
          memoryDelta: 0,
          constraintGenerationRate: 0
        },
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          timestamp: startTime,
          nodeVersion: typeof process !== 'undefined' ? process.version : 'unknown'
        }
      };
    }
  }

  /**
   * Compare backend results
   */
  private compareResults<T>(
    snarkyResult: BackendResult<T>,
    sparkyResult: BackendResult<T>,
    compareFn?: (a: T, b: T) => boolean
  ): {
    resultsEqual: boolean;
    constraintsEqual: boolean;
    performanceRatio: number;
    differences: string[];
  } {
    const differences: string[] = [];
    
    // Compare success status
    if (snarkyResult.success !== sparkyResult.success) {
      differences.push(`Success status: Snarky ${snarkyResult.success}, Sparky ${sparkyResult.success}`);
    }

    // Compare results if both succeeded
    let resultsEqual = false;
    if (snarkyResult.success && sparkyResult.success) {
      resultsEqual = compareFn 
        ? compareFn(snarkyResult.result, sparkyResult.result)
        : this.defaultResultComparison(snarkyResult.result, sparkyResult.result);
      
      if (!resultsEqual) {
        differences.push('Results differ between backends');
      }
    }

    // Compare constraint counts
    let constraintsEqual = false;
    if (snarkyResult.constraintState && sparkyResult.constraintState) {
      constraintsEqual = snarkyResult.constraintState.constraintCount === 
                        sparkyResult.constraintState.constraintCount;
      
      if (!constraintsEqual) {
        differences.push(
          `Constraint counts: Snarky ${snarkyResult.constraintState.constraintCount}, ` +
          `Sparky ${sparkyResult.constraintState.constraintCount}`
        );
      }

      // Compare gate summaries
      const snarkyGates = JSON.stringify(snarkyResult.constraintState.gatesSummary);
      const sparkyGates = JSON.stringify(sparkyResult.constraintState.gatesSummary);
      if (snarkyGates !== sparkyGates) {
        differences.push('Gate distributions differ between backends');
      }
    }

    // Calculate performance ratio
    const performanceRatio = sparkyResult.performance.executionTime / 
                            Math.max(snarkyResult.performance.executionTime, 0.001);

    return {
      resultsEqual,
      constraintsEqual,
      performanceRatio,
      differences
    };
  }

  /**
   * Default result comparison for common o1js types
   */
  private defaultResultComparison<T>(a: T, b: T): boolean {
    // Handle Field elements
    if (a && typeof a === 'object' && 'toBigInt' in a && 
        b && typeof b === 'object' && 'toBigInt' in b) {
      return (a as any).toBigInt() === (b as any).toBigInt();
    }

    // Handle Bool elements
    if (a && typeof a === 'object' && 'toBoolean' in a &&
        b && typeof b === 'object' && 'toBoolean' in b) {
      return (a as any).toBoolean() === (b as any).toBoolean();
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, idx) => this.defaultResultComparison(val, b[idx]));
    }

    // Handle objects with equals method
    if (a && typeof a === 'object' && 'equals' in a && typeof (a as any).equals === 'function') {
      return (a as any).equals(b);
    }

    // Default comparison
    return a === b;
  }

  /**
   * Validate backend state consistency
   */
  async validateBackendState(): Promise<{
    currentBackend: Backend;
    bindingsInitialized: boolean;
    globalStateConsistent: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      await this.ensureInitialized();
    } catch (error) {
      errors.push(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const currentBackend = this.getCurrentBackend();
    
    // Test basic field operation to validate backend
    try {
      const testResult = await this.executeWithMonitoring(
        () => {
          const f1 = Field(1);
          const f2 = Field(2);
          return f1.add(f2);
        },
        { captureConstraints: true, constraintFn: () => {
          const f1 = Field(1);
          const f2 = Field(2);
          return f1.add(f2);
        }}
      );
      
      if (!testResult.result || testResult.result.toBigInt() !== 3n) {
        errors.push('Basic field arithmetic validation failed');
      }
    } catch (error) {
      errors.push(`Backend validation test failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      currentBackend,
      bindingsInitialized: this.isInitialized,
      globalStateConsistent: errors.length === 0,
      errors
    };
  }

  /**
   * Create performance baseline for current backend
   */
  async createPerformanceBaseline(
    testSuite: Array<{
      name: string;
      fn: () => Promise<any> | any;
      constraintFn?: () => Promise<void> | (() => void);
    }>
  ): Promise<Map<string, PerformanceMetrics>> {
    await this.ensureInitialized();
    
    const currentBackend = this.getCurrentBackend();
    const baseline = new Map<string, PerformanceMetrics>();
    
    for (const test of testSuite) {
      try {
        const execution = await this.executeWithMonitoring(
          test.fn,
          { 
            captureConstraints: !!test.constraintFn,
            constraintFn: test.constraintFn
          }
        );
        
        baseline.set(test.name, execution.performance);
      } catch (error) {
        // Store failed test with zero metrics
        baseline.set(test.name, {
          executionTime: 0,
          memoryBefore: 0,
          memoryAfter: 0,
          memoryDelta: 0,
          constraintGenerationRate: 0
        });
      }
    }
    
    this.performanceBaselines.set(currentBackend, baseline.get('overall') || {
      executionTime: 0,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      constraintGenerationRate: 0
    });
    
    return baseline;
  }

  /**
   * Detect performance regressions against baseline
   */
  detectPerformanceRegressions(
    current: PerformanceMetrics,
    baseline: PerformanceMetrics,
    thresholds: {
      executionTimeRatio?: number;
      memoryRatio?: number;
      constraintRateRatio?: number;
    } = {}
  ): {
    hasRegressions: boolean;
    regressions: string[];
    improvements: string[];
  } {
    const regressions: string[] = [];
    const improvements: string[] = [];
    
    const execThreshold = thresholds.executionTimeRatio || 1.5;
    const memThreshold = thresholds.memoryRatio || 2.0;
    const constraintThreshold = thresholds.constraintRateRatio || 0.5;
    
    // Check execution time
    const execRatio = current.executionTime / Math.max(baseline.executionTime, 0.001);
    if (execRatio > execThreshold) {
      regressions.push(`Execution time regression: ${(execRatio * 100).toFixed(1)}% of baseline`);
    } else if (execRatio < 0.8) {
      improvements.push(`Execution time improvement: ${((1 - execRatio) * 100).toFixed(1)}% faster`);
    }
    
    // Check memory usage
    if (baseline.memoryDelta > 0) {
      const memRatio = current.memoryDelta / baseline.memoryDelta;
      if (memRatio > memThreshold) {
        regressions.push(`Memory usage regression: ${(memRatio * 100).toFixed(1)}% of baseline`);
      }
    }
    
    // Check constraint generation rate
    if (baseline.constraintGenerationRate > 0) {
      const rateRatio = current.constraintGenerationRate / baseline.constraintGenerationRate;
      if (rateRatio < constraintThreshold) {
        regressions.push(`Constraint generation rate regression: ${(rateRatio * 100).toFixed(1)}% of baseline`);
      }
    }
    
    return {
      hasRegressions: regressions.length > 0,
      regressions,
      improvements
    };
  }

  /**
   * Generate comprehensive backend comparison report
   */
  generateComparisonReport<T>(
    results: {
      snarky: BackendResult<T>;
      sparky: BackendResult<T>;
      comparison: {
        resultsEqual: boolean;
        constraintsEqual: boolean;
        performanceRatio: number;
        differences: string[];
      };
    }
  ): string {
    const lines: string[] = [
      '=== Backend Comparison Report ===',
      `Generated: ${new Date().toISOString()}`,
      ''
    ];
    
    // Results comparison
    lines.push('Results Comparison:');
    lines.push(`  Results Equal: ${results.comparison.resultsEqual ? '✓' : '✗'}`);
    lines.push(`  Constraints Equal: ${results.comparison.constraintsEqual ? '✓' : '✗'}`);
    lines.push('');
    
    // Performance comparison
    lines.push('Performance Comparison:');
    lines.push(`  Snarky Execution Time: ${results.snarky.performance.executionTime.toFixed(2)}ms`);
    lines.push(`  Sparky Execution Time: ${results.sparky.performance.executionTime.toFixed(2)}ms`);
    lines.push(`  Performance Ratio: ${results.comparison.performanceRatio.toFixed(2)}x`);
    lines.push(`  Memory Delta (Snarky): ${(results.snarky.performance.memoryDelta / 1024 / 1024).toFixed(2)}MB`);
    lines.push(`  Memory Delta (Sparky): ${(results.sparky.performance.memoryDelta / 1024 / 1024).toFixed(2)}MB`);
    lines.push('');
    
    // Constraint comparison
    if (results.snarky.constraintState && results.sparky.constraintState) {
      lines.push('Constraint System Comparison:');
      lines.push(`  Snarky Constraints: ${results.snarky.constraintState.constraintCount}`);
      lines.push(`  Sparky Constraints: ${results.sparky.constraintState.constraintCount}`);
      lines.push(`  Snarky Public Inputs: ${results.snarky.constraintState.publicInputSize}`);
      lines.push(`  Sparky Public Inputs: ${results.sparky.constraintState.publicInputSize}`);
      lines.push('');
    }
    
    // Differences
    if (results.comparison.differences.length > 0) {
      lines.push('Differences:');
      for (const diff of results.comparison.differences) {
        lines.push(`  - ${diff}`);
      }
      lines.push('');
    }
    
    // Errors
    if (results.snarky.error || results.sparky.error) {
      lines.push('Errors:');
      if (results.snarky.error) {
        lines.push(`  Snarky: ${results.snarky.error.message}`);
      }
      if (results.sparky.error) {
        lines.push(`  Sparky: ${results.sparky.error.message}`);
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }
}

/**
 * Utility functions for creating common test scenarios
 */
export const BackendTestScenarios = {
  /**
   * Create a basic field arithmetic test
   */
  fieldArithmetic: (a: bigint, b: bigint) => ({
    fn: () => {
      const f1 = Field(a);
      const f2 = Field(b);
      return f1.add(f2).mul(f1).sub(f2);
    },
    constraintFn: () => {
      const f1 = Field(a);
      const f2 = Field(b);
      f1.add(f2).mul(f1).sub(f2);
    }
  }),

  /**
   * Create a Poseidon hash test
   */
  poseidonHash: (inputs: bigint[]) => ({
    fn: async () => {
      const { Poseidon } = await import('../../../lib/provable/crypto/poseidon.js');
      const fields = inputs.map(x => Field(x));
      return Poseidon.hash(fields);
    },
    constraintFn: async () => {
      const { Poseidon } = await import('../../../lib/provable/crypto/poseidon.js');
      const fields = inputs.map(x => Field(x));
      Poseidon.hash(fields);
    }
  }),

  /**
   * Create a range check test
   */
  rangeCheck: (value: bigint, numBits: number) => ({
    fn: () => {
      const { Gadgets } = Field;
      const field = Field(value);
      return Gadgets.rangeCheck64(field);
    },
    constraintFn: () => {
      const { Gadgets } = Field;
      const field = Field(value);
      Gadgets.rangeCheck64(field);
    }
  })
};

// Export singleton instance for convenience
export const realBackendIntegration = new RealBackendIntegration();