# Sparky Architecture Analysis for Kimchi Integration

## Executive Summary

Sparky is a Rust-based implementation of the Snarky constraint system, designed to replace the OCaml implementation with better performance through WASM. Currently, Sparky implements an R1CS (Rank-1 Constraint System) backend, but o1js expects Kimchi gate-based constraints, creating a fundamental incompatibility.

## Current Architecture Overview

### 1. Core Components

#### Field Implementation (`sparky-core/src/field.rs`)
- Uses `ark-ff` library for proper field arithmetic
- Implements Vesta field (Mina's native field)
- Prime: 28948022309329048855892746252171976963363056481941647379679742748393362948097
- Supports all field operations: add, sub, mul, div, inverse, square

#### Constraint System (`sparky-core/src/constraint.rs`)
- **Constraint Variables (Cvar)**: Linear combinations of field elements
  - `Constant(FieldElement)`: Constant values
  - `Var(VarId)`: Variable references
  - `Add(Box<Cvar>, Box<Cvar>)`: Addition
  - `Scale(FieldElement, Box<Cvar>)`: Scalar multiplication

- **R1CS Constraint Types**:
  - `Boolean(Cvar)`: x ∈ {0, 1}
  - `Equal(Cvar, Cvar)`: x = y
  - `Square(Cvar, Cvar)`: x² = y
  - `R1CS(Cvar, Cvar, Cvar)`: a × b = c

- **Constraint System Storage**:
  - Vector of constraints
  - Public/auxiliary input sizes
  - JSON serialization for o1js compatibility
  - Witness verification capabilities

#### Run State (`sparky-core/src/run_state.rs`)
- Manages constraint generation modes:
  - `ConstraintGeneration`: Building the circuit
  - `WitnessGeneration`: Computing witness values
- Tracks variable allocation
- Stores witness values in HashMap<VarId, FieldElement>
- Uses RefCell for interior mutability

#### Checked Monad (`sparky-core/src/checked.rs`)
- Provides functional constraint generation API
- Key methods:
  - `add_constraint`: Add any constraint type
  - `assert_equal`, `assert_r1cs`, `assert_square`, `assert_boolean`
  - `exists`: Create witness variables
  - `as_prover`: Prover-only computations
- Uses Rust closures with `Box<dyn FnOnce>` to emulate OCaml's monad

### 2. Gates Implementation (`sparky-gates/`)

#### Generic Gate (`generic.rs`)
- Polynomial constraint: Σᵢ aᵢ·xᵢ + Σᵢⱼ bᵢⱼ·xᵢ·xⱼ + c = 0
- Foundation for all other gates
- Handles quadratic terms via auxiliary variables

#### Specialized Gates:
- **Poseidon Hash** (`poseidon.rs`, `poseidon_optimized.rs`, `poseidon_ultra_optimized.rs`)
  - Multiple optimization levels
  - Lazy evaluation variant
  - Compatible with o1js implementation

- **Elliptic Curve Operations** (`ec_ops.rs`, `ec_ops_lazy.rs`)
  - Point addition
  - Scalar multiplication
  - Lazy evaluation for efficiency

- **Range Check** (`range_check.rs`, `range_check_lazy.rs`)
  - Bit decomposition
  - Range validation

- **Foreign Field** (`foreign_field.rs`)
  - Non-native field arithmetic
  - Cross-chain compatibility

- **Lookup Tables** (`lookup.rs`)
  - Table-based constraints

### 3. WASM Bindings (`sparky-wasm/`)

#### FFI Interface (`lib.rs`, `bindings.rs`)
- Main `Snarky` object matching OCaml interface:
  ```rust
  pub struct Snarky {
      pub run: Run,
      pub constraint_system: ConstraintSystem,
      pub field: Field,
      pub gates: Gates,
      pub circuit: Circuit,
  }
  ```

#### Module Exports:
- **Run Module**: Mode control, witness generation
- **ConstraintSystem Module**: Constraint access, JSON export
- **Field Module**: Field arithmetic operations
- **Gates Module**: Gate construction methods
- **Circuit Module**: Circuit compilation

#### Key Methods:
- `constraintSystem.toJson()`: Exports constraint system
- `constraintSystem.rows()`: Returns constraint count
- `run.asProver()`: Execute prover-only code
- `run.inProver()`: Check current mode

### 4. Build System

#### Rust Dependencies:
- `ark-ff`: Field arithmetic
- `serde`: Serialization
- `wasm-bindgen`: WASM bindings
- `num-bigint`: Large integer support

#### Build Profiles:
- Standard release: Maximum optimization
- WASM release: Size-optimized for web

## Architecture Issues for Kimchi Integration

### 1. Constraint System Format Mismatch

**Current (R1CS)**:
```json
{
  "constraints": [
    {"type": "R1CS", "a": {...}, "b": {...}, "c": {...}}
  ],
  "public_input_size": 1,
  "auxiliary_input_size": 10
}
```

**Expected (Kimchi Gates)**:
```json
{
  "gates": [
    {
      "typ": "Generic",
      "wires": [{"row": 0, "col": 0}, ...],
      "coeffs": ["0x1", "0x2", ...]
    }
  ],
  "public_input_size": 1
}
```

### 2. Missing Kimchi Gate Types

Sparky implements R1CS constraints, but Kimchi uses specific gate types:
- Zero, Generic, Poseidon
- CompleteAdd, VarBaseMul, EndoMul, EndoMulScalar
- Lookup, RangeCheck0, RangeCheck1
- ForeignFieldAdd, ForeignFieldMul
- Xor16, Rot64

### 3. Wire System Incompatibility

- Sparky: Uses variable IDs (integers)
- Kimchi: Uses wire references (row, column pairs)
- Kimchi has 15 wires per row, specific layout requirements

### 4. Proof Generation Backend

- Sparky: No proof generation (only constraint generation)
- Kimchi: Full proof generation and verification
- Missing integration point between constraint system and prover

## Entry Points and FFI Interfaces

### JavaScript Entry (`src/bindings/sparky/index.js`)
```javascript
export const sparky = {
  run: sparkyInstance.run,
  constraintSystem: sparkyInstance.constraintSystem,
  field: sparkyInstance.field,
  gates: sparkyInstance.gates,
  circuit: sparkyInstance.circuit
};
```

### WASM Exports (`sparky-wasm/pkg-*/sparky_wasm.js`)
- `Snarky` constructor
- Module getters (run, constraintSystem, field, gates, circuit)
- All methods exposed via wasm-bindgen

### Key Integration Points:
1. **Constraint Generation**: `checked.rs` → `constraint.rs` → `run_state.rs`
2. **WASM Bridge**: `bindings.rs` → JavaScript adapter → o1js
3. **Gate Construction**: `gates/*.rs` → R1CS constraints
4. **JSON Export**: `constraint_system.to_json()` → o1js parser

## Recommendations for Kimchi Integration

### Option 1: Direct Kimchi Integration (Recommended)
1. Add Kimchi as a Rust dependency
2. Replace R1CS constraint system with Kimchi's gate system
3. Implement gate generation methods matching Kimchi's API
4. Use Kimchi's proof generation directly

### Option 2: R1CS-to-Kimchi Converter
1. Keep R1CS internally for simplicity
2. Add conversion layer in WASM bindings
3. Map R1CS constraints to equivalent Kimchi gates
4. Handle wire management in converter

### Option 3: Hybrid Approach
1. Keep high-level API (Checked monad, FieldVar)
2. Replace constraint storage with Kimchi gates
3. Modify gate implementations to generate Kimchi gates directly
4. Maintain compatibility with existing Sparky code

## Implementation Complexity Analysis

### Low Complexity Changes:
- Adding Kimchi gate types to Rust structs
- Implementing JSON serialization for gates
- Basic wire management system

### Medium Complexity Changes:
- Converting R1CS constraints to Kimchi gates
- Implementing all Kimchi gate types
- Wire allocation and management
- Updating WASM bindings

### High Complexity Changes:
- Full Kimchi integration with proof generation
- Optimizing gate generation for performance
- Maintaining backward compatibility
- Complete test suite migration

## Conclusion

Sparky has a well-structured architecture for constraint generation, but needs significant modifications to integrate with Kimchi. The core challenge is transitioning from R1CS representation to Kimchi's gate-based system while maintaining the clean API that Sparky provides. The recommended approach is direct Kimchi integration, which would provide the most maintainable and performant solution long-term.