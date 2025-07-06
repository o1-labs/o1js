/**
 * Type definitions for Sparky Adapter
 * 
 * This file contains all TypeScript type definitions for the sparky-adapter module,
 * including WASM interfaces, OCaml module interfaces, and internal data structures.
 */

// ===================================================================
// WASM Module Types
// ===================================================================

/**
 * Cvar type - Sparky's internal constraint variable representation
 */
export type Cvar = 
  | { type: 'var'; id: number }
  | { type: 'constant'; value: string }
  | { type: 'add'; left: Cvar; right: Cvar }
  | { type: 'mul'; left: Cvar; right: Cvar };

/**
 * FieldVar type - OCaml/Snarky's field variable representation
 * [0, [0, "value"]] for constants
 * [1, varId] for variables
 * [2, left, right] for additions
 */
export type FieldVar = 
  | [0, [0, string]]  // Constant
  | [1, number]       // Variable
  | [2, FieldVar, FieldVar]; // Addition

/**
 * MlArray type - OCaml array representation
 */
export type MlArray<T> = [0, ...T[]];

/**
 * Mode handle for constraint system and witness generation modes
 */
export interface ModeHandle {
  exit(): void;
}

/**
 * Sparky WASM Module Interface
 */
export interface SparkyWasmModule {
  initSparky(): Snarky;
  ModeHandle: {
    new(): ModeHandle;
  };
  PoseidonCompat: {
    new(): PoseidonCompat;
  };
  RunState: {
    new(): RunState;
  };
  Snarky: {
    new(): Snarky;
    setOptimizationMode(mode: string): void;
    getOptimizationMode(): string;
  };
}

/**
 * Main Snarky interface
 */
export interface Snarky {
  gatesRaw(kind: number, values: any, coefficients: any): void;
  runReset(): void;
  setOptimizationFailureMode(failFast: boolean): void;
  getOptimizationStats(): any;
  resetOptimizationStats(): void;
  
  readonly poseidon: PoseidonCompat;
  readonly field: SnarkyFieldCompat;
  readonly run: SnarkyRunCompat;
  readonly constraintSystem: SnarkyConstraintSystemCompat;
  readonly gates: SnarkyGatesCompat;
}

/**
 * Poseidon hash function interface (WASM expects normal JS arrays, not MLArrays)
 */
export interface PoseidonCompat {
  update(state: FieldVar[], input: FieldVar[]): FieldVar[];
  hashToGroup(input: FieldVar[]): { x: FieldVar; y: FieldVar };
  spongeCreate(isChecked: boolean): any;
  spongeAbsorb(sponge: any, field: FieldVar): void;
  spongeSqueeze(sponge: any): FieldVar;
}

/**
 * Field operations interface
 */
export interface SnarkyFieldCompat {
  constant(value: any): Cvar;
  exists(compute?: Function | null): Cvar;
  add(x: Cvar, y: Cvar): Cvar;
  mul(x: Cvar, y: Cvar): Cvar;
  sub(x: Cvar, y: Cvar): Cvar;
  scale(scalar: any, x: Cvar): Cvar;
  square(x: Cvar): Cvar;
  assertEqual(x: Cvar, y: Cvar): void;
  assertMul(x: Cvar, y: Cvar, z: Cvar): void;
  assertSquare(x: Cvar, y: Cvar): void;
  assertBoolean(x: Cvar): void;
  readVar(x: Cvar): any;
  inv(x: Cvar): Cvar;
  emitIfConstraint(condition: Cvar, thenVal: Cvar, elseVal: Cvar): Cvar;
  emitBooleanAnd(a: Cvar, b: Cvar): Cvar;
}

/**
 * Run state interface
 */
export interface SnarkyRunCompat {
  enterConstraintSystem(): ModeHandle;
  enterGenerateWitness(): ModeHandle;
  witnessMode(): void;
  reset(): void;
  asProver(f: Function): any;
  setEvalConstraints(value: boolean): void;
  constraintMode(): void;
  getConstraintSystem(): any;
  enterAsProver(size: number): ModeHandle;
  existsOne(compute?: Function | null): Cvar;
  exists(size: number, compute?: Function | null): Cvar[];
  
  readonly inProver: () => boolean;
  readonly inProverBlock: () => boolean;
  readonly state: SparkyRunState;
}

/**
 * Run state for variable allocation
 */
export interface SparkyRunState {
  allocVar(): number;
  storeFieldElt(index: number, value: any): void;
}

