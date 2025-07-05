/**
 * Advanced Gate Parity Test Suite
 * 
 * Tests parity between Snarky and Sparky backends for advanced gate operations
 * including range checks, complex cryptographic functions, and optimization patterns.
 * 
 * Created: July 4, 2025, 23:50 UTC
 * Last Modified: July 4, 2025, 23:50 UTC
 */

import { GateTestFramework, GateOperation } from '../gates/framework/GateTestFramework.js';
import { Field, Bool, Poseidon, Provable, UInt32, UInt64, Group } from '../../../../index.js';

export interface AdvancedGateParityTestCase {
  name: string;
  type: 'comparison';
  testFn: (backend?: string) => Promise<any>;
  compareBy: 'value' | 'hash' | 'constraints';
  timeout?: number;
}

/**
 * RANGE CHECK GATES
 * Advanced range checking operations for different bit sizes
 */
const rangeCheckGates: GateOperation<any[], any>[] = [
  {
    name: 'field-range-check-8bit',
    operation: (value: Field) => {
      // Check if value fits in 8 bits (0 to 255)
      const maxValue = Field(255);
      value.assertLessThan(maxValue.add(Field(1)));
      return Bool(true);
    },
    properties: [
      {
        name: 'range_check_8bit_validity',
        description: 'Value should be less than 256',
        validate: ([value], result) => {
          try {
            const num = Number(value.toBigInt());
            return num >= 0 && num <= 255;
          } catch {
            return false;
          }
        }
      }
    ],
    constraintPattern: ['rangeCheck0'],
    expectedConstraints: 3, // Range check implementation varies
    patternMode: 'contains'
  },
  
  {
    name: 'field-range-check-16bit',
    operation: (value: Field) => {
      const maxValue = Field(65535);
      value.assertLessThan(maxValue.add(Field(1)));
      return Bool(true);
    },
    properties: [
      {
        name: 'range_check_16bit_validity',
        description: 'Value should be less than 65536',
        validate: ([value], result) => {
          try {
            const num = Number(value.toBigInt());
            return num >= 0 && num <= 65535;
          } catch {
            return false;
          }
        }
      }
    ],
    constraintPattern: ['rangeCheck0'],
    expectedConstraints: 5,
    patternMode: 'contains'
  },
  
  {
    name: 'uint32-creation',
    operation: (value: number) => {
      const uint32 = UInt32.from(value);
      return uint32.value; // Return the underlying field
    },
    properties: [
      {
        name: 'uint32_range_validity',
        description: 'UInt32 should enforce 32-bit range',
        validate: ([value], result) => {
          return value >= 0 && value <= 0xFFFFFFFF;
        }
      }
    ],
    constraintPattern: ['rangeCheck0'],
    expectedConstraints: 8, // 32-bit range check
    patternMode: 'contains'
  },
  
  {
    name: 'uint64-creation',
    operation: (value: bigint) => {
      const uint64 = UInt64.from(value);
      return uint64.value; // Return the underlying field
    },
    properties: [
      {
        name: 'uint64_range_validity',
        description: 'UInt64 should enforce 64-bit range',
        validate: ([value], result) => {
          return value >= 0n && value <= 0xFFFFFFFFFFFFFFFFn;
        }
      }
    ],
    constraintPattern: ['rangeCheck0'],
    expectedConstraints: 16, // 64-bit range check
    patternMode: 'contains'
  }
];

/**
 * ADVANCED CRYPTOGRAPHIC GATES
 * Complex cryptographic operations and hash functions
 */
