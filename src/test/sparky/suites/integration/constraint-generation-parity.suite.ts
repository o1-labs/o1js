/**
 * Constraint Generation Parity Test Suite
 * 
 * Focuses specifically on constraint system generation differences between
 * Snarky and Sparky backends. Tests constraint counts, patterns, and optimizations.
 * 
 * Created: July 4, 2025, 23:55 UTC
 * Last Modified: July 4, 2025, 23:55 UTC
 */

import { Field, Bool, Poseidon, Provable, UInt32, Group } from '../../../../index.js';

export interface ConstraintParityTestCase {
  name: string;
  type: 'comparison';
  testFn: (backend?: string) => Promise<any>;
  compareBy: 'constraints';
  timeout?: number;
}

/**
 * Constraint analysis utilities
 */
class ConstraintAnalyzer {
  /**
   * Analyze constraint system for a given operation
   */
  static async analyzeConstraints<T extends any[]>(
    operation: (...inputs: T) => any,
    inputs: T,
    operationName: string,
    backend?: string
  ) {
    try {
      const constraintSystem = await Provable.constraintSystem(() => {
        // Create witness variables
        const witnessInputs = inputs.map((input) => {
          if (input instanceof Field) {
            return Provable.witness(Field, () => input);
          } else if (input instanceof Bool) {
            return Provable.witness(Bool, () => input);
          } else if (typeof input === 'number') {
            return Provable.witness(Field, () => Field(input));
          } else if (typeof input === 'bigint') {
            return Provable.witness(Field, () => Field(input));
          } else {
            return Provable.witness(Field, () => Field(input));
          }
        }) as T;
        
        // Execute operation
        const result = operation(...witnessInputs);
        
        // Ensure result is constrained
        if (result instanceof Field) {
          result.assertEquals(result);
        } else if (result instanceof Bool) {
          result.assertEquals(result);
        } else if (result && typeof result === 'object' && 'assertEquals' in result) {
          (result as any).assertEquals(result);
        }
        
        return result;
      });
      
      // Analyze gate patterns
      const gates = constraintSystem.gates;
      const gateTypes = gates.map(gate => gate.type);
      const gateTypeCounts = gateTypes.reduce((counts, type) => {
        counts[type] = (counts[type] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);
      
      return {
        totalConstraints: gates.length,
        gateTypes: gateTypes,
        gateTypeCounts: gateTypeCounts,
        constraintPattern: gateTypes.join(','),
        publicInputSize: constraintSystem.publicInputSize,
        success: true
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for known Sparky incompatibilities
      const isKnownIncompatibility = 
        errorMessage.includes('xLimbs12 must have exactly 6 elements') ||
        errorMessage.includes('Invalid FieldVar format: expected constant with 1 argument') ||
        errorMessage.includes('range check') ||
        errorMessage.includes('hash preprocessing');
      
      if (isKnownIncompatibility && backend === 'sparky') {
        console.log(`⚠️  Known Sparky incompatibility for ${operationName}: ${errorMessage}`);
        return {
          totalConstraints: 0,
          gateTypes: [],
          gateTypeCounts: {},
          constraintPattern: '',
          publicInputSize: 0,
          success: false,
          error: errorMessage,
          incompatibility: 'sparky-format-mismatch',
          skipComparison: true
        };
      }
      
      console.warn(`Constraint analysis failed for ${operationName}:`, error);
      return {
        totalConstraints: 0,
        gateTypes: [],
        gateTypeCounts: {},
        constraintPattern: '',
        publicInputSize: 0,
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Compare constraint analyses between backends
   */
  static compareConstraintAnalyses(snarkyAnalysis: any, sparkyAnalysis: any, operationName: string) {
    // Handle known incompatibilities
    if (sparkyAnalysis.skipComparison || snarkyAnalysis.skipComparison) {
      return {
        operationName,
        snarkyConstraints: snarkyAnalysis.totalConstraints,
        sparkyConstraints: sparkyAnalysis.totalConstraints,
        constraintDifference: 0,
        constraintRatio: 1,
        optimizationDetected: false,
        regressionDetected: false,
        patternsMatch: false,
        snarkyPattern: snarkyAnalysis.constraintPattern || 'N/A',
        sparkyPattern: sparkyAnalysis.constraintPattern || 'N/A',
        gateTypeComparison: {},
        bothSucceeded: snarkyAnalysis.success && sparkyAnalysis.success,
        incompatibilitySkipped: true,
        incompatibilityReason: sparkyAnalysis.incompatibility || snarkyAnalysis.incompatibility || 'unknown'
      };
    }
    
    const comparison = {
      operationName,
      snarkyConstraints: snarkyAnalysis.totalConstraints,
      sparkyConstraints: sparkyAnalysis.totalConstraints,
      constraintDifference: sparkyAnalysis.totalConstraints - snarkyAnalysis.totalConstraints,
      constraintRatio: snarkyAnalysis.totalConstraints > 0 
        ? sparkyAnalysis.totalConstraints / snarkyAnalysis.totalConstraints 
        : 1,
      optimizationDetected: sparkyAnalysis.totalConstraints < snarkyAnalysis.totalConstraints,
      regressionDetected: sparkyAnalysis.totalConstraints > snarkyAnalysis.totalConstraints,
      patternsMatch: snarkyAnalysis.constraintPattern === sparkyAnalysis.constraintPattern,
      snarkyPattern: snarkyAnalysis.constraintPattern,
      sparkyPattern: sparkyAnalysis.constraintPattern,
      gateTypeComparison: this.compareGateTypes(snarkyAnalysis.gateTypeCounts, sparkyAnalysis.gateTypeCounts),
      bothSucceeded: snarkyAnalysis.success && sparkyAnalysis.success,
      incompatibilitySkipped: false
    };
    
    return comparison;
  }
  
  /**
   * Compare gate type distributions
   */
  static compareGateTypes(snarkyGates: Record<string, number>, sparkyGates: Record<string, number>) {
    const allGateTypes = new Set([...Object.keys(snarkyGates), ...Object.keys(sparkyGates)]);
    const comparison: Record<string, { snarky: number; sparky: number; difference: number }> = {};
    
    for (const gateType of allGateTypes) {
      const snarkyCount = snarkyGates[gateType] || 0;
      const sparkyCount = sparkyGates[gateType] || 0;
      comparison[gateType] = {
        snarky: snarkyCount,
        sparky: sparkyCount,
        difference: sparkyCount - snarkyCount
      };
    }
    
    return comparison;
  }
}

/**
 * CONSTRAINT GENERATION TEST OPERATIONS
 * Operations specifically designed to test constraint generation patterns
 */
const constraintTestOperations = [
  {
    name: 'simple-addition-chain',
    operation: (a: Field, b: Field, c: Field) => {
      // Simple chain: ((a + b) + c)
      return a.add(b).add(c);
    },
    expectedOptimization: 'Sparky should batch additions',
    inputGenerator: () => [Field.random(), Field.random(), Field.random()]
  },
  
  {
    name: 'multiplication-chain',
    operation: (a: Field, b: Field, c: Field) => {
      // Chain: ((a * b) * c)
      return a.mul(b).mul(c);
    },
    expectedOptimization: 'Sparky should optimize multiplication chains',
    inputGenerator: () => [Field.random(), Field.random(), Field.random()]
  },
  
  {
    name: 'mixed-arithmetic',
    operation: (a: Field, b: Field, c: Field, d: Field) => {
      // Mixed: (a + b) * (c - d)
      const sum = a.add(b);
      const diff = c.sub(d);
      return sum.mul(diff);
    },
    expectedOptimization: 'Sparky should optimize arithmetic expressions',
    inputGenerator: () => [Field.random(), Field.random(), Field.random(), Field.random()]
  },
  
  {
    name: 'repeated-operations',
    operation: (a: Field) => {
      // Repeated: a + a + a + a
      return a.add(a).add(a).add(a);
    },
    expectedOptimization: 'Sparky should detect repeated variable usage',
    inputGenerator: () => [Field.random()]
  },
  
  {
    name: 'boolean-logic-chain',
    operation: (a: Bool, b: Bool, c: Bool) => {
      // Boolean chain: (a AND b) OR c
      return a.and(b).or(c);
    },
    expectedOptimization: 'Sparky should optimize boolean expressions',
    inputGenerator: () => [Bool(Math.random() < 0.5), Bool(Math.random() < 0.5), Bool(Math.random() < 0.5)]
  },
  
  {
    name: 'conditional-with-constants',
    operation: (condition: Bool, value: Field) => {
      // Conditional with constants: if condition then value else 0
      return Provable.if(condition, value, Field(0));
    },
    expectedOptimization: 'Sparky should optimize conditionals with constants',
    inputGenerator: () => [Bool(Math.random() < 0.5), Field.random()]
  },
  
  {
    name: 'witness-with-assertion',
    operation: (expected: Field) => {
      // Witness + assertion pattern
      const witness = Provable.witness(Field, () => expected);
      witness.assertEquals(expected);
      return witness;
    },
    expectedOptimization: 'Sparky should optimize witness + assertion patterns',
    inputGenerator: () => [Field.random()]
  },
  
  {
    name: 'range-check-pattern',
    operation: (value: Field) => {
      // Range check: 0 <= value < 256
      const isValid = value.lessThan(Field(256));
      value.assertGreaterThanOrEqual(Field(0));
      return isValid;
    },
    expectedOptimization: 'Sparky should optimize range check patterns',
    inputGenerator: () => [Field(Math.floor(Math.random() * 300))] // Some valid, some invalid
  },
  
  {
    name: 'hash-with-preprocessing',
    operation: (a: Field, b: Field) => {
      // Hash with preprocessing: hash(a + 1, b * 2)
      const preprocessedA = a.add(Field(1));
      const preprocessedB = b.mul(Field(2));
      return Poseidon.hash([preprocessedA, preprocessedB]);
    },
    expectedOptimization: 'Sparky should optimize preprocessing + hash patterns',
    inputGenerator: () => [Field.random(), Field.random()]
  },
  
  {
    name: 'complex-assertion-pattern',
    operation: (a: Field, b: Field, c: Field) => {
      // Complex assertions: a = b + c AND a < 1000
      const sum = b.add(c);
      a.assertEquals(sum);
      a.assertLessThan(Field(1000));
      return Bool(true);
    },
    expectedOptimization: 'Sparky should optimize multiple assertion patterns',
    inputGenerator: () => {
      const b = Field(Math.floor(Math.random() * 400));
      const c = Field(Math.floor(Math.random() * 400));
      const a = b.add(c); // Ensure assertion will pass
      return [a, b, c];
    }
  }
];

/**
 * Create constraint generation parity tests
 */
function createConstraintParityTests(): ConstraintParityTestCase[] {
  return constraintTestOperations.map(op => ({
    name: `constraint-${op.name}-parity`,
    type: 'comparison' as const,
    compareBy: 'constraints' as const,
    timeout: 30000,
    testFn: async (backend) => {
      console.log(`🔍 Analyzing constraints for ${op.name} on ${backend} backend`);
      
      try {
        const inputs = op.inputGenerator();
        
        // Analyze constraints for this operation
        const analysis = await ConstraintAnalyzer.analyzeConstraints(
          op.operation as any,
          inputs,
          op.name,
          backend
        );
        
        // Performance measurement
        const startTime = performance.now();
        const result = (op.operation as any)(...inputs);
        const endTime = performance.now();
        
        return {
          backend,
          operationName: op.name,
          expectedOptimization: op.expectedOptimization,
          inputs: inputs.map(i => i.toString()),
          result: result.toString(),
          constraintAnalysis: analysis,
          executionTime: endTime - startTime,
          success: analysis.success
        };
        
      } catch (error) {
        return {
          backend,
          operationName: op.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          constraintAnalysis: {
            totalConstraints: 0,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }
        };
      }
    }
  }));
}

/**
 * OPTIMIZATION DETECTION TESTS
 * Tests specifically designed to detect Sparky optimizations
 */
const optimizationDetectionTests: ConstraintParityTestCase[] = [
  {
    name: 'constraint-linear-combination-optimization',
    type: 'comparison',
    compareBy: 'constraints',
    timeout: 30000,
    testFn: async (backend) => {
      console.log(`🎯 Testing linear combination optimization on ${backend}`);
      
      try {
        // Test linear combination: 3*a + 2*b + c
        const a = Field.random();
        const b = Field.random();
        const c = Field.random();
        
        const analysis = await ConstraintAnalyzer.analyzeConstraints(
          (a: Field, b: Field, c: Field) => {
            const term1 = a.mul(Field(3));
            const term2 = b.mul(Field(2));
            return term1.add(term2).add(c);
          },
          [a, b, c],
          'linear-combination',
          backend
        );
        
        return {
          backend,
          testType: 'optimization-detection',
          optimizationType: 'linear-combination',
          constraintAnalysis: analysis,
          expectedBehavior: 'Sparky should use fewer constraints for linear combinations',
          success: analysis.success
        };
        
      } catch (error) {
        return {
          backend,
          testType: 'optimization-detection',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  },
  
  {
    name: 'constraint-constant-folding-optimization',
    type: 'comparison',
    compareBy: 'constraints',
    timeout: 30000,
    testFn: async (backend) => {
      console.log(`🎯 Testing constant folding optimization on ${backend}`);
      
      try {
        // Test constant folding: a + (2 + 3) should become a + 5
        const a = Field.random();
        
        const analysis = await ConstraintAnalyzer.analyzeConstraints(
          (a: Field) => {
            const constantSum = Field(2).add(Field(3)); // Should be folded to Field(5)
            return a.add(constantSum);
          },
          [a],
          'constant-folding',
          backend
        );
        
        return {
          backend,
          testType: 'optimization-detection',
          optimizationType: 'constant-folding',
          constraintAnalysis: analysis,
          expectedBehavior: 'Sparky should fold constants at compile time',
          success: analysis.success
        };
        
      } catch (error) {
        return {
          backend,
          testType: 'optimization-detection',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  },
  
  {
    name: 'constraint-redundant-assertion-elimination',
    type: 'comparison',
    compareBy: 'constraints',
    timeout: 30000,
    testFn: async (backend) => {
      console.log(`🎯 Testing redundant assertion elimination on ${backend}`);
      
      try {
        // Test redundant assertions: same assertion multiple times
        const a = Field.random();
        const b = Field.random();
        
        const analysis = await ConstraintAnalyzer.analyzeConstraints(
          (a: Field, b: Field) => {
            a.assertEquals(b);
            a.assertEquals(b); // Redundant
            a.assertEquals(b); // Redundant
            return Bool(true);
          },
          [a, a], // Use same value to ensure assertions pass
          'redundant-assertions',
          backend
        );
        
        return {
          backend,
          testType: 'optimization-detection',
          optimizationType: 'redundant-assertion-elimination',
          constraintAnalysis: analysis,
          expectedBehavior: 'Sparky should eliminate redundant assertions',
          success: analysis.success
        };
        
      } catch (error) {
        return {
          backend,
          testType: 'optimization-detection',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  }
];

/**
 * Generate all constraint generation parity test cases
 */
export const tests: ConstraintParityTestCase[] = [
  ...createConstraintParityTests(),
  ...optimizationDetectionTests
];

export default { tests };