/**
 * Constraint system interface
 */
export interface SnarkyConstraintSystemCompat {
  rows(system: any): number;
  digest(system: any): any;
  toJson(system: any): any;
}

/**
 * Gates interface
 */
export interface SnarkyGatesCompat {
  zero(a: any, b: any, c: any): void;
  xor(in1: any, in2: any, out: any, 
      in1_0: any, in1_1: any, in1_2: any, in1_3: any,
      in2_0: any, in2_1: any, in2_2: any, in2_3: any,
      out_0: any, out_1: any, out_2: any, out_3: any): void;
  lookup(w0: any, w1: any, w2: any, w3: any, w4: any, w5: any, w6: any): void;
  addFixedLookupTable(id: any, data: any): void;
  addRuntimeTableConfig(id: any, firstColumn: any): void;
  rangeCheck0(x: any, xLimbs12: any, xLimbs2: any, isCompact: any): void;
  rangeCheck1(v2: any, v12: any, vCurr: any, vNext: any): void;
  poseidon?(state: any): void;
  ecAdd?(p1: any, p2: any, p3: any, inf: any, same_x: any, slope: any, inf_z: any, x21_inv: any): void;
}

export interface RunState {
  new(): RunState;
}

// ===================================================================
// OCaml Module Types
// ===================================================================

/**
 * OCaml module exports interface
 */
export interface OCamlModules {
  Pickles: any;
  Test: any;
  Ledger: any;
}

// ===================================================================
// Internal Types
// ===================================================================

/**
 * Witness memory store for deterministic witness generation
 */
export interface WitnessMemoryStore {
  addCvar(cvar: FieldVar, value: string): void;
  getCvarValue(cvar: FieldVar): string | undefined;
  clear(): void;
  size(): number;
}

/**
 * Constraint flow statistics for debugging
 */
export interface ConstraintFlowStats {
  sparky: number;
  snarky: number;
  ocaml?: number; // legacy alias
}

/**
 * Backend type
 */
export type BackendType = 'sparky' | 'snarky';

// ===================================================================
// Main Snarky Interface (exported by adapter)
// ===================================================================

/**
 * Main Snarky interface that matches OCaml Snarky API
 */
export interface SnarkyAdapter {
  poseidon: {
    update(state: MlArray<FieldVar>, input: MlArray<FieldVar>): FieldVar[];
    hashToGroup(input: MlArray<FieldVar>): { x: FieldVar; y: FieldVar };
    sponge: {
      create(isChecked: boolean): any;
      absorb(sponge: any, field: FieldVar): void;
      squeeze(sponge: any): FieldVar;
    };
  };
  
  field: {
    // Field creation
    constant(value: string | bigint): FieldVar;
    exists(compute?: () => any): FieldVar;
    
    // Arithmetic operations
    add(x: FieldVar, y: FieldVar): FieldVar;
    mul(x: FieldVar, y: FieldVar): FieldVar;
    sub(x: FieldVar, y: FieldVar): FieldVar;
    scale(scalar: string | bigint, x: FieldVar): FieldVar;
    square(x: FieldVar): FieldVar;
    div(x: FieldVar, y: FieldVar): FieldVar;
    inv(x: FieldVar): FieldVar;
    sqrt(x: FieldVar): FieldVar;
    
    // Assertions
    assertEqual(x: FieldVar, y: FieldVar): void;
    assertMul(x: FieldVar, y: FieldVar, z: FieldVar): void;
    assertSquare(x: FieldVar, y: FieldVar): void;
    assertBoolean(x: FieldVar): void;
    
    // Comparisons
    compare(bitLength: number, x: FieldVar, y: FieldVar): [FieldVar, FieldVar, FieldVar];
    
    // Utilities
    readVar(x: FieldVar): string;
    truncateToBits16(lengthDiv16: number, x: FieldVar): FieldVar;
    toBits(length: number, x: FieldVar): FieldVar[];
    fromBits(bits: FieldVar[]): FieldVar;
    sizeInBits(x: FieldVar): number;
    choose(condition: FieldVar, x: FieldVar, y: FieldVar, ...rest: FieldVar[]): FieldVar;
    
    // Conditionals
    ifThenElse(condition: FieldVar, thenVal: FieldVar, elseVal: FieldVar): FieldVar;
    emitIfConstraint?(condition: FieldVar, thenVal: FieldVar, elseVal: FieldVar): FieldVar;
    emitBooleanAnd?(a: FieldVar, b: FieldVar): FieldVar;
  };
  
