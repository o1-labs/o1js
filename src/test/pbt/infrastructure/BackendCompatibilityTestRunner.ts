import fc from 'fast-check';
import type { 
  AsyncProperty, 
  AsyncPropertyHookFunction,
  IAsyncProperty,
  Parameters as FCParameters,
  RunDetails
} from 'fast-check';

/**
 * Configuration for test execution
 */
export interface TestConfig {
  seed?: number;
  numRuns?: number;
  timeout?: number;
  verbose?: boolean;
  beforeEach?: AsyncPropertyHookFunction;
  afterEach?: AsyncPropertyHookFunction;
}

/**
 * Result of a test run
 */
export interface TestResult {
  success: boolean;
  duration: number;
  counterexample?: any;
  shrinkingSteps?: number;
  error?: Error;
  runDetails?: RunDetails<any>;
}

/**
 * Logger interface for test execution
 */
export interface TestLogger {
  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void;
  startTest(testName: string): void;
  endTest(testName: string, result: TestResult): void;
}

/**
 * Default logger implementation
 */
export class ConsoleTestLogger implements TestLogger {
  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  startTest(testName: string): void {
    this.log('info', `Starting test: ${testName}`);
  }

  endTest(testName: string, result: TestResult): void {
    const status = result.success ? 'PASSED' : 'FAILED';
    this.log('info', `Test ${testName} ${status} in ${result.duration}ms`);
    
    if (!result.success && result.error) {
      this.log('error', 'Test failure details:', {
        error: result.error.message,
        counterexample: result.counterexample,
        shrinkingSteps: result.shrinkingSteps
      });
    }
  }
}

/**
 * Result comparison interface
 */
export interface ComparisonResult<T> {
  snarky: T;
  sparky: T;
  equal: boolean;
  differences?: string[];
}

/**
 * Backend compatibility test runner
 * 
 * This class provides infrastructure for running property-based tests
 * that compare behavior between Snarky and Sparky backends.
 */
export class BackendCompatibilityTestRunner {
  private logger: TestLogger;
  private compilationCache: Map<string, any> = new Map();

  constructor(logger?: TestLogger) {
    this.logger = logger || new ConsoleTestLogger();
  }

  /**
   * Run a property test with the given configuration
   */
  async runPropertyTest<T>(
    testName: string,
    property: IAsyncProperty<[T]>,
    config: TestConfig = {}
  ): Promise<TestResult> {
    const startTime = Date.now();
    this.logger.startTest(testName);

    // Default configuration
    const fcConfig: FCParameters<[T]> = {
      seed: config.seed,
      numRuns: config.numRuns || 100,
      timeout: config.timeout || 60000,
      asyncReporter: this.createAsyncReporter(testName),
      beforeEach: config.beforeEach || this.defaultBeforeEach.bind(this),
      afterEach: config.afterEach || this.defaultAfterEach.bind(this),
      verbose: config.verbose || false
    };

    try {
      const out = await fc.check(property, fcConfig);
      const duration = Date.now() - startTime;

      if (out.failed) {
        const result: TestResult = {
          success: false,
          duration,
          counterexample: out.counterexample?.[0],
          shrinkingSteps: out.numShrinks,
          error: new Error(out.error || 'Property test failed'),
          runDetails: out
        };
        
        this.logger.endTest(testName, result);
        return result;
      }

      const result: TestResult = {
        success: true,
        duration,
        runDetails: out
      };
      
      this.logger.endTest(testName, result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        success: false,
        duration,
        error: error instanceof Error ? error : new Error(String(error))
      };
      
      this.logger.endTest(testName, result);
      return result;
    }
  }

  /**
   * Run multiple property tests and aggregate results
   */
  async runPropertyTests(
    tests: Array<{
      name: string;
      property: IAsyncProperty<any>;
      config?: TestConfig;
    }>
  ): Promise<{
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: Map<string, TestResult>;
  }> {
    const results = new Map<string, TestResult>();
    let passedTests = 0;
    let failedTests = 0;

    for (const test of tests) {
      const result = await this.runPropertyTest(
        test.name,
        test.property,
        test.config
      );
      
      results.set(test.name, result);
      
      if (result.success) {
        passedTests++;
      } else {
        failedTests++;
      }
    }

    return {
      totalTests: tests.length,
      passedTests,
      failedTests,
      results
    };
  }

  /**
   * Create an async reporter for fast-check
   */
  private createAsyncReporter(testName: string) {
    return {
      reportRunDetails: async (runDetails: RunDetails<any>) => {
        if (runDetails.failed) {
          this.logger.log('warn', `Test ${testName} is shrinking...`, {
            numRuns: runDetails.numRuns,
            numShrinks: runDetails.numShrinks
          });
        }
      }
    };
  }

  /**
   * Default beforeEach hook - resets backend states
   */
  private async defaultBeforeEach(): Promise<void> {
    // Clear compilation cache for fresh state
    this.compilationCache.clear();
    
    // Reset any global state that might affect tests
    await this.resetGlobalState();
  }

