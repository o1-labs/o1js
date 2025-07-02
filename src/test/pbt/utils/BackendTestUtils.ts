/**
 * Utilities for backend testing and comparison
 */

// Note: These imports will need to be adjusted once we can properly import from o1js
// For now, we're using type definitions to plan the interface
interface Field {
  toBigInt(): bigint;
  toString(): string;
  equals(other: Field): boolean;
}

interface Bool {
  toBoolean(): boolean;
  equals(other: Bool): boolean;
}

interface Group {
  x: Field;
  y: Field;
  equals(other: Group): boolean;
}

/**
 * Backend type
 */
export type Backend = 'snarky' | 'sparky';

/**
 * Result capture for backend operations
 */
export interface BackendResult<T> {
  backend: Backend;
  result: T;
  constraintCount?: number;
  executionTime: number;
  error?: Error;
}

/**
 * Captured constraint system state
 */
export interface ConstraintSystemState {
  constraintCount: number;
  publicInputSize: number;
  witnessSize: number;
  gates?: any[];
}

/**
 * Backend execution context
 */
export interface BackendContext {
  backend: Backend;
  state: ConstraintSystemState;
  startTime: number;
}

/**
 * Global backend state management
 * This will be populated once we can import the actual backend switching functions
 */
let currentBackend: Backend = 'snarky';
let switchBackendFn: ((backend: Backend) => Promise<void>) | null = null;
let getCurrentBackendFn: (() => Backend) | null = null;

/**
 * Initialize backend utilities with actual implementation
 */
export function initializeBackendUtils(
  switchFn: (backend: Backend) => Promise<void>,
  getCurrentFn: () => Backend
): void {
  switchBackendFn = switchFn;
  getCurrentBackendFn = getCurrentFn;
}

/**
 * Initialize with real o1js backend functions
 */
export async function initializeWithRealBackend(): Promise<void> {
  try {
    const { switchBackend: realSwitchBackend, getCurrentBackend: realGetCurrentBackend } = await import('../../../index.js');
    initializeBackendUtils(realSwitchBackend, realGetCurrentBackend);
  } catch (error) {
    console.warn('Failed to initialize with real backend functions, using mock implementation');
  }
}

/**
 * Switch to specified backend
 */
export async function switchBackend(backend: Backend): Promise<void> {
  if (!switchBackendFn) {
    console.warn('Backend switching not initialized, using mock implementation');
    currentBackend = backend;
    return;
  }
  
  await switchBackendFn(backend);
  currentBackend = backend;
}

/**
 * Get current backend
 */
export function getCurrentBackend(): Backend {
  if (!getCurrentBackendFn) {
    return currentBackend;
  }
  
  return getCurrentBackendFn();
}

/**
 * Execute a function with a specific backend
 */
export async function runWithBackend<T>(
  backend: Backend,
  fn: () => Promise<T>
): Promise<BackendResult<T>> {
  const previousBackend = getCurrentBackend();
  const startTime = performance.now();
  
  try {
    // Switch to target backend
    await switchBackend(backend);
    
    // Capture initial constraint state
    const initialState = captureConstraintState();
    
    // Execute function
    const result = await fn();
    
    // Capture final constraint state
    const finalState = captureConstraintState();
    
    const executionTime = performance.now() - startTime;
    
    return {
      backend,
      result,
      constraintCount: finalState.constraintCount - initialState.constraintCount,
      executionTime
    };
  } catch (error) {
    return {
      backend,
      result: null as any,
      executionTime: performance.now() - startTime,
      error: error instanceof Error ? error : new Error(String(error))
    };
  } finally {
    // Restore previous backend
    await switchBackend(previousBackend);
  }
}

/**
 * Compare execution on both backends
 */
export async function compareBackends<T>(
  fn: (backend: Backend) => Promise<T>
): Promise<{
  snarky: BackendResult<T>;
  sparky: BackendResult<T>;
}> {
  const snarky = await runWithBackend('snarky', () => fn('snarky'));
  const sparky = await runWithBackend('sparky', () => fn('sparky'));
  
  return { snarky, sparky };
}

/**
 * Capture current constraint system state
 */
function captureConstraintState(): ConstraintSystemState {
  // In real usage, this would need to be called within a constraint system context
  // For now, return minimal state - the real implementation is in RealBackendIntegration
  return {
    constraintCount: 0,
    publicInputSize: 0,
    witnessSize: 0
  };
}

/**
 * Real constraint system capture using Provable.constraintSystem
 */
