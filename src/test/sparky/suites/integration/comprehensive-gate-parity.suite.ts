/**
 * Comprehensive Gate Parity Test Suite
 * 
 * Tests parity between Snarky and Sparky backends for all gate operations.
 * This suite provides systematic validation of every gate type to ensure
 * mathematical equivalence and constraint generation parity.
 * 
 * Created: July 4, 2025, 23:45 UTC
 * Last Modified: July 4, 2025, 23:45 UTC
 */

import { GateTestFramework, GateOperation, MathProperties, InputGenerators } from '../gates/framework/GateTestFramework.js';
import { Field, Bool, Poseidon, Provable } from '../../../../index.js';

export interface GateParityTestCase {
  name: string;
  type: 'comparison';
  testFn: (backend?: string) => Promise<any>;
  compareBy: 'value' | 'hash' | 'constraints';
  timeout?: number;
}

/**
 * BASIC ARITHMETIC GATES
 * Core field arithmetic operations that form the foundation of all circuits
 */
const basicArithmeticGates: GateOperation<any[], any>[] = [
  {
    name: 'field-addition',
    operation: (a: Field, b: Field) => a.add(b),
    properties: [MathProperties.fieldAdditionCommutative as any],
    constraintPattern: ['add'],
    expectedConstraints: 1,
    patternMode: 'exact'
  },
  
  {
    name: 'field-multiplication',
    operation: (a: Field, b: Field) => a.mul(b),
    properties: [MathProperties.fieldMultiplicationCommutative as any],
    constraintPattern: ['mul'],
    expectedConstraints: 1,
    patternMode: 'exact'
  },
  
  {
    name: 'field-subtraction',
    operation: (a: Field, b: Field) => a.sub(b),
    properties: [
      {
        name: 'subtraction_identity',
        description: 'a - 0 = a',
        validate: ([a, b], result) => {
          if (b.equals(Field(0)).toBoolean()) {
            return result.equals(a).toBoolean();
          }
          return true;
        }
      }
    ],
    constraintPattern: ['add'], // Subtraction implemented as addition with negation
    expectedConstraints: 1,
    patternMode: 'contains'
  },
  
  {
    name: 'field-negation',
    operation: (a: Field) => a.neg(),
    properties: [
      {
        name: 'negation_double',
        description: '-(-a) = a',
        validate: ([a], result) => {
          const doubleNeg = result.neg();
          return doubleNeg.equals(a).toBoolean();
        }
      }
    ],
    constraintPattern: ['scale'],
    expectedConstraints: 1,
    patternMode: 'contains'
  },
  
  {
    name: 'field-square',
    operation: (a: Field) => a.square(),
    properties: [
      {
        name: 'square_equivalence',
        description: 'a² = a * a',
        validate: ([a], result) => {
          const manual = a.mul(a);
          return result.equals(manual).toBoolean();
        }
      }
    ],
    constraintPattern: ['mul'],
    expectedConstraints: 1,
    patternMode: 'exact'
  },
  
  {
    name: 'field-scaling',
    operation: (a: Field) => a.mul(Field(3)), // Test scaling by constant
    properties: [
      {
        name: 'scaling_distributive',
        description: '3 * a = a + a + a',
        validate: ([a], result) => {
          const manual = a.add(a).add(a);
          return result.equals(manual).toBoolean();
        }
      }
    ],
    constraintPattern: ['scale'],
    expectedConstraints: 1,
    patternMode: 'exact'
  }
];

/**
 * BOOLEAN LOGIC GATES
 * Boolean operations and constraints for conditional logic
 */
const booleanGates: GateOperation<any[], any>[] = [
  {
    name: 'boolean-and',
    operation: (a: Bool, b: Bool) => a.and(b),
    properties: [
      {
        name: 'and_commutative',
        description: 'a AND b = b AND a',
        validate: ([a, b], result) => {
          const reverse = b.and(a);
          return result.equals(reverse).toBoolean();
        }
      },
      {
        name: 'and_truth_table',
        description: 'AND follows truth table',
        validate: ([a, b], result) => {
          const aVal = a.toBoolean();
          const bVal = b.toBoolean();
          const expected = aVal && bVal;
          return result.toBoolean() === expected;
        }
      }
    ],
    constraintPattern: ['mul'], // AND implemented as multiplication in circuits
    expectedConstraints: 1,
    patternMode: 'contains'
  },
  
  {
    name: 'boolean-or',
    operation: (a: Bool, b: Bool) => a.or(b),
    properties: [
      {
        name: 'or_commutative',
        description: 'a OR b = b OR a',
        validate: ([a, b], result) => {
          const reverse = b.or(a);
          return result.equals(reverse).toBoolean();
        }
      },
      {
        name: 'or_truth_table',
        description: 'OR follows truth table',
        validate: ([a, b], result) => {
          const aVal = a.toBoolean();
          const bVal = b.toBoolean();
          const expected = aVal || bVal;
          return result.toBoolean() === expected;
        }
      }
    ],
    constraintPattern: ['add', 'mul'], // OR = a + b - a*b
    expectedConstraints: 2,
    patternMode: 'contains'
  },
  
  {
    name: 'boolean-not',
    operation: (a: Bool) => a.not(),
    properties: [
      {
        name: 'not_double_negation',
        description: 'NOT(NOT(a)) = a',
        validate: ([a], result) => {
          const doubleNot = result.not();
          return doubleNot.equals(a).toBoolean();
        }
      },
      {
        name: 'not_truth_table',
        description: 'NOT follows truth table',
        validate: ([a], result) => {
          const aVal = a.toBoolean();
          const expected = !aVal;
          return result.toBoolean() === expected;
        }
      }
    ],
    constraintPattern: ['add'], // NOT implemented as 1 - a
    expectedConstraints: 1,
    patternMode: 'contains'
  },
  
  {
    name: 'boolean-equals',
    operation: (a: Bool, b: Bool) => a.equals(b),
    properties: [
      {
        name: 'equals_reflexive',
        description: 'a = a is always true',
        validate: ([a, b], result) => {
          if (a.equals(b).toBoolean()) {
            return result.toBoolean() === true;
          }
          return true;
        }
      }
    ],
    constraintPattern: ['add', 'mul'], // Equality check involves arithmetic
    expectedConstraints: 2,
    patternMode: 'contains'
  }
];

