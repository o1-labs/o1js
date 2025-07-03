/**
 * RUTHLESS FIELD GENERATORS
 * 
 * Real o1js Field generators for ruthless backend parity testing.
 * These generators produce actual Field values to test real backend behavior.
 */

import fc from 'fast-check';
import { Field, Poseidon, ZkProgram, Provable } from '../../../../dist/node/index.js';

// Field modulus for Pallas curve
const FIELD_MODULUS = 28948022309329048855892746252171976963363056481941560715954676764349967630337n;

/**
 * Real Field value generators for comprehensive testing
 */
export class RuthlessFieldGenerators {
  /**
   * Edge case field values - most likely to expose issues
   */
  static edgeCases(): fc.Arbitrary<Field> {
    const edgeValues = [
      0n,                    // Zero
      1n,                    // One
      2n,                    // Two
      FIELD_MODULUS - 1n,    // Field max
      FIELD_MODULUS - 2n,    // Near field max
      FIELD_HALF,            // Field half
      FIELD_QUARTER,         // Field quarter
    ];
    
    return fc.constantFrom(...edgeValues).map(val => Field(val));
  }
  
  /**
   * Small field values for basic operations
   */
  static small(): fc.Arbitrary<Field> {
    return fc.bigInt({ min: 0n, max: 1000n }).map(val => Field(val));
  }
  
  /**
   * Large field values near modulus boundary
   */
  static large(): fc.Arbitrary<Field> {
    return fc.bigInt({ 
      min: FIELD_MODULUS - 10000n, 
      max: FIELD_MODULUS - 1n 
    }).map(val => Field(val));
  }
  
  /**
   * Random field values across full range
   */
  static random(): fc.Arbitrary<Field> {
    return fc.bigInt({ min: 0n, max: FIELD_MODULUS - 1n }).map(val => Field(val));
  }
  
  /**
   * Non-zero field values for division operations
   */
  static nonZero(): fc.Arbitrary<Field> {
    return fc.oneof(
      this.small().filter(f => !f.equals(Field(0)).toBoolean()),
      this.large(),
      fc.constantFrom(1n, 2n, 42n, 17n).map(val => Field(val))
    );
  }
  
  /**
   * Mixed field values combining all categories
   */
  static any(): fc.Arbitrary<Field> {
    return fc.oneof(
      this.edgeCases(),
      this.small(),
      this.large(), 
      this.random()
    );
  }
  
  /**
   * Pairs of field values for binary operations
   */
  static pairs(): fc.Arbitrary<[Field, Field]> {
    return fc.tuple(this.any(), this.any());
  }
  
  /**
   * Triples of field values for complex operations
   */
  static triples(): fc.Arbitrary<[Field, Field, Field]> {
    return fc.tuple(this.any(), this.any(), this.any());
  }
}

// Field constants
const FIELD_HALF = FIELD_MODULUS / 2n;
const FIELD_QUARTER = FIELD_MODULUS / 4n;

/**
 * Circuit pattern generators for VK parity testing
 */
export class RuthlessCircuitGenerators {
  /**
   * Simple arithmetic circuit patterns
   */
  static simpleArithmetic(): fc.Arbitrary<{
    name: string;
    inputs: [Field, Field];
    operation: (a: Field, b: Field) => Field;
  }> {
    return fc.record({
      name: fc.constantFrom('addition', 'multiplication', 'subtraction'),
      inputs: RuthlessFieldGenerators.pairs(),
      operation: fc.constantFrom(
        (a: Field, b: Field) => a.add(b),
        (a: Field, b: Field) => a.mul(b),
        (a: Field, b: Field) => a.sub(b)
      )
    });
  }
  
  /**
   * Complex expression patterns that often reveal VK differences
   */
  static complexExpressions(): fc.Arbitrary<{
    name: string;
    inputs: [Field, Field, Field];
    operation: (a: Field, b: Field, c: Field) => Field;
  }> {
    return fc.record({
      name: fc.constantFrom(
        'polynomial', 
        'fraction', 
        'nested_arithmetic',
        'conditional_logic'
      ),
      inputs: RuthlessFieldGenerators.triples(),
      operation: fc.constantFrom(
        // a^2 + b^2 + c
        (a: Field, b: Field, c: Field) => a.square().add(b.square()).add(c),
        // (a + b) / (c + 1)
        (a: Field, b: Field, c: Field) => a.add(b).div(c.add(Field(1))),
        // a * (b + c) - (a * b + a * c) [should equal 0]
        (a: Field, b: Field, c: Field) => a.mul(b.add(c)).sub(a.mul(b).add(a.mul(c))),
        // (a > b) ? a : b (conditional using field arithmetic)
        (a: Field, b: Field, c: Field) => {
          const diff = a.sub(b);
          const isPositive = diff.mul(diff.inv()).equals(Field(1));
          return Provable.if(isPositive, a, b);
        }
      )
    });
  }
  
  /**
   * Poseidon hash patterns
   */
  static poseidonPatterns(): fc.Arbitrary<{
    name: string;
    inputs: Field[];
    operation: (inputs: Field[]) => Field;
  }> {
    return fc.record({
      name: fc.constantFrom('single_hash', 'double_hash', 'triple_hash', 'nested_hash'),
      inputs: fc.array(RuthlessFieldGenerators.any(), { minLength: 1, maxLength: 5 }),
      operation: fc.constantFrom(
        (inputs: Field[]) => Poseidon.hash(inputs),
        (inputs: Field[]) => Poseidon.hash([Poseidon.hash(inputs)]),
        (inputs: Field[]) => {
          if (inputs.length >= 2) {
            return Poseidon.hash([inputs[0], Poseidon.hash(inputs.slice(1))]);
          }
          return Poseidon.hash(inputs);
        }
      )
    });
  }
  
