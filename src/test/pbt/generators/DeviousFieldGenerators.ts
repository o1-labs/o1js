/**
 * DEVIOUS FIELD GENERATORS - RED TEAM EDITION
 * 
 * These generators are designed to be malicious, sneaky, and evil.
 * They attempt to break Sparky in every conceivable way through
 * carefully crafted edge cases, resource exhaustion, and attack vectors.
 */

import fc from 'fast-check';
import { Field, Poseidon, ZkProgram, Provable } from '../../../../dist/node/index.js';

// Pallas field constants for maximum evilness
const FIELD_MODULUS = 28948022309329048855892746252171976963363056481941560715954676764349967630337n;
const FIELD_MAX = FIELD_MODULUS - 1n;
const FIELD_HALF = FIELD_MODULUS / 2n;

/**
 * ATTACK VECTOR 1: Memory/Resource Exhaustion
 */
export class MemoryAttackGenerators {
  /**
   * Extremely large field values designed to stress BigInt operations
   */
  static massiveValues(): fc.Arbitrary<Field> {
    return fc.oneof(
      // Values near modulus boundary (most likely to cause overflow issues)
      fc.constantFrom(
        FIELD_MAX,
        FIELD_MAX - 1n,
        FIELD_MAX - 2n,
        FIELD_MAX - 100n,
        FIELD_MODULUS - 1000000n,
        FIELD_HALF,
        FIELD_HALF + 1n,
        FIELD_HALF - 1n
      ).map(v => Field(v)),
      
      // Powers of 2 near field boundary (bit manipulation edge cases)
      fc.constantFrom(
        1n << 250n,
        1n << 251n,
        1n << 252n,
        1n << 253n,
        1n << 254n,
        1n << 255n
      ).map(v => Field(v % FIELD_MODULUS)),
      
      // Values with specific bit patterns (all 1s, alternating patterns)
      fc.constantFrom(
        0xFFFFFFFFFFFFFFFFn,
        0xAAAAAAAAAAAAAAAAn,
        0x5555555555555555n,
        0xDEADBEEFDEADBEEFn,
        0xCAFEBABECAFEBABEn
      ).map(v => Field(v))
    );
  }

  /**
   * Deep recursion patterns designed to blow the stack
   */
  static recursiveBomb(): fc.Arbitrary<{ depth: number; pattern: Field[] }> {
    return fc.record({
      depth: fc.integer({ min: 100, max: 1000 }),
      pattern: fc.array(this.massiveValues(), { minLength: 10, maxLength: 50 })
    });
  }

  /**
   * Massive constraint systems designed to exhaust memory
   */
  static constraintBomb(): fc.Arbitrary<{ variableCount: number; constraintCount: number; pattern: string }> {
    return fc.record({
      variableCount: fc.integer({ min: 1000, max: 10000 }),
      constraintCount: fc.integer({ min: 5000, max: 50000 }),
      pattern: fc.constantFrom('linear', 'quadratic', 'exponential', 'fibonacci', 'factorial')
    });
  }
}

/**
 * ATTACK VECTOR 2: Numerical Edge Cases and Traps
 */
export class NumericalTrapGenerators {
  /**
   * Division by zero in every possible context
   */
  static divisionTraps(): fc.Arbitrary<{ dividend: Field; divisor: Field; context: string }> {
    return fc.record({
      dividend: fc.oneof(
        fc.constantFrom(0n, 1n, FIELD_MAX, FIELD_HALF).map(v => Field(v)),
        MemoryAttackGenerators.massiveValues()
      ),
      divisor: fc.constantFrom(Field(0)), // Always zero to trigger division by zero
      context: fc.constantFrom('direct', 'inverse', 'fraction', 'circuit', 'nested')
    });
  }

  /**
   * Overflow/underflow traps in arithmetic
   */
  static overflowTraps(): fc.Arbitrary<{ a: Field; b: Field; operation: string }> {
    const boundary = fc.oneof(
      fc.constantFrom(0n, 1n, 2n, FIELD_MAX, FIELD_MAX - 1n, FIELD_HALF).map(v => Field(v)),
      MemoryAttackGenerators.massiveValues()
    );
    
    return fc.record({
      a: boundary,
      b: boundary,
      operation: fc.constantFrom('add', 'mul', 'sub', 'pow', 'chain')
    });
  }

  /**
   * Invalid mathematical operations
   */
  static invalidMathTraps(): fc.Arbitrary<{ value: Field; operation: string; expected: 'error' | 'undefined' }> {
    return fc.record({
      value: fc.oneof(
        fc.constantFrom(Field(0), Field(1), Field(FIELD_MAX)),
        MemoryAttackGenerators.massiveValues()
      ),
      operation: fc.constantFrom('sqrt_negative', 'log_zero', 'log_negative', 'factorial_negative'),
      expected: fc.constantFrom('error' as const, 'undefined' as const)
    });
  }
}

/**
 * ATTACK VECTOR 3: Backend State Corruption
 */
