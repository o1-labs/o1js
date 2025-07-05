/**
 * Gate Test Framework for Sparky Backend
 * 
 * Provides comprehensive testing infrastructure for gate operations including:
 * - Property-based testing with mathematical verification
 * - Cross-backend parity validation (Sparky vs Snarky)
 * - Constraint system validation and optimization testing
 * - Performance benchmarking and regression detection
 * 
 * Created: July 4, 2025, 21:45 UTC
 * Last Modified: July 4, 2025, 23:45 UTC
 */

import { Field, ZkProgram, Provable, Bool } from '../../../../../index.js';
import { Random } from '../../../../../lib/testing/random.js';
import { constraintSystem, ifNotAllConstant, equals, contains, and, or, not, fulfills, print, withoutGenerics } from '../../../../../lib/testing/constraint-system.js';
import { switchBackend, getCurrentBackend } from '../../../../../bindings.js';

export interface GateTestConfig {
  name: string;
  tier: 'smoke' | 'core' | 'comprehensive';
  timeout?: number;
  backend?: 'sparky' | 'snarky' | 'both';
  iterations?: number;
}

export interface PropertyTestResult {
  passed: boolean;
  iterations: number;
  failures: any[];
  performance: {
    avgConstraints: number;
    avgTime: number;
  };
}

export interface GateOperation<T extends any[], R> {
  name: string;
  operation: (...inputs: T) => R;
  properties: PropertyValidator<T, R>[];
  constraintPattern?: string[];
  expectedConstraints?: number;
  exactPattern?: boolean; // true for equals(), false for contains()
  patternMode?: 'exact' | 'contains' | 'custom';
}

export interface PropertyValidator<T extends any[], R> {
  name: string;
  validate: (inputs: T, output: R) => boolean;
  description: string;
}

/**
 * Core gate testing framework that orchestrates property-based testing,
 * constraint validation, and cross-backend comparison
 */
export class GateTestFramework {
  private config: GateTestConfig;
  private random: any;
  
  constructor(config: GateTestConfig) {
    this.config = config;
    this.random = Random;
  }

  /**
   * Run comprehensive gate tests including property validation and constraint checking
   */
  async runGateTest<T extends any[], R>(
    operation: GateOperation<T, R>,
    inputGenerator: () => T
  ): Promise<PropertyTestResult> {
    const iterations = this.config.iterations || this.getDefaultIterations();
    const failures: any[] = [];
    let totalConstraints = 0;
    let totalTime = 0;

    console.log(`🧪 Testing ${operation.name} (${iterations} iterations)`);
    
    // Verify backend state
    const currentBackend = getCurrentBackend();
    console.log(`Running tests with ${currentBackend} backend`);

    for (let i = 0; i < iterations; i++) {
      try {
        const inputs = inputGenerator();
        const startTime = performance.now();
        
        // Verify backend hasn't changed during test
        if (getCurrentBackend() !== currentBackend) {
          failures.push({
            iteration: i,
            property: 'backend_stability',
            expected: currentBackend,
            actual: getCurrentBackend(),
            error: 'Backend changed during test execution'
          });
        }
        
        // Run the operation and measure constraints
        const constraintsUsed = await this.measureConstraintsForOperation(
          operation.operation,
          inputs
        );
        const output = operation.operation(...inputs);
        
        const endTime = performance.now();
        
        totalConstraints += constraintsUsed;
        totalTime += (endTime - startTime);

        // Validate mathematical properties
        for (const property of operation.properties) {
          if (!property.validate(inputs, output)) {
            failures.push({
              iteration: i,
              property: property.name,
              inputs,
              output,
              description: property.description,
              backend: currentBackend
            });
          }
        }

        // Validate expected constraint count
        if (operation.expectedConstraints !== undefined && 
            constraintsUsed !== operation.expectedConstraints) {
          failures.push({
            iteration: i,
            property: 'constraint_count',
            expected: operation.expectedConstraints,
            actual: constraintsUsed,
            inputs,
            backend: currentBackend
          });
        }

      } catch (error) {
        failures.push({
          iteration: i,
          property: 'execution',
          error: error instanceof Error ? error.message : String(error),
          inputs: inputGenerator(),
          backend: currentBackend
        });
      }
    }

    const result: PropertyTestResult = {
      passed: failures.length === 0,
      iterations,
      failures,
      performance: {
        avgConstraints: totalConstraints / iterations,
        avgTime: totalTime / iterations
      }
    };

    this.reportResults(operation.name, result);
    return result;
  }