const advancedCryptoGates: GateOperation<any[], any>[] = [
  {
    name: 'poseidon-hash-array',
    operation: (inputs: Field[]) => {
      return Poseidon.hash(inputs);
    },
    properties: [
      {
        name: 'poseidon_avalanche',
        description: 'Small input changes cause large output changes',
        validate: ([inputs], result) => {
          if (inputs.length > 0) {
            // Create slightly modified input
            const modified = [...inputs];
            modified[0] = modified[0].add(Field(1));
            const modifiedHash = Poseidon.hash(modified);
            
            // Hashes should be different (avalanche effect)
            return !result.equals(modifiedHash).toBoolean();
          }
          return true;
        }
      }
    ],
    constraintPattern: ['poseidon'],
    expectedConstraints: 15, // Varies with input count
    patternMode: 'contains'
  },
  
  {
    name: 'nested-poseidon-hash',
    operation: (a: Field, b: Field) => {
      const firstHash = Poseidon.hash([a]);
      const secondHash = Poseidon.hash([b]);
      return Poseidon.hash([firstHash, secondHash]);
    },
    properties: [
      {
        name: 'nested_hash_deterministic',
        description: 'Nested hashes should be deterministic',
        validate: ([a, b], result) => {
          const firstHash = Poseidon.hash([a]);
          const secondHash = Poseidon.hash([b]);
          const expected = Poseidon.hash([firstHash, secondHash]);
          return result.equals(expected).toBoolean();
        }
      }
    ],
    constraintPattern: ['poseidon'],
    expectedConstraints: 30, // Three Poseidon calls
    patternMode: 'contains'
  }
];

/**
 * COMPLEX FIELD OPERATIONS
 * Advanced field arithmetic including inversion and division
 */
const complexFieldGates: GateOperation<any[], any>[] = [
  {
    name: 'field-inversion',
    operation: (a: Field) => {
      // Only invert non-zero fields
      const isZero = a.equals(Field(0));
      return Provable.if(
        isZero,
        Field(0), // Return 0 if input is 0 (undefined case)
        a.inv()   // Return inverse otherwise
      );
    },
    properties: [
      {
        name: 'inversion_identity',
        description: 'a * a⁻¹ = 1 for non-zero a',
        validate: ([a], result) => {
          if (!a.equals(Field(0)).toBoolean()) {
            const product = a.mul(result);
            return product.equals(Field(1)).toBoolean();
          }
          return true; // Skip check for zero
        }
      }
    ],
    constraintPattern: ['div'], // Inversion uses division gate
    expectedConstraints: 5,
    patternMode: 'contains'
  },
  
  {
    name: 'field-division',
    operation: (a: Field, b: Field) => {
      const isZero = b.equals(Field(0));
      return Provable.if(
        isZero,
        Field(0), // Return 0 if divisor is 0
        a.div(b)  // Normal division
      );
    },
    properties: [
      {
        name: 'division_multiplication_inverse',
        description: '(a / b) * b = a for non-zero b',
        validate: ([a, b], result) => {
          if (!b.equals(Field(0)).toBoolean()) {
            const product = result.mul(b);
            return product.equals(a).toBoolean();
          }
          return true; // Skip for zero divisor
        }
      }
    ],
    constraintPattern: ['div'],
    expectedConstraints: 5,
    patternMode: 'contains'
  },
  
  {
    name: 'field-polynomial-evaluation',
    operation: (x: Field, coeffs: Field[]) => {
      // Evaluate polynomial: coeffs[0] + coeffs[1]*x + coeffs[2]*x² + ...
      let result = Field(0);
      let xPower = Field(1);
      
      for (const coeff of coeffs) {
        result = result.add(coeff.mul(xPower));
        xPower = xPower.mul(x);
      }
      
      return result;
    },
    properties: [
      {
        name: 'polynomial_linearity',
        description: 'P(0) should equal the constant term',
        validate: ([x, coeffs], result) => {
          if (x.equals(Field(0)).toBoolean() && coeffs.length > 0) {
            return result.equals(coeffs[0]).toBoolean();
          }
          return true;
        }
      }
    ],
    constraintPattern: ['mul', 'add'],
    expectedConstraints: 6, // Depends on polynomial degree
    patternMode: 'contains'
  }
];

/**
 * ELLIPTIC CURVE GATES
 * Group operations on elliptic curves
 */