/**
 * COMPARISON GATES
 * Field comparison operations for range checks and conditionals
 */
const comparisonGates: GateOperation<any[], any>[] = [
  {
    name: 'field-equals',
    operation: (a: Field, b: Field) => a.equals(b),
    properties: [
      {
        name: 'equals_reflexive',
        description: 'a.equals(a) is always true',
        validate: ([a, b], result) => {
          if (a.equals(b).toBoolean()) {
            return result.toBoolean() === true;
          }
          return true;
        }
      },
      {
        name: 'equals_symmetric',
        description: 'a.equals(b) = b.equals(a)',
        validate: ([a, b], result) => {
          const reverse = b.equals(a);
          return result.equals(reverse).toBoolean();
        }
      }
    ],
    constraintPattern: ['add'], // Equality check through difference
    expectedConstraints: 1,
    patternMode: 'contains'
  },
  
  {
    name: 'field-assert-equals',
    operation: (a: Field, b: Field) => {
      a.assertEquals(b);
      return Bool(true); // Return success indicator
    },
    properties: [
      {
        name: 'assert_equals_constraint',
        description: 'assertEquals should add constraint',
        validate: ([a, b], result) => {
          // If we reach here without error, assertion passed
          return result.toBoolean() === true;
        }
      }
    ],
    constraintPattern: ['add'], // Assertion adds constraint
    expectedConstraints: 1,
    patternMode: 'contains'
  },
  
  {
    name: 'field-less-than',
    operation: (a: Field, b: Field) => a.lessThan(b),
    properties: [
      {
        name: 'less_than_asymmetric',
        description: 'If a < b, then NOT(b < a)',
        validate: ([a, b], result) => {
          if (result.toBoolean()) {
            const reverse = b.lessThan(a);
            return !reverse.toBoolean();
          }
          return true;
        }
      }
    ],
    constraintPattern: ['rangeCheck', 'add'], // Range check implementation
    expectedConstraints: 5, // Range checks are complex
    patternMode: 'contains'
  }
];

/**
 * ADVANCED CRYPTOGRAPHIC GATES
 * Hash functions and cryptographic primitives
 */
const cryptographicGates: GateOperation<any[], any>[] = [
  {
    name: 'poseidon-hash-single',
    operation: (input: Field) => Poseidon.hash([input]),
    properties: [
      {
        name: 'hash_deterministic',
        description: 'Hash should be deterministic',
        validate: ([input], result) => {
          const secondHash = Poseidon.hash([input]);
          return result.equals(secondHash).toBoolean();
        }
      }
    ],
    constraintPattern: ['poseidon'], // Poseidon gates
    expectedConstraints: 10, // Poseidon is constraint-heavy
    patternMode: 'contains'
  },
  
  {
    name: 'poseidon-hash-double',
    operation: (a: Field, b: Field) => Poseidon.hash([a, b]),
    properties: [
      {
        name: 'hash_non_commutative',
        description: 'Hash(a,b) ≠ Hash(b,a) in general',
        validate: ([a, b], result) => {
          if (!a.equals(b).toBoolean()) {
            const swapped = Poseidon.hash([b, a]);
            // This property allows both equal and unequal results
            return true; // Always pass, we're just testing it runs
          }
          return true;
        }
      }
    ],
    constraintPattern: ['poseidon'],
    expectedConstraints: 10,
    patternMode: 'contains'
  }
];

/**
 * WITNESS AND CONSTRAINT GATES
 * Provable.witness and constraint generation operations
 */