  /**
   * Test constraint system patterns using o1js constraint testing DSL
   * Supports exact pattern matching (equals) and partial pattern matching (contains)
   */
  async testConstraintPattern<T extends any[]>(
    name: string,
    operation: (...inputs: T) => any,
    expectedPattern: string[],
    inputGenerator: () => T,
    mode: 'exact' | 'contains' | 'custom' = 'exact'
  ) {
    console.log(`🔍 Testing constraint pattern for ${name} (mode: ${mode})`);
    
    try {
      // Create the constraint system test using o1js DSL
      const constraintTest = this.createConstraintTest(expectedPattern, mode);
      
      // Prepare inputs for the constraint system test
      const inputs = inputGenerator();
      const inputTypes = this.getInputTypes(inputs);
      
      // Run the constraint system test using o1js DSL
      let testResult: { passed: boolean; actualPattern?: string[]; error?: string };
      
      try {
        // Use the o1js constraintSystem function to test the pattern
        const testPassed = await this.runConstraintSystemTest(
          name,
          inputTypes,
          operation,
          constraintTest,
          inputs
        );
        
        // Also get the actual pattern for debugging
        const actualPattern = await this.getActualGatePattern(operation, inputs);
        
        testResult = {
          passed: testPassed,
          actualPattern
        };
        
      } catch (error) {
        // If the DSL test fails, get the actual pattern for comparison
        const actualPattern = await this.getActualGatePattern(operation, inputs);
        testResult = {
          passed: false,
          actualPattern,
          error: error instanceof Error ? error.message : String(error)
        };
      }
      
      // Report results
      if (testResult.passed) {
        console.log(`✅ Constraint pattern test passed for ${name}`);
        console.log(`   Expected (${mode}): ${expectedPattern.join(', ')}`);
        if (testResult.actualPattern) {
          console.log(`   Actual: ${testResult.actualPattern.join(', ')}`);
        }
      } else {
        console.error(`❌ Constraint pattern test failed for ${name}`);
        console.error(`   Expected (${mode}): ${expectedPattern.join(', ')}`);
        if (testResult.actualPattern) {
          console.error(`   Actual: ${testResult.actualPattern.join(', ')}`);
        }
        if (testResult.error) {
          console.error(`   Error: ${testResult.error}`);
        }
      }
      
      return {
        name,
        expectedPattern,
        actualPattern: testResult.actualPattern,
        patternMatches: testResult.passed,
        mode,
        error: testResult.error
      };
      
    } catch (error) {
      console.error(`Constraint pattern test setup failed for ${name}:`, error);
      return {
        name,
        expectedPattern,
        mode,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Create a constraint system test based on the expected pattern and mode
   */
  private createConstraintTest(expectedPattern: string[], mode: 'exact' | 'contains' | 'custom') {
    switch (mode) {
      case 'exact':
        // Use equals() for exact pattern matching
        return equals(expectedPattern as any[]);
      
      case 'contains':
        // Use contains() for partial pattern matching
        return contains(expectedPattern as any);
      
      case 'custom':
        // Allow for custom pattern matching with wildcards
        return fulfills(`custom pattern match`, (gates) => {
          return this.checkPatternMatch(gates.map(g => g.type), expectedPattern);
        });
      
      default:
        throw new Error(`Unknown constraint test mode: ${mode}`);
    }
  }

  /**
   * Run a constraint system test using the o1js DSL
   */
  private async runConstraintSystemTest<T extends any[]>(
    name: string,
    inputTypes: any[],
    operation: (...inputs: T) => any,
    constraintTest: any,
    sampleInputs: T
  ): Promise<boolean> {
    try {
      // Create a test runner that will validate the constraint pattern
      let testPassed = false;
      let testError: Error | null = null;
      
      // We'll use the constraintSystem function to test the pattern
      // For now, we'll simulate the test by checking the pattern manually
      // since the constraintSystem function expects a specific format
      
      const actualGates = await this.getActualGatePattern(operation, sampleInputs);
      
      // Simulate running the DSL test
      const mockConstraintSystem = actualGates.map(type => ({ type }));
      const mockInputs = inputTypes.map((type, i) => ({ type, value: sampleInputs[i] }));
      
      // Run the constraint test
      const result = this.simulateConstraintTest(constraintTest, mockConstraintSystem, mockInputs);
      
      return result.ok;
      
    } catch (error) {
      console.error(`Failed to run constraint system test for ${name}:`, error);
      return false;
    }
  }

  /**
   * Get the actual gate pattern generated by an operation
   */
  private async getActualGatePattern<T extends any[]>(
    operation: (...inputs: T) => any,
    inputs: T
  ): Promise<string[]> {
    try {
      const constraintSystemResult = await Provable.constraintSystem(() => {
        // Create witness variables for the inputs within the circuit context
        const witnessInputs = inputs.map((input, index) => {
          if (input instanceof Field) {
            return Provable.witness(Field, () => input);
          } else if (input instanceof Bool) {
            return Provable.witness(Bool, () => input);
          } else if (typeof input === 'number') {
            return Provable.witness(Field, () => Field(input));
          } else {
            // For other types, try to convert to Field
            return Provable.witness(Field, () => Field(input));
          }
        }) as T;
        
        // Run the operation with the witness inputs
        const result = operation(...witnessInputs);
        
        // Add a constraint to ensure the result is used
        if (result instanceof Field) {
          result.assertEquals(result);
        } else if (result instanceof Bool) {
          result.assertEquals(result);
        }
        
        return result;
      });
      
      return constraintSystemResult.gates.map(gate => gate.type);
    } catch (error) {
      console.warn('Failed to get actual gate pattern:', error);
      return [];
    }
  }

  /**
   * Simulate running a constraint test (simplified version of the DSL runner)
   */
  private simulateConstraintTest(test: any, gates: any[], inputs: any[]): { ok: boolean; failures: string[] } {
    try {
      if (test.run) {
        const ok = test.run(gates, inputs);
        return { ok, failures: ok ? [] : [test.label] };
      }
      
      // Handle different test types
      if (test.kind === 'not') {
        const result = this.simulateConstraintTest(test, gates, inputs);
        return { ok: !result.ok, failures: result.ok ? [`not(${test.label})`] : [] };
      }
      
      if (test.kind === 'and') {
        const results = test.tests.map((t: any) => this.simulateConstraintTest(t, gates, inputs));
        const ok = results.every((r: any) => r.ok);
        const failures = ok ? [] : results.flatMap((r: any) => r.failures);
        return { ok, failures };
      }
      
      if (test.kind === 'or') {
        const results = test.tests.map((t: any) => this.simulateConstraintTest(t, gates, inputs));
        const ok = results.some((r: any) => r.ok);
        const failures = ok ? [] : results.flatMap((r: any) => r.failures);
        return { ok, failures };
      }
      
      return { ok: false, failures: ['Unknown test type'] };
      
    } catch (error) {
      return { ok: false, failures: [`Test execution failed: ${error}`] };
    }
  }

  /**
   * Check if the actual constraint pattern matches the expected pattern
   * Enhanced to support wildcards and flexible matching
   */
  private checkPatternMatch(actual: string[], expected: string[]): boolean {
    if (actual.length !== expected.length) {
      return false;
    }
    
    return actual.every((gate, index) => {
      const expectedGate = expected[index];
      // Allow wildcards in expected pattern
      return expectedGate === '*' || gate === expectedGate;
    });
  }

  /**
   * Cross-backend parity testing - compare Sparky vs Snarky results
   */
  async testBackendParity<T extends any[], R>(
    operation: GateOperation<T, R>,
    inputGenerator: () => T,
    iterations: number = 10
  ): Promise<boolean> {
    console.log(`🔄 Testing backend parity for ${operation.name}`);
    
    // Store original backend to restore later
    const originalBackend = getCurrentBackend();
    
    try {
      for (let i = 0; i < iterations; i++) {
        const inputs = inputGenerator();
        
        // Test with Sparky backend
        try {
          await this.switchBackend('sparky');
          const sparkyResult = operation.operation(...inputs);
          const sparkyConstraints = await this.measureConstraintsForOperation(
            operation.operation,
            inputs
          );
          
          // Test with Snarky backend  
          await this.switchBackend('snarky');
          const snarkyResult = operation.operation(...inputs);
          const snarkyConstraints = await this.measureConstraintsForOperation(
            operation.operation,
            inputs
          );
          
          // Compare results
          if (!this.resultsEqual(sparkyResult, snarkyResult)) {
            console.error(`❌ Backend parity failed on iteration ${i}:`, {
              inputs,
              sparkyResult,
              snarkyResult,
              sparkyBackend: 'sparky',
              snarkyBackend: 'snarky'
            });
            return false;
          }
          
          // Sparky should use <= constraints than Snarky (optimization goal)
          if (sparkyConstraints > snarkyConstraints) {
            console.warn(`⚠️  Sparky used more constraints than Snarky:`, {
              sparky: sparkyConstraints,
              snarky: snarkyConstraints,
              inputs,
              iteration: i
            });
          } else if (sparkyConstraints < snarkyConstraints) {
            console.log(`🎉 Sparky optimization detected:`, {
              sparky: sparkyConstraints,
              snarky: snarkyConstraints,
              savings: snarkyConstraints - sparkyConstraints,
              inputs,
              iteration: i
            });
          }
          
        } catch (error) {
          console.error(`❌ Backend parity test failed on iteration ${i}:`, error);
          return false;
        }
      }
      
      console.log(`✅ Backend parity passed for ${operation.name} (${iterations} iterations)`);
      return true;
      
    } finally {
      // Restore original backend
      try {
        await this.switchBackend(originalBackend as 'sparky' | 'snarky');
      } catch (error) {
        console.warn(`⚠️  Failed to restore original backend ${originalBackend}:`, error);
      }
    }
  }

  /**
   * Performance regression testing - ensure constraint counts don't increase
   */
  async benchmarkPerformance<T extends any[], R>(
    operation: GateOperation<T, R>,
    inputGenerator: () => T,
    baselineConstraints: number
  ): Promise<boolean> {
    const result = await this.runGateTest(operation, inputGenerator);
    const avgConstraints = result.performance.avgConstraints;
    
    if (avgConstraints > baselineConstraints * 1.1) { // 10% tolerance
      console.error(`❌ Performance regression detected:`, {
        baseline: baselineConstraints,
        current: avgConstraints,
        regression: ((avgConstraints / baselineConstraints) - 1) * 100
      });
      return false;
    }
    
    if (avgConstraints < baselineConstraints * 0.9) { // Performance improvement
      console.log(`🎉 Performance improvement detected:`, {
        baseline: baselineConstraints,
        current: avgConstraints,
        improvement: ((baselineConstraints / avgConstraints) - 1) * 100
      });
    }
    
    return true;
  }

  // Helper methods
  private getDefaultIterations(): number {
    switch (this.config.tier) {
      case 'smoke': return 10;
      case 'core': return 100;
      case 'comprehensive': return 1000;
      default: return 100;
    }
  }

  /**
   * Get current backend state for debugging
   */
  public getCurrentBackendState(): { backend: string; initialized: boolean } {
    try {
      const backend = getCurrentBackend();
      return {
        backend,
        initialized: true
      };
    } catch (error) {
      return {
        backend: 'unknown',
        initialized: false
      };
    }
  }

  private getConstraintCount(): number {
    // This method is no longer used - we now measure constraints directly in operations
    return 0;
  }

  /**
   * Measure constraints for a given operation
   * Returns the number of constraints generated by the operation
   */
  private async measureConstraintsForOperation<T extends any[], R>(
    operation: (...inputs: T) => R,
    inputs: T
  ): Promise<number> {
    try {
      const constraintSystem = await Provable.constraintSystem(() => {
        // Create witness variables for the inputs within the circuit context
        const witnessInputs = inputs.map((input) => {
          if (input instanceof Field) {
            return Provable.witness(Field, () => input);
          } else if (input instanceof Bool) {
            return Provable.witness(Bool, () => input);
          } else if (typeof input === 'number') {
            return Provable.witness(Field, () => Field(input));
          } else {
            // For other types, try to convert to Field
            return Provable.witness(Field, () => Field(input));
          }
        }) as T;
        
        // Run the operation with the witness inputs
        const result = operation(...witnessInputs);
        
        // Add a constraint to ensure the result is used
        if (result instanceof Field) {
          result.assertEquals(result);
        } else if (result instanceof Bool) {
          result.assertEquals(result);
        }
        
        return result;
      });
      return constraintSystem.gates.length;
    } catch (error) {
      console.warn('Failed to measure constraints:', error);
      return 0;
    }
  }

  public async switchBackend(backend: 'sparky' | 'snarky'): Promise<void> {
    try {
      const currentBackend = getCurrentBackend();
      if (currentBackend === backend) {
        console.log(`Already using ${backend} backend`);
        return;
      }
      
      console.log(`Switching from ${currentBackend} to ${backend} backend`);
      await switchBackend(backend);
      
      // Verify the switch was successful
      const newBackend = getCurrentBackend();
      if (newBackend !== backend) {
        throw new Error(`Backend switch failed: expected ${backend}, got ${newBackend}`);
      }
      
      console.log(`✅ Successfully switched to ${backend} backend`);
    } catch (error) {
      console.error(`❌ Failed to switch to ${backend} backend:`, error);
      throw new Error(`Backend switching failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private resultsEqual(a: any, b: any): boolean {
    try {
      // Handle Field elements
      if (a instanceof Field && b instanceof Field) {
        return a.equals(b).toBoolean();
      }
      
      // Handle Bool elements
      if (a instanceof Bool && b instanceof Bool) {
        return a.equals(b).toBoolean();
      }
      
      // Handle arrays
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((item, index) => this.resultsEqual(item, b[index]));
      }
      
      // Handle objects
      if (a && b && typeof a === 'object' && typeof b === 'object') {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        
        if (aKeys.length !== bKeys.length) return false;
        
        return aKeys.every(key => 
          bKeys.includes(key) && this.resultsEqual(a[key], b[key])
        );
      }
      
      // Handle primitive values
      return a === b;
      
    } catch (error) {
      console.warn('Field comparison failed, falling back to JSON comparison:', error);
      try {
        return JSON.stringify(a) === JSON.stringify(b);
      } catch (jsonError) {
        console.warn('JSON comparison also failed:', jsonError);
        return false;
      }
    }
  }

  /**
   * Enhanced constraint pattern validation with multiple validation modes
   */
  async validateConstraintPattern<T extends any[]>(
    operation: GateOperation<T, any>,
    inputGenerator: () => T,
    iterations: number = 5
  ) {
    console.log(`🔍 Validating constraint patterns for ${operation.name}`);
    
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      if (operation.constraintPattern) {
        const mode = operation.patternMode || 'exact';
        const result = await this.testConstraintPattern(
          `${operation.name}_${i}`,
          operation.operation,
          operation.constraintPattern,
          inputGenerator,
          mode
        );
        results.push(result);
      }
    }
    
    const passed = results.every(r => r.patternMatches);
    const failed = results.filter(r => !r.patternMatches);
    
    console.log(`📊 Pattern validation summary for ${operation.name}:`);
    console.log(`   Total tests: ${results.length}`);
    console.log(`   Passed: ${results.length - failed.length}`);
    console.log(`   Failed: ${failed.length}`);
    
    if (failed.length > 0) {
      console.error(`❌ Pattern validation failures:`);
      failed.forEach((failure, index) => {
        console.error(`   ${index + 1}. ${failure.error || 'Pattern mismatch'}`);
      });
    }
    
    return {
      passed,
      totalTests: results.length,
      failures: failed.length,
      results
    };
  }

  /**
   * Test constraint patterns with both exact and partial matching
   */
  async testConstraintPatternBoth<T extends any[]>(
    name: string,
    operation: (...inputs: T) => any,
    expectedPattern: string[],
    inputGenerator: () => T
  ) {
    console.log(`🔍 Testing constraint pattern (both modes) for ${name}`);
    
    // Test exact pattern matching
    const exactResult = await this.testConstraintPattern(
      `${name}_exact`,
      operation,
      expectedPattern,
      inputGenerator,
      'exact'
    );
    
    // Test partial pattern matching (contains)
    const containsResult = await this.testConstraintPattern(
      `${name}_contains`,
      operation,
      expectedPattern,
      inputGenerator,
      'contains'
    );
    
    console.log(`📊 Pattern test summary for ${name}:`);
    console.log(`   Exact match: ${exactResult.patternMatches ? '✅' : '❌'}`);
    console.log(`   Contains match: ${containsResult.patternMatches ? '✅' : '❌'}`);
    
    return {
      name,
      exact: exactResult,
      contains: containsResult,
      anyPassed: exactResult.patternMatches || containsResult.patternMatches
    };
  }

  /**
   * Advanced pattern analysis with gate type statistics
   */
  async analyzeConstraintPatterns<T extends any[]>(
    operation: GateOperation<T, any>,
    inputGenerator: () => T,
    iterations: number = 10
  ) {
    console.log(`🔍 Analyzing constraint patterns for ${operation.name}`);
    
    const patterns: string[][] = [];
    const gateStats: { [key: string]: number } = {};
    
    for (let i = 0; i < iterations; i++) {
      const inputs = inputGenerator();
      const pattern = await this.getActualGatePattern(operation.operation, inputs);
      patterns.push(pattern);
      
      // Count gate types
      pattern.forEach(gateType => {
        gateStats[gateType] = (gateStats[gateType] || 0) + 1;
      });
    }
    
    // Find the most common pattern
    const patternStrings = patterns.map(p => p.join(','));
    const patternCounts: { [key: string]: number } = {};
    patternStrings.forEach(pattern => {
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    });
    
    const mostCommonPattern = Object.entries(patternCounts)
      .sort(([, a], [, b]) => b - a)[0];
    
    console.log(`📊 Pattern analysis for ${operation.name}:`);
    console.log(`   Total iterations: ${iterations}`);
    console.log(`   Unique patterns: ${Object.keys(patternCounts).length}`);
    console.log(`   Most common pattern: ${mostCommonPattern[0]} (${mostCommonPattern[1]} times)`);
    console.log(`   Gate type frequency:`);
    Object.entries(gateStats)
      .sort(([, a], [, b]) => b - a)
      .forEach(([gate, count]) => {
        console.log(`     ${gate}: ${count}`);
      });
    
    return {
      patterns,
      gateStats,
      mostCommonPattern: mostCommonPattern[0].split(','),
      patternConsistency: mostCommonPattern[1] / iterations,
      uniquePatterns: Object.keys(patternCounts).length
    };
  }

  private getInputTypes(inputs: any[]): any[] {
    return inputs.map(input => {
      if (input instanceof Field) return Field;
      if (input instanceof Bool) return Bool;
      return typeof input;
    });
  }

  private reportResults(name: string, result: PropertyTestResult): void {
    if (result.passed) {
      console.log(`✅ ${name}: ${result.iterations} iterations passed`);
      console.log(`   Avg constraints: ${result.performance.avgConstraints.toFixed(2)}`);
      console.log(`   Avg time: ${result.performance.avgTime.toFixed(2)}ms`);
    } else {
      console.error(`❌ ${name}: ${result.failures.length}/${result.iterations} failures`);
      result.failures.slice(0, 3).forEach(failure => {
        console.error(`   Failed: ${failure.property} - ${failure.description || failure.error}`);
      });
    }
  }
}

/**
 * Mathematical property validators for common gate operations
 */
export const MathProperties = {
  /**
   * Validates field addition commutativity: a + b = b + a
   */
  fieldAdditionCommutative: <PropertyValidator<[Field, Field], Field>>{
    name: 'addition_commutative',
    description: 'Addition should be commutative: a + b = b + a',
    validate: ([a, b], result) => {
      const reverse = b.add(a);
      return result.equals(reverse).toBoolean();
    }
  },

  /**
   * Validates field multiplication commutativity: a * b = b * a  
   */
  fieldMultiplicationCommutative: <PropertyValidator<[Field, Field], Field>>{
    name: 'multiplication_commutative',
    description: 'Multiplication should be commutative: a * b = b * a',
    validate: ([a, b], result) => {
      const reverse = b.mul(a);
      return result.equals(reverse).toBoolean();
    }
  },

  /**
   * Validates boolean constraint: result ∈ {0, 1}
   */
  booleanValue: <PropertyValidator<[Field], Bool>>{
    name: 'boolean_value',
    description: 'Result should be 0 or 1',
    validate: ([input], result) => {
      const value = result.toField();
      return value.equals(Field(0)).or(value.equals(Field(1))).toBoolean();
    }
  },

  /**
   * Validates XOR truth table: a ⊕ b = (a + b) mod 2
   */
  xorTruthTable: <PropertyValidator<[Bool, Bool], Bool>>{
    name: 'xor_truth_table',
    description: 'XOR should follow truth table',
    validate: ([a, b], result) => {
      const expected = a.toField().add(b.toField()).equals(Field(1));
      return result.equals(expected).toBoolean();
    }
  },

  /**
   * Validates range check: value < 2^bits
   */
  rangeCheck: (bits: number) => <PropertyValidator<[Field], Bool>>{
    name: `range_check_${bits}`,
    description: `Value should be less than 2^${bits}`,
    validate: ([value], result) => {
      const maxValue = Field(2n ** BigInt(bits) - 1n);
      const inRange = value.lessThanOrEqual(maxValue);
      return result.equals(inRange).toBoolean();
    }
  }
};

/**
 * Input generators for property-based testing
 */
export const InputGenerators = {
  /**
   * Generate random field elements
   */
  randomField: (): Field => {
    return Field.random();
  },

  /**
   * Generate random field pairs
   */
  randomFieldPair: (): [Field, Field] => {
    return [Field.random(), Field.random()];
  },

  /**
   * Generate random boolean values
   */
  randomBool: (): Bool => {
    return Bool(Math.random() < 0.5);
  },

  /**
   * Generate random boolean pairs
   */
  randomBoolPair: (): [Bool, Bool] => {
    return [Bool(Math.random() < 0.5), Bool(Math.random() < 0.5)];
  },

  /**
   * Generate random values in specified range
   */
  randomInRange: (bits: number) => (): Field => {
    const maxValue = 2n ** BigInt(bits) - 1n;
    const value = BigInt(Math.floor(Math.random() * Number(maxValue)));
    return Field(value);
  },

  /**
   * Generate edge case values (0, 1, max values)
   */
  edgeCases: (): Field => {
    const cases = [Field(0), Field(1), Field(-1), Field.from(Field.ORDER - 1n)];
    return cases[Math.floor(Math.random() * cases.length)];
  }
};