  /**
   * ZkProgram circuit generators for VK testing
   */
  static zkProgramCircuits(): fc.Arbitrary<{
    name: string;
    publicInputs: Field[];
    privateInputs: Field[];
    programFactory: (name: string) => any;
  }> {
    return fc.record({
      name: fc.constantFrom(
        'SimpleAdd',
        'SimpleMultiply', 
        'FieldSquare',
        'ComplexArithmetic',
        'PoseidonCircuit'
      ),
      publicInputs: fc.array(RuthlessFieldGenerators.any(), { minLength: 1, maxLength: 3 }),
      privateInputs: fc.array(RuthlessFieldGenerators.any(), { minLength: 1, maxLength: 3 }),
      programFactory: fc.constantFrom(
        // Simple addition circuit
        (name: string) => ZkProgram({
          name,
          publicInput: Field,
          methods: {
            add: {
              privateInputs: [Field],
              async method(publicInput: Field, privateInput: Field) {
                const sum = publicInput.add(privateInput);
                sum.assertEquals(publicInput.add(privateInput));
              }
            }
          }
        }),
        // Simple multiplication circuit
        (name: string) => ZkProgram({
          name,
          publicInput: Field,
          methods: {
            multiply: {
              privateInputs: [Field],
              async method(publicInput: Field, privateInput: Field) {
                const product = publicInput.mul(privateInput);
                product.assertEquals(publicInput.mul(privateInput));
              }
            }
          }
        }),
        // Field squaring circuit
        (name: string) => ZkProgram({
          name,
          publicInput: Field,
          methods: {
            square: {
              privateInputs: [Field],
              async method(publicInput: Field, privateInput: Field) {
                const squared = privateInput.square();
                squared.assertEquals(privateInput.mul(privateInput));
              }
            }
          }
        }),
        // Complex arithmetic circuit
        (name: string) => ZkProgram({
          name,
          publicInput: Field,
          methods: {
            complex: {
              privateInputs: [Field, Field],
              async method(publicInput: Field, a: Field, b: Field) {
                const result = a.square().add(b.square()).mul(publicInput);
                result.assertEquals(a.mul(a).add(b.mul(b)).mul(publicInput));
              }
            }
          }
        }),
        // Poseidon circuit
        (name: string) => ZkProgram({
          name,
          publicInput: Field,
          methods: {
            hash: {
              privateInputs: [Field, Field],
              async method(publicInput: Field, a: Field, b: Field) {
                const hash = Poseidon.hash([a, b]);
                hash.assertEquals(Poseidon.hash([a, b]));
                publicInput.assertEquals(hash);
              }
            }
          }
        })
      )
    });
  }
}

/**
 * Test scenario generators for comprehensive coverage
 */
export class RuthlessScenarioGenerators {
  /**
   * Backend switching scenarios
   */
  static backendSwitching(): fc.Arbitrary<{
    switchPattern: ('snarky' | 'sparky')[];
    operations: (() => Field)[];
  }> {
    return fc.record({
      switchPattern: fc.array(
        fc.constantFrom('snarky' as const, 'sparky' as const),
        { minLength: 2, maxLength: 6 }
      ),
      operations: fc.array(
        fc.constantFrom(
          () => Field(42).add(Field(1)),
          () => Field(17).mul(Field(3)),
          () => Field(100).square(),
          () => Poseidon.hash([Field(1), Field(2)])
        ),
        { minLength: 1, maxLength: 5 }
      )
    });
  }
  
  /**
   * Stress test scenarios with many operations
   */
  static stressTest(): fc.Arbitrary<{
    operationCount: number;
    fieldValues: Field[];
    operationTypes: string[];
  }> {
    return fc.record({
      operationCount: fc.integer({ min: 50, max: 200 }),
      fieldValues: fc.array(RuthlessFieldGenerators.any(), { minLength: 10, maxLength: 50 }),
      operationTypes: fc.array(
        fc.constantFrom('add', 'mul', 'square', 'hash'),
        { minLength: 5, maxLength: 20 }
      )
    });
  }
  
  /**
   * Error condition scenarios
   */
  static errorConditions(): fc.Arbitrary<{
    scenario: string;
    setup: () => Promise<void>;
    operation: () => Promise<any>;
    expectedError: boolean;
  }> {
    return fc.constantFrom(
      {
        scenario: 'division_by_zero',
        setup: async () => {},
        operation: async () => Field(42).div(Field(0)),
        expectedError: true
      },
      {
        scenario: 'invalid_assertion',
        setup: async () => {},
        operation: async () => Field(1).assertEquals(Field(2)),
        expectedError: true
      },
      {
        scenario: 'large_computation',
        setup: async () => {},
        operation: async () => {
          let result = Field(1);
          for (let i = 0; i < 1000; i++) {
            result = result.add(Field(i));
          }
          return result;
        },
        expectedError: false
      }
    );
  }
}

/**
 * Export all generators for easy access
 */
export const ruthlessGenerators = {
  fields: RuthlessFieldGenerators,
  circuits: RuthlessCircuitGenerators,
  scenarios: RuthlessScenarioGenerators
};