  /**
   * Default afterEach hook - cleanup
   */
  private async defaultAfterEach(): Promise<void> {
    // Any cleanup needed after each test
  }

  /**
   * Reset global state between tests
   */
  private async resetGlobalState(): Promise<void> {
    // This will be implemented once we have backend switching utilities
    // For now, it's a placeholder
  }

  /**
   * Compare results from both backends
   */
  compareResults<T>(
    snarkyResult: T,
    sparkyResult: T,
    compareFn?: (a: T, b: T) => boolean
  ): ComparisonResult<T> {
    const equal = compareFn 
      ? compareFn(snarkyResult, sparkyResult)
      : this.defaultCompare(snarkyResult, sparkyResult);

    const result: ComparisonResult<T> = {
      snarky: snarkyResult,
      sparky: sparkyResult,
      equal
    };

    if (!equal) {
      result.differences = this.findDifferences(snarkyResult, sparkyResult);
    }

    return result;
  }

  /**
   * Default comparison function
   */
  private defaultCompare<T>(a: T, b: T): boolean {
    // Handle primitive types
    if (typeof a !== 'object' || a === null) {
      return a === b;
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, idx) => this.defaultCompare(val, b[idx]));
    }

    // Handle objects with equals method
    if ('equals' in a && typeof a.equals === 'function') {
      return (a as any).equals(b);
    }

    // Handle objects with toBigInt method (Field elements)
    if ('toBigInt' in a && typeof a.toBigInt === 'function' &&
        'toBigInt' in b && typeof b.toBigInt === 'function') {
      return (a as any).toBigInt() === (b as any).toBigInt();
    }

    // Deep object comparison
    const keysA = Object.keys(a);
    const keysB = Object.keys(b as any);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => 
      this.defaultCompare((a as any)[key], (b as any)[key])
    );
  }

  /**
   * Find differences between two values
   */
  private findDifferences<T>(a: T, b: T, path: string = ''): string[] {
    const differences: string[] = [];

    if (typeof a !== 'object' || a === null) {
      if (a !== b) {
        differences.push(`${path}: ${a} !== ${b}`);
      }
      return differences;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        differences.push(`${path}.length: ${a.length} !== ${b.length}`);
      }
      
      const minLength = Math.min(a.length, b.length);
      for (let i = 0; i < minLength; i++) {
        differences.push(...this.findDifferences(a[i], b[i], `${path}[${i}]`));
      }
      
      return differences;
    }

    if ('toBigInt' in a && typeof a.toBigInt === 'function' &&
        'toBigInt' in b && typeof b.toBigInt === 'function') {
      const bigIntA = (a as any).toBigInt();
      const bigIntB = (b as any).toBigInt();
      if (bigIntA !== bigIntB) {
        differences.push(`${path}.toBigInt(): ${bigIntA} !== ${bigIntB}`);
      }
      return differences;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b as any);
    const allKeys = new Set([...keysA, ...keysB]);

    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key;
      
      if (!(key in a)) {
        differences.push(`${newPath}: missing in snarky result`);
      } else if (!(key in b)) {
        differences.push(`${newPath}: missing in sparky result`);
      } else {
        differences.push(...this.findDifferences((a as any)[key], (b as any)[key], newPath));
      }
    }

    return differences;
  }

  /**
   * Log detailed error information
   */
  logError(message: string, error: Error, context?: any): void {
    this.logger.log('error', message, {
      error: error.message,
      stack: error.stack,
      context
    });
  }

  /**
   * Log comparison results
   */
  logComparison<T>(testName: string, comparison: ComparisonResult<T>): void {
    if (comparison.equal) {
      this.logger.log('info', `${testName}: Results match between backends`);
    } else {
      this.logger.log('warn', `${testName}: Results differ between backends`, {
        differences: comparison.differences,
        snarkyResult: comparison.snarky,
        sparkyResult: comparison.sparky
      });
    }
  }
}

/**
 * Create a property that compares results between backends
 */
export function createBackendComparisonProperty<T, R>(
  arbitrary: fc.Arbitrary<T>,
  testFn: (input: T, backend: 'snarky' | 'sparky') => Promise<R>,
  compareFn?: (snarky: R, sparky: R) => boolean
): IAsyncProperty<[T]> {
  return fc.asyncProperty(arbitrary, async (input: T) => {
    const runner = new BackendCompatibilityTestRunner();
    
    // Run test on both backends
    const snarkyResult = await testFn(input, 'snarky');
    const sparkyResult = await testFn(input, 'sparky');
    
    // Compare results
    const comparison = runner.compareResults(snarkyResult, sparkyResult, compareFn);
    
    if (!comparison.equal) {
      throw new Error(
        `Backend results differ:\n${comparison.differences?.join('\n')}`
      );
    }
    
    return true;
  });
}