export class StateCorruptionGenerators {
  /**
   * Rapid backend switching patterns designed to cause race conditions
   */
  static backendChaos(): fc.Arbitrary<{ switches: ('snarky' | 'sparky')[]; operations: string[]; timing: number[] }> {
    return fc.record({
      switches: fc.array(
        fc.constantFrom('snarky' as const, 'sparky' as const),
        { minLength: 10, maxLength: 100 }
      ),
      operations: fc.array(
        fc.constantFrom('add', 'mul', 'hash', 'circuit', 'constraint', 'compile'),
        { minLength: 20, maxLength: 50 }
      ),
      timing: fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 10, maxLength: 50 })
    });
  }

  /**
   * Partial state corruption scenarios
   */
  static partialStateCorruption(): fc.Arbitrary<{ corruptionPoint: string; operation: string; recovery: boolean }> {
    return fc.record({
      corruptionPoint: fc.constantFrom(
        'mid_compilation',
        'during_constraint_generation',
        'during_proof_generation',
        'during_vk_generation',
        'during_backend_switch'
      ),
      operation: fc.constantFrom('continue', 'retry', 'abort', 'switch_backend'),
      recovery: fc.boolean()
    });
  }
}

/**
 * ATTACK VECTOR 4: Cryptographic Attacks
 */
export class CryptographicAttackGenerators {
  /**
   * Invalid group elements and curve attacks
   */
  static invalidGroupElements(): fc.Arbitrary<{ x: Field; y: Field; attackType: string }> {
    return fc.record({
      x: fc.oneof(
        fc.constantFrom(Field(0), Field(1), Field(FIELD_MAX)),
        MemoryAttackGenerators.massiveValues()
      ),
      y: fc.oneof(
        fc.constantFrom(Field(0), Field(1), Field(FIELD_MAX)),
        MemoryAttackGenerators.massiveValues()
      ),
      attackType: fc.constantFrom(
        'point_at_infinity',
        'invalid_curve_point',
        'degenerate_point',
        'small_subgroup',
        'twist_attack'
      )
    });
  }

  /**
   * Hash collision attempts and preimage attacks
   */
  static hashAttacks(): fc.Arbitrary<{ inputs: Field[]; attackType: string; rounds: number }> {
    return fc.record({
      inputs: fc.array(
        fc.oneof(
          fc.constantFrom(Field(0), Field(1)),
          MemoryAttackGenerators.massiveValues()
        ),
        { minLength: 1, maxLength: 20 }
      ),
      attackType: fc.constantFrom(
        'collision',
        'preimage',
        'length_extension',
        'multicollision',
        'differential'
      ),
      rounds: fc.integer({ min: 1, max: 1000 })
    });
  }
}

/**
 * ATTACK VECTOR 5: Circuit Construction Attacks
 */
export class CircuitAttackGenerators {
  /**
   * Malformed circuit patterns designed to break compilation
   */
  static malformedCircuits(): fc.Arbitrary<{ 
    circuitType: string; 
    malformationType: string; 
    complexity: number;
    inputs: Field[];
  }> {
    return fc.record({
      circuitType: fc.constantFrom(
        'recursive_loop',
        'infinite_constraint',
        'circular_dependency',
        'invalid_witness',
        'constraint_explosion'
      ),
      malformationType: fc.constantFrom(
        'missing_constraints',
        'contradictory_constraints',
        'unsatisfiable_system',
        'underconstrained',
        'overconstrained'
      ),
      complexity: fc.integer({ min: 100, max: 10000 }),
      inputs: fc.array(MemoryAttackGenerators.massiveValues(), { minLength: 5, maxLength: 100 })
    });
  }

  /**
   * Resource exhaustion through circuit complexity
   */
  static complexityBombs(): fc.Arbitrary<{
    width: number;
    depth: number;
    branchingFactor: number;
    operationType: string;
  }> {
    return fc.record({
      width: fc.integer({ min: 1000, max: 100000 }),
      depth: fc.integer({ min: 100, max: 1000 }),
      branchingFactor: fc.integer({ min: 10, max: 100 }),
      operationType: fc.constantFrom(
        'multiplication_tree',
        'hash_chain',
        'nested_conditionals',
        'polynomial_expansion',
        'matrix_operations'
      )
    });
  }
}

/**
 * ATTACK VECTOR 6: Performance Degradation Attacks  
 */
export class PerformanceAttackGenerators {
  /**
   * Asymmetric performance patterns (slow on one backend)
   */
  static asymmetricOperations(): fc.Arbitrary<{
    operation: string;
    parameters: Field[];
    expectedSlowBackend: 'snarky' | 'sparky';
    degreeOfSlowness: number;
  }> {
    return fc.record({
      operation: fc.constantFrom(
        'repeated_inversion',
        'deep_multiplication_chain',
        'massive_poseidon_tree',
        'constraint_generation_bomb',
        'recursive_proof_verification'
      ),
      parameters: fc.array(MemoryAttackGenerators.massiveValues(), { minLength: 10, maxLength: 1000 }),
      expectedSlowBackend: fc.constantFrom('snarky' as const, 'sparky' as const),
      degreeOfSlowness: fc.integer({ min: 10, max: 1000 }) // Expected slowdown factor
    });
  }