export async function captureRealConstraintState(
  circuitFn: (() => Promise<void>) | (() => void)
): Promise<ConstraintSystemState> {
  try {
    const { constraintSystem } = await import('../../../lib/provable/core/provable-context.js');
    const csResult = await constraintSystem(circuitFn);
    
    return {
      constraintCount: csResult.rows,
      publicInputSize: csResult.publicInputSize,
      witnessSize: 0, // Not available in current API
    };
  } catch (error) {
    console.warn('Failed to capture real constraint state:', error);
    return captureConstraintState(); // Fallback to mock
  }
}

/**
 * Field element comparison utilities
 */
export const FieldCompare = {
  /**
   * Compare two field elements for equality
   */
  equals(a: Field, b: Field): boolean {
    return a.toBigInt() === b.toBigInt();
  },

  /**
   * Compare arrays of field elements
   */
  arrayEquals(a: Field[], b: Field[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((field, idx) => FieldCompare.equals(field, b[idx]));
  },

  /**
   * Find differences between field arrays
   */
  findDifferences(a: Field[], b: Field[]): number[] {
    const differences: number[] = [];
    const minLength = Math.min(a.length, b.length);
    
    for (let i = 0; i < minLength; i++) {
      if (!FieldCompare.equals(a[i], b[i])) {
        differences.push(i);
      }
    }
    
    // Add indices for length mismatch
    for (let i = minLength; i < Math.max(a.length, b.length); i++) {
      differences.push(i);
    }
    
    return differences;
  },

  /**
   * Format field element for display
   */
  format(field: Field): string {
    const bigint = field.toBigInt();
    if (bigint < 1000n) {
      return bigint.toString();
    }
    // Show first and last 6 digits for large numbers
    const str = bigint.toString();
    return `${str.slice(0, 6)}...${str.slice(-6)}`;
  }
};

/**
 * Bool comparison utilities
 */
export const BoolCompare = {
  equals(a: Bool, b: Bool): boolean {
    return a.toBoolean() === b.toBoolean();
  },

  arrayEquals(a: Bool[], b: Bool[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((bool, idx) => BoolCompare.equals(bool, b[idx]));
  }
};

/**
 * Group element comparison utilities
 */
export const GroupCompare = {
  equals(a: Group, b: Group): boolean {
    return FieldCompare.equals(a.x, b.x) && FieldCompare.equals(a.y, b.y);
  },

  arrayEquals(a: Group[], b: Group[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((group, idx) => GroupCompare.equals(group, b[idx]));
  }
};

/**
 * Generic comparison function that handles common o1js types
 */
export function deepCompare(a: any, b: any): boolean {
  // Handle primitives
  if (typeof a !== 'object' || a === null) {
    return a === b;
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => deepCompare(val, b[idx]));
  }

  // Handle Field elements
  if ('toBigInt' in a && 'toBigInt' in b) {
    return a.toBigInt() === b.toBigInt();
  }

  // Handle Bool elements
  if ('toBoolean' in a && 'toBoolean' in b) {
    return a.toBoolean() === b.toBoolean();
  }

  // Handle objects with equals method
  if ('equals' in a && typeof a.equals === 'function') {
    return a.equals(b);
  }

  // Generic object comparison
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => deepCompare(a[key], b[key]));
}

/**
 * Performance comparison utilities
 */
export const PerformanceCompare = {
  /**
   * Calculate performance ratio (sparky/snarky)
   */
  ratio(snarkyTime: number, sparkyTime: number): number {
    return sparkyTime / snarkyTime;
  },

  /**
   * Check if performance is within acceptable bounds
   */
  isAcceptable(snarkyTime: number, sparkyTime: number, maxRatio: number = 1.5): boolean {
    return PerformanceCompare.ratio(snarkyTime, sparkyTime) <= maxRatio;
  },

  /**
   * Format performance comparison
   */
  format(snarkyTime: number, sparkyTime: number): string {
    const ratio = PerformanceCompare.ratio(snarkyTime, sparkyTime);
    const faster = ratio < 1 ? 'faster' : 'slower';
    const percentage = Math.abs((ratio - 1) * 100);
    
    return `Sparky is ${percentage.toFixed(1)}% ${faster} than Snarky`;
  }
};

/**
 * Constraint count comparison utilities
 */
export const ConstraintCompare = {
  /**
   * Calculate constraint count ratio
   */
  ratio(snarkyCount: number, sparkyCount: number): number {
    if (snarkyCount === 0) return sparkyCount === 0 ? 1 : Infinity;
    return sparkyCount / snarkyCount;
  },

  /**
   * Check if constraint count difference is acceptable
   */
  isAcceptable(snarkyCount: number, sparkyCount: number, maxRatio: number = 2.0): boolean {
    return ConstraintCompare.ratio(snarkyCount, sparkyCount) <= maxRatio;
  },

  /**
   * Format constraint comparison
   */
  format(snarkyCount: number, sparkyCount: number): string {
    const ratio = ConstraintCompare.ratio(snarkyCount, sparkyCount);
    const diff = sparkyCount - snarkyCount;
    
    if (diff === 0) {
      return 'Constraint counts match';
    }
    
    const more = diff > 0 ? 'more' : 'fewer';
    return `Sparky has ${Math.abs(diff)} ${more} constraints (${ratio.toFixed(2)}x)`;
  }
};

/**
 * Error handling utilities
 */
export const ErrorCompare = {
  /**
   * Check if errors are equivalent
   */
  areEquivalent(a: Error | undefined, b: Error | undefined): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    
    // Compare error types
    if (a.constructor !== b.constructor) return false;
    
    // For now, just check if both are errors of same type
    // Could be extended to compare messages, etc.
    return true;
  },

  /**
   * Format error comparison
   */
  format(snarkyError: Error | undefined, sparkyError: Error | undefined): string {
    if (!snarkyError && !sparkyError) {
      return 'Both backends succeeded';
    }
    
    if (snarkyError && !sparkyError) {
      return `Snarky failed: ${snarkyError.message}, Sparky succeeded`;
    }
    
    if (!snarkyError && sparkyError) {
      return `Snarky succeeded, Sparky failed: ${sparkyError.message}`;
    }
    
    return `Both backends failed - Snarky: ${snarkyError!.message}, Sparky: ${sparkyError!.message}`;
  }
};