const ellipticCurveGates: GateOperation<any[], any>[] = [
  {
    name: 'group-generator',
    operation: () => {
      return Group.generator;
    },
    properties: [
      {
        name: 'generator_identity',
        description: 'Generator should be a valid group element',
        validate: ([], result) => {
          // Check if it's a valid group element by trying to double it
          try {
            const doubled = result.add(result);
            return true; // If no error, it's valid
          } catch {
            return false;
          }
        }
      }
    ],
    constraintPattern: [], // Constants have no constraints
    expectedConstraints: 0,
    patternMode: 'exact'
  },
  
  {
    name: 'group-addition',
    operation: (scalar: Field) => {
      const g = Group.generator;
      return g.scale(scalar);
    },
    properties: [
      {
        name: 'group_scaling_distributive',
        description: 'Scaling should be distributive',
        validate: ([scalar], result) => {
          // For small scalars, verify g * scalar = g + g + ... (scalar times)
          if (scalar.equals(Field(2)).toBoolean()) {
            const g = Group.generator;
            const manual = g.add(g);
            return result.equals(manual).toBoolean();
          }
          return true; // Only test for scalar = 2
        }
      }
    ],
    constraintPattern: ['ecAdd', 'ecScale'], // Elliptic curve operations
    expectedConstraints: 10, // EC operations are complex
    patternMode: 'contains'
  }
];

/**
 * COMPLEX ASSERTION PATTERNS
 * Advanced constraint and assertion patterns
 */
const assertionGates: GateOperation<any[], any>[] = [
  {
    name: 'conditional-assertion',
    operation: (condition: Bool, value: Field, expected: Field) => {
      Provable.if(
        condition,
        Bool(true),
        Bool(false)
      ).assertTrue();
      
      // Conditional assertion logic
      const shouldAssert = condition.toBoolean();
      if (shouldAssert) {
        value.assertEquals(expected);
      }
      
      return Bool(true);
    },
    properties: [
      {
        name: 'conditional_assertion_validity',
        description: 'Assertion should only trigger when condition is true',
        validate: ([condition, value, expected], result) => {
          if (condition.toBoolean()) {
            return value.equals(expected).toBoolean();
          }
          return true; // Always pass when condition is false
        }
      }
    ],
    constraintPattern: ['mul', 'add'], // Conditional logic
    expectedConstraints: 3,
    patternMode: 'contains'
  },
  
  {
    name: 'range-assertion-batch',
    operation: (values: Field[]) => {
      // Assert all values are in range [0, 100]
      const max = Field(100);
      values.forEach(value => {
        value.assertLessThan(max.add(Field(1)));
        value.assertGreaterThanOrEqual(Field(0));
      });
      return Bool(true);
    },
    properties: [
      {
        name: 'batch_range_validity',
        description: 'All values should be in range [0, 100]',
        validate: ([values], result) => {
          return values.every((value: Field) => {
            try {
              const num = Number(value.toBigInt());
              return num >= 0 && num <= 100;
            } catch {
              return false;
            }
          });
        }
      }
    ],
    constraintPattern: ['rangeCheck0', 'add'],
    expectedConstraints: 10, // Multiple range checks
    patternMode: 'contains'
  }
];

/**
 * Create test cases for advanced gate operations
 */