  /**
   * Memory leak inducing patterns
   */
  static memoryLeakPatterns(): fc.Arbitrary<{
    pattern: string;
    iterations: number;
    retainReferences: boolean;
    cleanup: boolean;
  }> {
    return fc.record({
      pattern: fc.constantFrom(
        'repeated_compilation',
        'constraint_accumulation',
        'cached_computation_buildup',
        'reference_cycling',
        'event_listener_accumulation'
      ),
      iterations: fc.integer({ min: 100, max: 10000 }),
      retainReferences: fc.boolean(),
      cleanup: fc.boolean()
    });
  }
}

/**
 * ATTACK VECTOR 7: Input Validation Bypasses
 */
export class ValidationBypassGenerators {
  /**
   * Invalid input types that should be rejected
   */
  static invalidInputs(): fc.Arbitrary<{
    inputType: string;
    value: any;
    expectedBehavior: 'error' | 'coercion' | 'undefined';
  }> {
    return fc.record({
      inputType: fc.constantFrom(
        'null',
        'undefined', 
        'negative_infinity',
        'positive_infinity',
        'nan',
        'string',
        'object',
        'function',
        'symbol',
        'bigint_overflow'
      ),
      value: fc.oneof(
        fc.constant(null),
        fc.constant(undefined),
        fc.constant(Number.NEGATIVE_INFINITY),
        fc.constant(Number.POSITIVE_INFINITY),
        fc.constant(NaN),
        fc.string(),
        fc.object(),
        fc.constant(() => {}),
        fc.constant(Symbol('test')),
        fc.constant(FIELD_MODULUS + 1000000n)
      ),
      expectedBehavior: fc.constantFrom('error' as const, 'coercion' as const, 'undefined' as const)
    });
  }

  /**
   * Boundary condition attacks
   */
  static boundaryAttacks(): fc.Arbitrary<{
    boundary: string;
    offset: number;
    direction: 'below' | 'above' | 'exactly';
  }> {
    return fc.record({
      boundary: fc.constantFrom(
        'field_modulus',
        'max_safe_integer',
        'array_max_length',
        'stack_limit',
        'memory_limit',
        'timeout_limit'
      ),
      offset: fc.integer({ min: -1000, max: 1000 }),
      direction: fc.constantFrom('below' as const, 'above' as const, 'exactly' as const)
    });
  }
}

/**
 * MASTER DEVIOUS GENERATOR - Combines all attack vectors
 */
export class DeviousAttackGenerators {
  /**
   * Combined multi-vector attacks
   */
  static combinedAttack(): fc.Arbitrary<{
    memoryAttack: any;
    numericalTrap: any;
    stateCorruption: any;
    cryptoAttack: any;
    circuitAttack: any;
    performanceAttack: any;
    validationBypass: any;
  }> {
    return fc.record({
      memoryAttack: MemoryAttackGenerators.massiveValues(),
      numericalTrap: NumericalTrapGenerators.divisionTraps(),
      stateCorruption: StateCorruptionGenerators.backendChaos(),
      cryptoAttack: CryptographicAttackGenerators.hashAttacks(),
      circuitAttack: CircuitAttackGenerators.malformedCircuits(),
      performanceAttack: PerformanceAttackGenerators.asymmetricOperations(),
      validationBypass: ValidationBypassGenerators.invalidInputs()
    });
  }

  /**
   * Chaos monkey - completely random evil operations
   */
  static chaosMonkey(): fc.Arbitrary<{
    operations: string[];
    values: Field[];
    timings: number[];
    switches: ('snarky' | 'sparky')[];
    corruptions: string[];
  }> {
    return fc.record({
      operations: fc.array(
        fc.constantFrom(
          'add', 'mul', 'div', 'inv', 'square', 'sqrt', 'pow',
          'hash', 'circuit', 'compile', 'prove', 'verify',
          'switch', 'corrupt', 'leak', 'exhaust', 'attack'
        ),
        { minLength: 50, maxLength: 500 }
      ),
      values: fc.array(MemoryAttackGenerators.massiveValues(), { minLength: 20, maxLength: 200 }),
      timings: fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 10, maxLength: 100 }),
      switches: fc.array(
        fc.constantFrom('snarky' as const, 'sparky' as const),
        { minLength: 20, maxLength: 200 }
      ),
      corruptions: fc.array(
        fc.constantFrom(
          'memory', 'state', 'constraint', 'proof', 'key', 'cache',
          'stack', 'heap', 'register', 'timing', 'side_channel'
        ),
        { minLength: 5, maxLength: 50 }
      )
    });
  }
}

/**
 * Export all devious generators
 */
export const deviousGenerators = {
  memory: MemoryAttackGenerators,
  numerical: NumericalTrapGenerators,
  state: StateCorruptionGenerators,
  crypto: CryptographicAttackGenerators,
  circuit: CircuitAttackGenerators,
  performance: PerformanceAttackGenerators,
  validation: ValidationBypassGenerators,
  combined: DeviousAttackGenerators
};