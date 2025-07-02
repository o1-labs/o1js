/* tslint:disable */
/* eslint-disable */
export function main(): void;
export function createExplicitStateContext(mode: string): WasmStateContext;
/**
 * Batch operation result
 */
export class BatchResult {
  free(): void;
  constructor(results: Array<any>, processing_time_ms: number, operation_count: number);
  readonly results: Array<any>;
  readonly processing_time_ms: number;
  readonly operation_count: number;
}
/**
 * Circuit compilation result
 */
export class CircuitResult {
  free(): void;
  constructor(constraint_system: any, num_constraints: number, num_variables: number, compilation_time_ms: number);
  readonly constraint_system: any;
  readonly num_constraints: number;
  readonly num_variables: number;
  readonly compilation_time_ms: number;
}
/**
 * Constraint representation for JavaScript
 */
export class Constraint {
  free(): void;
  constructor(constraint_type: string, left: any, right: any, output: any, annotation?: string | null);
  /**
   * Create an equality constraint
   */
  static equality(left: any, right: any, annotation?: string | null): Constraint;
  /**
   * Create a multiplication constraint
   */
  static multiplication(left: any, right: any, output: any, annotation?: string | null): Constraint;
  /**
   * Create a boolean constraint
   */
  static boolean(value: any, annotation?: string | null): Constraint;
  readonly type: string;
  readonly left: any;
  readonly right: any;
  readonly output: any;
  readonly annotation: string | undefined;
}
/**
 * Elliptic curve point representation
 */
export class ECPoint {
  free(): void;
  constructor(x: any, y: any, is_infinity: boolean);
  /**
   * Create a point at infinity
   */
  static infinity(): ECPoint;
  /**
   * Create a finite point
   */
  static finite(x: any, y: any): ECPoint;
  readonly x: any;
  readonly y: any;
  readonly is_infinity: boolean;
}
/**
 * Field variable representation for JavaScript
 */
export class FieldVar {
  free(): void;
  constructor(var_type: string, value: any, index?: number | null);
  /**
   * Create a constant field variable
   */
  static constant(value: any): FieldVar;
  /**
   * Create a variable field variable
   */
  static variable(index: number, value: any): FieldVar;
  /**
   * Create a linear combination field variable
   */
  static linearCombination(_coeffs: any, value: any): FieldVar;
  readonly type: string;
  readonly value: any;
  readonly index: number | undefined;
}
/**
 * Memory usage statistics
 */
export class MemoryStats {
  free(): void;
  constructor(total_allocated_kb: number, current_usage_kb: number, peak_usage_kb: number, constraint_count: number, variable_count: number);
  readonly total_allocated_kb: number;
  readonly current_usage_kb: number;
  readonly peak_usage_kb: number;
  readonly constraint_count: number;
  readonly variable_count: number;
}
export class ModeHandle {
  private constructor();
  free(): void;
  /**
   * Exit the mode (called explicitly or automatically on drop)
   */
  exit(): void;
}
/**
 * WASM optimization hints
 */
export class OptimizationHints {
  private constructor();
  free(): void;
  /**
   * Hint that a function is hot and should be optimized
   */
  static markHot(func_name: string): void;
  /**
   * Hint that memory will be accessed sequentially
   */
  static prefetchSequential(start: number, len: number): void;
  /**
   * Hint to optimize for size over speed
   */
  static optimizeForSize(): void;
}
/**
 * Performance metrics for operations
 */
export class PerformanceMetrics {
  free(): void;
  constructor(operation_name: string, total_time_ms: number, average_time_ms: number, min_time_ms: number, max_time_ms: number, operation_count: number);
  /**
   * Create metrics from a single timing
   */
  static fromSingle(operation_name: string, time_ms: number): PerformanceMetrics;
  readonly operation_name: string;
  readonly total_time_ms: number;
  readonly average_time_ms: number;
  readonly min_time_ms: number;
  readonly max_time_ms: number;
  readonly operation_count: number;
}
/**
 * Range check constraint representation
 */
export class RangeConstraint {
  free(): void;
  constructor(value: any, num_bits: number, constraint_type: string);
  /**
   * Create a standard range check
   */
  static standard(value: any, num_bits: number): RangeConstraint;
  /**
   * Create a compact range check
   */
  static compact(value: any, num_bits: number): RangeConstraint;
  readonly value: any;
  readonly num_bits: number;
  readonly type: string;
}
/**
 * OCaml snarky compatible run state object
 */