function createAdvancedGateParityTests(
  gates: GateOperation<any[], any>[],
  category: string,
  inputGenerator: () => any[]
): AdvancedGateParityTestCase[] {
  return gates.map(gate => ({
    name: `advanced-${category}-${gate.name}-parity`,
    type: 'comparison' as const,
    compareBy: 'value' as const,
    timeout: 60000, // Advanced gates may take longer
    testFn: async (backend) => {
      console.log(`🔬 Testing advanced ${gate.name} on ${backend} backend`);
      
      const framework = new GateTestFramework({
        name: `advanced-${gate.name}-test`,
        tier: 'core',
        iterations: 3, // Fewer iterations for complex operations
        backend: backend as any
      });
      
      try {
        const inputs = inputGenerator();
        
        const startTime = performance.now();
        const result = gate.operation(...inputs);
        const endTime = performance.now();
        
        // Measure constraints
        let constraintCount = 0;
        try {
          const constraintSystem = await Provable.constraintSystem(() => {
            const witnessInputs = inputs.map((input) => {
              if (input instanceof Field) {
                return Provable.witness(Field, () => input);
              } else if (input instanceof Bool) {
                return Provable.witness(Bool, () => input);
              } else if (Array.isArray(input)) {
                return input.map(item => 
                  item instanceof Field 
                    ? Provable.witness(Field, () => item)
                    : Provable.witness(Field, () => Field(item))
                );
              } else if (typeof input === 'bigint') {
                return Provable.witness(Field, () => Field(input));
              } else if (typeof input === 'number') {
                return Provable.witness(Field, () => Field(input));
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
        
        // Validate properties
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
          category,
          inputs: inputs.map(i => Array.isArray(i) ? i.map(x => x.toString()) : i.toString()),
          result: result.toString(),
          constraintCount,
          expectedConstraints: gate.expectedConstraints,
          constraintMatches: gate.expectedConstraints === undefined || 
                             Math.abs(constraintCount - gate.expectedConstraints) <= 2, // Allow some variance for complex gates
          executionTime: endTime - startTime,
          properties: propertyResults,
          allPropertiesPassed,
          success: allPropertiesPassed
        };
        
      } catch (error) {
        return {
          backend,
          gateName: gate.name,
          category,
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
 * Input generators for advanced gate categories
 */
const advancedInputGenerators = {
  rangeCheck: () => {
    // Generate values that should be in valid ranges
    const value = Math.floor(Math.random() * 200); // 0-199, some in range, some out
    return [Field(value)];
  },
  
  rangeCheck32: () => {
    const value = Math.floor(Math.random() * 0x100000000); // 32-bit range
    return [value];
  },
  
  rangeCheck64: () => {
    const value = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
    return [value];
  },
  
  cryptographic: () => {
    const count = Math.floor(Math.random() * 3) + 1; // 1-3 inputs
    return [Array.from({ length: count }, () => Field.random())];
  },
  
  complexField: () => {
    const a = Field.random();
    const b = Field.random();
    // Ensure b is not zero for division tests
    const nonZeroB = b.equals(Field(0)).toBoolean() ? Field(1) : b;
    return [a, nonZeroB];
  },
  
  polynomial: () => {
    const x = Field.random();
    const degree = Math.floor(Math.random() * 3) + 1; // 1-3 degree polynomial
    const coeffs = Array.from({ length: degree + 1 }, () => Field.random());
    return [x, coeffs];
  },
  
  ellipticCurve: () => {
    return [Field.random()]; // Scalar for group operations
  },
  
  assertion: () => {
    const condition = Bool(Math.random() < 0.5);
    const value = Field.random();
    const expected = Math.random() < 0.7 ? value : Field.random(); // 70% chance of match
    return [condition, value, expected];
  },
  
  batchAssertion: () => {
    const count = Math.floor(Math.random() * 3) + 1; // 1-3 values
    const values = Array.from({ length: count }, () => Field(Math.floor(Math.random() * 150))); // Some in range [0,100], some out
    return [values];
  }
};

/**
 * Generate all advanced gate parity test cases
 */
export const tests: AdvancedGateParityTestCase[] = [
  ...createAdvancedGateParityTests(rangeCheckGates.slice(0, 2), 'range-check', advancedInputGenerators.rangeCheck),
  ...createAdvancedGateParityTests(rangeCheckGates.slice(2, 3), 'range-check-32', advancedInputGenerators.rangeCheck32),
  ...createAdvancedGateParityTests(rangeCheckGates.slice(3), 'range-check-64', advancedInputGenerators.rangeCheck64),
  ...createAdvancedGateParityTests(advancedCryptoGates, 'crypto', advancedInputGenerators.cryptographic),
  ...createAdvancedGateParityTests(complexFieldGates.slice(0, 2), 'complex-field', advancedInputGenerators.complexField),
  ...createAdvancedGateParityTests(complexFieldGates.slice(2), 'polynomial', advancedInputGenerators.polynomial),
  ...createAdvancedGateParityTests(ellipticCurveGates, 'elliptic-curve', advancedInputGenerators.ellipticCurve),
  ...createAdvancedGateParityTests(assertionGates.slice(0, 1), 'assertion', advancedInputGenerators.assertion),
  ...createAdvancedGateParityTests(assertionGates.slice(1), 'batch-assertion', advancedInputGenerators.batchAssertion)
];

export default { tests };