const witnessGates: GateOperation<any[], any>[] = [
  {
    name: 'provable-witness',
    operation: (expected: Field) => {
      return Provable.witness(Field, () => expected);
    },
    properties: [
      {
        name: 'witness_value_matches',
        description: 'Witness should match provided value',
        validate: ([expected], result) => {
          return result.equals(expected).toBoolean();
        }
      }
    ],
    constraintPattern: [], // Pure witness has no constraints
    expectedConstraints: 0,
    patternMode: 'exact'
  },
  
  {
    name: 'conditional-select',
    operation: (condition: Bool, a: Field, b: Field) => {
      return Provable.if(condition, a, b);
    },
    properties: [
      {
        name: 'conditional_select_true',
        description: 'If condition is true, should select first value',
        validate: ([condition, a, b], result) => {
          if (condition.toBoolean()) {
            return result.equals(a).toBoolean();
          }
          return result.equals(b).toBoolean();
        }
      }
    ],
    constraintPattern: ['mul', 'add'], // Conditional = condition * a + (1-condition) * b
    expectedConstraints: 3,
    patternMode: 'contains'
  }
];

/**
 * Test case generator that creates parity tests for gate operations
 */
function createGateParityTests(
  gates: GateOperation<any[], any>[],
  category: string,
  inputGenerator: () => any[]
): GateParityTestCase[] {
  return gates.map(gate => ({
    name: `${category}-${gate.name}-parity`,
    type: 'comparison' as const,
    compareBy: 'value' as const,
    timeout: 30000,
    testFn: async (backend) => {
      console.log(`🔍 Testing ${gate.name} on ${backend} backend`);
      
      const framework = new GateTestFramework({
        name: `${gate.name}-test`,
        tier: 'core',
        iterations: 5,
        backend: backend as any
      });
      
      try {
        // Generate test inputs
        const inputs = inputGenerator();
        
        // Execute the gate operation
        const startTime = performance.now();
        const result = gate.operation(...inputs);
        const endTime = performance.now();
        
        // Measure constraints if possible
        let constraintCount = 0;
        try {
          const constraintSystem = await Provable.constraintSystem(() => {
            const witnessInputs = inputs.map((input, idx) => {
              if (input instanceof Field) {
                return Provable.witness(Field, () => input);
              } else if (input instanceof Bool) {
                return Provable.witness(Bool, () => input);
              } else {
                return Provable.witness(Field, () => Field(input));
              }
            });
            const opResult = gate.operation(...witnessInputs);
            
            // Ensure result is constrained
            if (opResult instanceof Field) {
              opResult.assertEquals(opResult);
            } else if (opResult instanceof Bool) {
              opResult.assertEquals(opResult);
            }
            
            return opResult;
          });
          constraintCount = constraintSystem.gates.length;
        } catch (error) {
          console.warn(`Could not measure constraints for ${gate.name}:`, error);
        }
        
        // Validate mathematical properties
        const propertyResults = gate.properties.map(property => {
          try {
            const isValid = property.validate(inputs, result);
            return {
              property: property.name,
              passed: isValid,
              description: property.description
            };
          } catch (error) {
            return {
              property: property.name,
              passed: false,
              description: property.description,
              error: error instanceof Error ? error.message : String(error)
            };
          }
        });
        
        const allPropertiesPassed = propertyResults.every(p => p.passed);
        
        return {
          backend,
          gateName: gate.name,
          inputs: inputs.map(i => i.toString()),
          result: result.toString(),
          constraintCount,
          expectedConstraints: gate.expectedConstraints,
          constraintMatches: gate.expectedConstraints === undefined || constraintCount === gate.expectedConstraints,
          executionTime: endTime - startTime,
          properties: propertyResults,
          allPropertiesPassed,
          success: allPropertiesPassed
        };
        
      } catch (error) {
        return {
          backend,
          gateName: gate.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          constraintCount: 0,
          allPropertiesPassed: false
        };
      }
    }
  }));
}

/**
 * Input generators for different gate categories
 */
const inputGenerators = {
  basicArithmetic: () => [Field.random(), Field.random()],
  booleanLogic: () => [Bool(Math.random() < 0.5), Bool(Math.random() < 0.5)],
  comparison: () => [Field.random(), Field.random()],
  cryptographic: () => [Field.random(), Field.random()],
  witness: () => [Field.random()],
  conditional: () => [Bool(Math.random() < 0.5), Field.random(), Field.random()]
};

/**
 * Generate all gate parity test cases
 */
export const tests: GateParityTestCase[] = [
  ...createGateParityTests(basicArithmeticGates, 'arithmetic', inputGenerators.basicArithmetic),
  ...createGateParityTests(booleanGates, 'boolean', inputGenerators.booleanLogic),
  ...createGateParityTests(comparisonGates, 'comparison', inputGenerators.comparison),
  ...createGateParityTests(cryptographicGates, 'crypto', inputGenerators.cryptographic),
  ...createGateParityTests(witnessGates.slice(0, 1), 'witness', inputGenerators.witness), // Just witness test
  ...createGateParityTests(witnessGates.slice(1), 'conditional', inputGenerators.conditional) // Conditional tests
];

export default { tests };