export class RunState {
  private constructor();
  free(): void;
  static new(): RunState;
  /**
   * Allocate a new variable (OCaml snarky: run.state.allocVar)
   */
  allocVar(): number;
  /**
   * Store a field element for a variable (OCaml snarky: run.state.storeFieldElt)
   */
  storeFieldElt(var_index: number, value: any): void;
  /**
   * Get a variable's value (OCaml snarky: run.state.getVariableValue)
   */
  getVariableValue(var_index: number): any;
}
/**
 * Main Snarky object with all functionality consolidated
 */
export class Snarky {
  free(): void;
  /**
   * Creates a new Sparky WASM instance with consolidated architecture.
   *
   * This constructor initializes panic hooks for proper error handling in WASM
   * and sets up debug logging. The Sparky struct consolidates all modules
   * (field, gates, constraint system, run state) into a single object to
   * reduce WASM-bindgen overhead and eliminate redundant clones.
   */
  constructor();
  /**
   * Check if we're in prover mode
   */
  runInProver(): boolean;
  /**
   * Run code as prover (with witness generation enabled)
   */
  runAsProver(f: Function): any;
  /**
   * Check if we're in a prover block
   */
  runInProverBlock(): boolean;
  /**
   * Control constraint evaluation
   */
  runSetEvalConstraints(enabled: boolean): void;
  /**
   * Switch to constraint generation mode
   */
  runConstraintMode(): void;
  /**
   * Switch to witness generation mode
   */
  runWitnessMode(): void;
  /**
   * Reset the run state
   */
  runReset(): void;
  /**
   * Enter constraint system mode and return exit handle
   */
  runEnterConstraintSystem(): ModeHandle;
  /**
   * Enter witness generation mode and return exit handle
   */
  runEnterGenerateWitness(): ModeHandle;
  /**
   * Enter prover mode and return exit handle
   */
  runEnterAsProver(size: number): ModeHandle;
  /**
   * Get number of rows
   */
  constraintSystemRows(_system: any): number;
  /**
   * Get digest
   */
  constraintSystemDigest(_system: any): string;
  /**
   * Convert to JSON (Kimchi format for o1js compatibility)
   */
  constraintSystemToJson(_system: any): any;
  /**
   * Assert two fields are equal
   */
  fieldAssertEqual(x: any, y: any): void;
  /**
   * Assert multiplication
   */
  fieldAssertMul(x: any, y: any, z: any): void;
  /**
   * Assert squaring
   */
  fieldAssertSquare(x: any, y: any): void;
  /**
   * Assert boolean
   */
  fieldAssertBoolean(x: any): void;
  /**
   * Read variable value
   */
  fieldReadVar(x: any): any;
  /**
   * Create a new witness variable
   */
  fieldExists(compute?: Function | null): any;
  /**
   * Create a constant
   */
  fieldConstant(value: any): any;
  /**
   * Add two field elements
   */
  fieldAdd(x: any, y: any): any;
  /**
   * Scale a field element
   */
  fieldScale(scalar: any, x: any): any;
  /**
   * Multiply two field elements
   */
  fieldMul(x: any, y: any): any;
  /**
   * Subtract two field elements
   */
  fieldSub(x: any, y: any): any;
  /**
   * Square a field element
   */
  fieldSquare(x: any): any;
  /**
   * Compute field inverse
   */
  fieldInv(x: any): any;
  /**
   * Zero gate
   */
  gatesZero(a: any, b: any, c: any): void;
  /**
   * Generic gate
   */
  gatesGeneric(a_left: number, a: any, b_left: number, b: any, c_left: number, c: any, a_right: number, b_right: number): void;
  /**
   * EC point addition: P1 + P2 = P3
   */
  gatesEcAdd(p1: any, p2: any): any;
  /**
   * EC point doubling: 2P = P + P
   */
  gatesEcDouble(p: any): any;
  /**
   * EC scalar multiplication: k * P
   */
  gatesEcScalarMult(p: any, scalar_bits: any): any;
  /**
   * Range check 64-bit value
   */
  gatesRangeCheck64(value: any): void;
  /**
   * Range check 32-bit value
   */
  gatesRangeCheck32(value: any): void;
  /**
   * Range check 16-bit value
   */
  gatesRangeCheck16(value: any): void;
  /**
   * Range check n-bit value
   */
  gatesRangeCheckN(value: any, bits: number): void;
  /**
   * Range check that a value is exactly 0
   */
  gatesRangeCheck0(value: any): void;
  /**
   * Range check implementation for complex multi-variable constraints (range_check1 gate)
   */
  gatesRangeCheck1(v2: any, v12: any, v2c0: any, v2p0: any, v2p1: any, v2p2: any, v2p3: any, v2c1: any, v2c2: any, v2c3: any, v2c4: any, v2c5: any, v2c6: any, v2c7: any, v2c8: any, v2c9: any, v2c10: any, v2c11: any, v0p0: any, v0p1: any, v1p0: any, v1p1: any, v2c12: any, v2c13: any, v2c14: any, v2c15: any, v2c16: any, v2c17: any, v2c18: any, v2c19: any): void;
  /**
   * Raw gate interface matching OCaml snarky
   */
  gatesRaw(kind: number, values: any, coefficients: any): void;
  /**
   * Create a foreign field element from a hex string
   */
  foreignFieldFromHex(hex_str: any): any;
  /**
   * Create a foreign field element from a decimal string
   */
  foreignFieldFromDecimal(decimal_str: any): any;
  /**
   * Range check a foreign field element
   */
  foreignFieldRangeCheck(foreign_field: any): void;
  /**
   * Foreign field addition
   */
  foreignFieldAdd(left: any, right: any, overflow: any, carry: any, modulus_limb0: number, modulus_limb1: number, modulus_limb2: number, sign: number): void;
  /**
   * Foreign field multiplication
   */
  foreignFieldMul(left: any, right: any, quotient_limb0: any, quotient_limb1: any, remainder: any, carry0: any, carry1_bounds_limb0: any, carry1_bounds_limb1: any, carry1_bounds_limb2: any, carry1_12: any, product1_lo_bounds: any, quotient_hi_bound_limb0: any, quotient_hi_bound_limb1: any, quotient_hi_bound_limb2: any, quotient_hi_bound_limb3: any, product_hi_shift: number, modulus_limb0: number, modulus_limb1: number, modulus_limb2: number): void;
  /**
   * Test secp256k1 field operations
   */
  testSecp256k1Field(): void;
  /**
   * Create witness variables (at top level like OCaml Snarky)
   */
  exists(size: number, compute?: Function | null): Array<any>;
  /**
   * Create a single witness variable (at top level like OCaml Snarky)
   */
  existsOne(compute?: Function | null): any;
  /**
   * Get the run module (for compatibility)
   */
  readonly run: SnarkyRunCompat;
  /**
   * Get the state object for OCaml snarky compatibility
   */
  readonly runState: RunState;
  /**
   * Get the constraint system module (for compatibility)
   */
  readonly constraintSystem: SnarkyConstraintSystemCompat;
  /**
   * Get the field module (for compatibility)
   */
  readonly field: SnarkyFieldCompat;
  /**
   * Get the gates module (for compatibility)
   */
  readonly gates: SnarkyGatesCompat;
  /**
   * Get the circuit module (for compatibility)
   */
  readonly circuit: SnarkyCircuitCompat;
}
export class SnarkyCircuitCompat {
  private constructor();
  free(): void;
}
export class SnarkyConstraintSystemCompat {
  private constructor();
  free(): void;
  rows(_system: any): number;
  digest(_system: any): string;
  toJson(_system: any): any;
}
export class SnarkyFieldCompat {
  private constructor();
  free(): void;
  assertEqual(x: any, y: any): void;
  assertMul(x: any, y: any, z: any): void;
  assertSquare(x: any, y: any): void;
  assertBoolean(x: any): void;
  readVar(x: any): any;
  exists(compute?: Function | null): any;
  constant(value: any): any;
  add(x: any, y: any): any;
  scale(scalar: any, x: any): any;
  mul(x: any, y: any): any;
  sub(x: any, y: any): any;
  square(x: any): any;
  inv(x: any): any;
}
export class SnarkyGatesCompat {
  private constructor();
  free(): void;
  zero(a: any, b: any, c: any): void;
  generic(a_left: number, a: any, b_left: number, b: any, c_left: number, c: any, a_right: number, b_right: number): void;
  ecAdd(p1: any, p2: any): any;
  ecDouble(p: any): any;
  ecScalarMult(p: any, scalar_bits: any): any;
  rangeCheck64(value: any): void;
  rangeCheck32(value: any): void;
  rangeCheck16(value: any): void;
  rangeCheckN(value: any, bits: number): void;
  rangeCheck0(value: any): void;
  rangeCheck1(v2: any, v12: any, v2c0: any, v2p0: any, v2p1: any, v2p2: any, v2p3: any, v2c1: any, v2c2: any, v2c3: any, v2c4: any, v2c5: any, v2c6: any, v2c7: any, v2c8: any, v2c9: any, v2c10: any, v2c11: any, v0p0: any, v0p1: any, v1p0: any, v1p1: any, v2c12: any, v2c13: any, v2c14: any, v2c15: any, v2c16: any, v2c17: any, v2c18: any, v2c19: any): void;
  raw(kind: number, values: any, coefficients: any): void;
  foreignFieldFromHex(hex_str: any): any;
  foreignFieldFromDecimal(decimal_str: any): any;
  foreignFieldRangeCheck(foreign_field: any): void;
  foreignFieldAdd(left: any, right: any, overflow: any, carry: any, modulus_limb0: number, modulus_limb1: number, modulus_limb2: number, sign: number): void;
  foreignFieldMul(left: any, right: any, quotient_limb0: any, quotient_limb1: any, remainder: any, carry0: any, carry1_bounds_limb0: any, carry1_bounds_limb1: any, carry1_bounds_limb2: any, carry1_12: any, product1_lo_bounds: any, quotient_hi_bound_limb0: any, quotient_hi_bound_limb1: any, quotient_hi_bound_limb2: any, quotient_hi_bound_limb3: any, product_hi_shift: number, modulus_limb0: number, modulus_limb1: number, modulus_limb2: number): void;
  testSecp256k1Field(): void;
}
export class SnarkyRunCompat {
  private constructor();
  free(): void;
  asProver(f: Function): any;
  setEvalConstraints(enabled: boolean): void;
  constraintMode(): void;
  witnessMode(): void;
  reset(): void;
  enterConstraintSystem(): ModeHandle;
  enterGenerateWitness(): ModeHandle;
  enterAsProver(size: number): ModeHandle;
  /**
   * Get the current constraint system
   */
  getConstraintSystem(): any;
  /**
   * Create witness variables (OCaml: Run.exists)
   */
  exists(size: number, compute?: Function | null): Array<any>;
  /**
   * Create a single witness variable (OCaml: Run.exists_one)
   */
  existsOne(compute?: Function | null): any;
  readonly inProver: boolean;
  readonly inProverBlock: boolean;
  readonly state: RunState;
}
/**
 * Check which WASM features are available in the current environment
 */