/**
 * Test result aggregation
 */
export interface AggregatedResults {
  totalTests: number;
  matchingResults: number;
  constraintMismatches: number;
  performanceRegressions: number;
  errors: Array<{
    test: string;
    snarkyError?: Error;
    sparkyError?: Error;
  }>;
}

/**
 * Aggregate multiple test results
 */
export function aggregateResults(
  results: Array<{
    name: string;
    snarky: BackendResult<any>;
    sparky: BackendResult<any>;
    equal: boolean;
  }>
): AggregatedResults {
  const aggregated: AggregatedResults = {
    totalTests: results.length,
    matchingResults: 0,
    constraintMismatches: 0,
    performanceRegressions: 0,
    errors: []
  };

  for (const result of results) {
    if (result.equal) {
      aggregated.matchingResults++;
    }

    // Check constraint mismatch
    if (result.snarky.constraintCount !== undefined &&
        result.sparky.constraintCount !== undefined &&
        !ConstraintCompare.isAcceptable(
          result.snarky.constraintCount,
          result.sparky.constraintCount
        )) {
      aggregated.constraintMismatches++;
    }

    // Check performance regression
    if (!PerformanceCompare.isAcceptable(
      result.snarky.executionTime,
      result.sparky.executionTime
    )) {
      aggregated.performanceRegressions++;
    }

    // Collect errors
    if (result.snarky.error || result.sparky.error) {
      aggregated.errors.push({
        test: result.name,
        snarkyError: result.snarky.error,
        sparkyError: result.sparky.error
      });
    }
  }

  return aggregated;
}

/**
 * Format aggregated results for display
 */
export function formatAggregatedResults(results: AggregatedResults): string {
  const lines: string[] = [
    '=== Backend Compatibility Test Results ===',
    `Total Tests: ${results.totalTests}`,
    `Matching Results: ${results.matchingResults} (${(results.matchingResults / results.totalTests * 100).toFixed(1)}%)`,
    `Constraint Mismatches: ${results.constraintMismatches}`,
    `Performance Regressions: ${results.performanceRegressions}`,
    ''
  ];

  if (results.errors.length > 0) {
    lines.push('Errors:');
    for (const error of results.errors) {
      lines.push(`  ${error.test}:`);
      if (error.snarkyError) {
        lines.push(`    Snarky: ${error.snarkyError.message}`);
      }
      if (error.sparkyError) {
        lines.push(`    Sparky: ${error.sparkyError.message}`);
      }
    }
  }

  return lines.join('\n');
}