  run: {
    enterConstraintSystem(): () => any;
    enterGenerateWitness(): () => void;
    enterAsProver(size: number): (fields: any) => any;
    exists(size: number, compute?: () => any[]): FieldVar[];
    existsOne(compute?: () => any): FieldVar;
    getConstraintSystem(): any;
    
    state: {
      allocVar(state: any): any;
      storeFieldElt(state: any, x: any): FieldVar;
      getVariableValue(state: any, x: FieldVar): string;
      asProver(state: any): boolean;
      setAsProver(state: any, value: boolean): void;
      hasWitness(state: any): boolean;
    };
  };
  
  constraintSystem: {
    rows(system: any): number;
    digest(system: any): any;
    toJson(system: any): any;
  };
  
  gates: {
    zero(a: FieldVar, b: FieldVar, c: FieldVar): void;
    generic(
      coeffs: string[],
      x: FieldVar,
      y: FieldVar,
      z: FieldVar,
      ...rest: FieldVar[]
    ): void;
    raw(
      kind: number,
      values: FieldVar[],
      coeffs: string[]
    ): void;
    poseidon(state: any): void;
    ecAdd(
      p1: { x: FieldVar; y: FieldVar },
      p2: { x: FieldVar; y: FieldVar },
      p3: { x: FieldVar; y: FieldVar },
      inf: FieldVar,
      same_x: FieldVar,
      slope: FieldVar,
      inf_z: FieldVar,
      x21_inv: FieldVar
    ): void;
    ecScale(
      state: any
    ): void;
    ecEndoscale(
      state: any
    ): void;
    scaleRound(
      accs: any,
      bits: any,
      ss: any,
      base: any,
      nPrev: any,
      nNext: any
    ): void;
    lookup(
      w0: FieldVar,
      w1: FieldVar,
      w2: FieldVar,
      w3: FieldVar,
      w4: FieldVar,
      w5: FieldVar,
      w6: FieldVar
    ): void;
    addFixedLookupTable(id: number, data: [string, string][]): void;
    addRuntimeTableConfig(id: number, firstColumn: string[]): void;
    xor(
      in1: FieldVar,
      in2: FieldVar,
      out: FieldVar,
      in1Bits: FieldVar[],
      in2Bits: FieldVar[],
      outBits: FieldVar[]
    ): void;
    rangeCheck0(
      x: FieldVar,
      xLimbs12: MlArray<FieldVar>,
      xLimbs2: FieldVar,
      isCompact: FieldVar
    ): void;
    rangeCheck1(
      v2: FieldVar,
      v12: FieldVar,
      vCurr: MlArray<FieldVar>,
      vNext: MlArray<FieldVar>
    ): void;
    foreignFieldAdd(
      left: [FieldVar, FieldVar, FieldVar],
      right: [FieldVar, FieldVar, FieldVar],
      result: [FieldVar, FieldVar, FieldVar],
      overflow: FieldVar,
      carry: FieldVar,
      foreignFieldModulus: [string, string, string],
      sign: string
    ): void;
    foreignFieldMul(
      left: [FieldVar, FieldVar, FieldVar],
      right: [FieldVar, FieldVar, FieldVar],
      quotient: [FieldVar, FieldVar],
      remainder: [FieldVar, FieldVar, FieldVar],
      carry0: FieldVar,
      carry1p: FieldVar,
      carry1m: FieldVar,
      foreignFieldModulus2: string,
      negForeignFieldModulus: [string, string, string]
    ): void;
    rotate(
      field: FieldVar,
      rotated: FieldVar,
      excess: FieldVar,
      limbs: FieldVar[],
      crumbs: FieldVar[],
      twoToRot: string,
      bits: number
    ): void;
    not(
      x: FieldVar,
      y: FieldVar,
      bits: FieldVar[]
    ): void;
  };
}

// ===================================================================
// Utility Types
// ===================================================================

/**
 * Type guard for FieldVar
 */
export function isFieldVar(x: any): x is FieldVar {
  return Array.isArray(x) && x.length >= 2 && typeof x[0] === 'number';
}

/**
 * Type guard for Cvar
 */
export function isCvar(x: any): x is Cvar {
  return x && typeof x === 'object' && 'type' in x;
}

/**
 * Type guard for MlArray
 */
export function isMlArray<T>(x: any): x is MlArray<T> {
  return Array.isArray(x) && x.length > 0 && x[0] === 0;
}