export class WasmFeatures {
  free(): void;
  /**
   * Detect available WASM features at runtime
   */
  constructor();
  bulk_memory: boolean;
  multi_value: boolean;
  reference_types: boolean;
  simd: boolean;
  threads: boolean;
}
/**
 * Migration utilities for the WASM interface
 */
export class WasmMigration {
  private constructor();
  free(): void;
  /**
   * Initialize global context for migration purposes
   * WARNING: This is unsafe and should only be used during migration
   */
  static initGlobalContext(mode: string): void;
  /**
   * Reset the global context
   * WARNING: This is unsafe and should only be used for testing
   */
  static resetGlobalContext(): void;
  /**
   * Drop the global context
   * WARNING: This is unsafe and should only be called during shutdown
   */
  static dropGlobalContext(): void;
}
/**
 * WASM-compatible wrapper for StateContext
 */
export class WasmStateContext {
  free(): void;
  /**
   * Create a new state context in constraint generation mode
   */
  constructor();
  /**
   * Create a new state context in constraint generation mode
   */
  static newConstraintGeneration(): WasmStateContext;
  /**
   * Create a new state context in witness generation mode
   */
  static newWitnessGeneration(): WasmStateContext;
  /**
   * Create a new state context in prover mode
   */
  static newProver(): WasmStateContext;
  /**
   * Get the current run mode (returns string for JS compatibility)
   */
  getMode(): string;
  /**
   * Set the run mode (accepts string for JS compatibility)
   */
  setMode(mode: string): void;
  /**
   * Reset the state to initial values
   */
  reset(): void;
  /**
   * Fork the context (create a new one with same mode)
   */
  fork(): WasmStateContext;
  /**
   * Fork the context with a different mode
   */
  forkWithMode(mode: string): WasmStateContext;
  /**
   * Allocate a new variable
   */
  allocVar(): number;
  /**
   * Set a variable's value (only works in witness/prover mode)
   */
  setVariableValue(var_id: number, value: string): void;
  /**
   * Get a variable's value (only works in witness/prover mode)
   */
  getVariableValue(var_id: number): string;
  /**
   * Check if we should generate constraints
   */
  shouldGenerateConstraints(): boolean;
  /**
   * Check if we should compute witness values
   */
  shouldComputeWitness(): boolean;
  /**
   * Check if we're in constraint generation mode
   */
  inConstraintMode(): boolean;
  /**
   * Check if we're in witness generation mode
   */
  inWitnessMode(): boolean;
  /**
   * Check if we're in prover mode
   */
  inProverMode(): boolean;
  /**
   * Get the number of constraints in the current system
   */
  getConstraintCount(): number;
  /**
   * Get the constraint system as JSON
   */
  getConstraintSystemJson(): string;
}
