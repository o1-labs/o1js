# Constraint Generation Call Graphs

This document traces the complete call chains for constraint generation in o1js, showing how execution flows between JavaScript, Rust (Sparky), and OCaml (Pickles).

## 1. Field Multiplication Constraint Generation

This shows what happens when you call `field1.mul(field2)` during constraint generation:

### JavaScript Layer
```
Field.mul(other)                              // src/lib/provable/field.ts
├── toFieldVar(this)                         // Convert to internal representation
├── toFieldVar(other)                        // Convert other to internal representation
└── Snarky.field.mul(x, y)                   // Call backend
    └── [Backend Switch]
        ├── [If Snarky] → OCaml bindings
        └── [If Sparky] → sparky-adapter.js
```

### Sparky Path (JavaScript → Rust)
```
sparky-adapter.js: field.mul(x, y)            // Line 478
├── getFieldModule().mul(x, y)                // Get Sparky WASM field module
└── sparkyInstance.field.mul(x, y)           // Call into WASM
    └── [WASM Boundary] → Rust
```

### Rust Layer (Sparky WASM)
```
field_mul(x: JsValue, y: JsValue)             // sparky-wasm/src/lib.rs:592
├── js_to_cvar(&x)?                          // Convert JS value to Cvar
├── js_to_cvar(&y)?                          // Convert JS value to Cvar
└── checked::mul(x_cvar, y_cvar)             // sparky-core/src/checked.rs
    ├── with_run_state(|state| ...)          // Access global state
    ├── match (x, y) {                       // Optimize based on operand types
    │   ├── (Constant, Constant) → ...       // Constant folding
    │   ├── (_, Constant(0)) → Constant(0)   // Multiplication by zero
    │   ├── (x, Constant(1)) → x             // Multiplication by one
    │   └── _ → {                            // General case
    │       ├── exists(|| x_val * y_val)     // Create witness for result
    │       └── assert_r1cs(x, y, result)    // Add multiplication constraint
    │   }
    └── cvar_to_js(result)                   // Convert back to JS
```

### Constraint System Update (Rust)
```
assert_r1cs(a: Cvar, b: Cvar, c: Cvar)        // sparky-core/src/checked.rs
├── with_run_state(|state| ...)
└── state.constraint_system.add_constraint()   // Add to global constraint system
    ├── reduce_lincom(terms)                 // Optimize linear combination
    └── gates.push(constraint)               // Store in constraint system
```

## 2. ZkProgram.compile() Flow

This traces the complete compilation process across all three languages:

### JavaScript Layer (Entry Point)
```
ZkProgram.compile()                           // src/lib/proof-system/zkprogram.ts
├── initializeBindings()                      // Ensure backend is loaded
├── Provable.constraintSystem(() => {...})    // Generate constraint system
│   └── method(publicInput, ...privateInputs) // Execute circuit logic
└── Pickles.compile(rules, ...)              // Call OCaml compiler
```

### OCaml Layer (Pickles Compilation)
```
Pickles.compile(rule_list)                    // src/bindings/ocaml/lib/pickles_bindings.ml
├── compile_impl(rule_list)                   // Line 431
│   ├── List.map (analyze_rule) rules        // For each method
│   │   └── analyze_rule(rule)                // Line 446
│   │       ├── is_sparky_active()           // Check if using Sparky backend
│   │       ├── [If Sparky] {
│   │       │   ├── start_constraint_accumulation()  // JS call
│   │       │   ├── rule##.main(public_input)       // Execute circuit in JS
│   │       │   ├── get_accumulated_constraints()   // JS call - retrieve constraints
│   │       │   └── add_sparky_constraints_to_system() // Convert to OCaml format
│   │       └── [If Snarky] → Direct OCaml execution
│   └── Backend.Keypair.create(constraint_systems)
│       └── Generate verification key from constraints
└── Return { verificationKey, prover, verify }
```

### Constraint Bridge (OCaml → JavaScript → Rust)
```
start_constraint_accumulation()               // OCaml → JS
└── sparky-adapter.js                        // Line 1141
    ├── isActiveSparkyBackend() check
    ├── isCompilingCircuit = true            // Set compilation flag
    └── getRunModule().constraintMode()      // Set Sparky to constraint mode
        └── [WASM] → Rust: set_mode(ConstraintGeneration)
```

### Circuit Execution (JavaScript)
```
rule##.main(public_input)                     // Circuit method execution
└── method body executes...
    ├── Field operations (mul, add, etc.)    // Each creates constraints
    ├── Provable.witness(() => ...)          // Create witness variables
    └── field.assertEquals(expected)         // Assert constraints
```

### Constraint Retrieval (OCaml ← JavaScript ← Rust)
```
get_accumulated_constraints()                 // OCaml calls JS
└── sparky-adapter.js                        // Line 1162
    ├── getRunModule().getConstraintSystem() // Get current CS from Rust
    └── getConstraintSystemModule().toJson(cs) // Convert to JSON
        └── [WASM] → Rust
            ├── constraint_system_to_json()   // Serialize gates
            └── Return { gates: [...], public_input_size: N }
```

### Constraint System Conversion (OCaml)
```
add_sparky_constraints_to_system(constraints) // Line 45, pickles_bindings.ml
├── List.iter (fun constraint -> ...)         // For each Sparky constraint
│   ├── extract_coefficients(constraint)     // Parse coefficient strings
│   ├── create_typ(constraint.typ)           // Convert gate type
│   └── Constraint.add_constraint(typ, ...)  // Add to OCaml system
└── Backend.Constraint_system.finalize()      // Prepare for VK generation
```

## 3. Constraint System State Management

### Global State (Rust)
```
RunState (sparky-core/src/run.rs)
├── mode: Mode                               // Witness/ConstraintGeneration
├── constraint_system: ConstraintSystem      // Accumulates constraints
│   ├── gates: Vec<Gate>                    // Constraint gates
│   └── public_input_size: usize
└── witness_values: Vec<Field>              // For prover mode

Mode Transitions:
- start_constraint_accumulation() → ConstraintGeneration
- enterAsProver() → Witness
- endConstraintAccumulation() → resets state
```

## 4. Common Issues and Debug Points

### Issue: Empty Constraint Systems
```
Problem Flow:
1. OCaml: start_constraint_accumulation()
2. JS: Sets isCompilingCircuit = true
3. JS: Circuit executes, creates witnesses
4. Rust: Constraints generated BUT...
5. JS: getConstraintSystem() returns empty ❌

Root Cause:
- runReset() called too early
- Mode not set correctly
- Constraint system not accessible from current state
```

### Issue: All VKs Identical
```
Problem Flow:
1. Different circuits compile
2. Different constraints generated (verified by logs)
3. OCaml receives constraints
4. VK generation produces same hash ❌

Root Cause:
- Missing field operations (mul, sub, square, inv)
- Constraints are trivial variable assignments [1, -1, 0, 0, 0]
- No arithmetic constraints capture circuit logic
```

## 5. Constraint Coefficient Format

### Gate Structure
```javascript
{
  typ: "Generic",  // Gate type
  wires: [         // Wire connections
    { row: 0, col: 0 },  // Left input
    { row: 0, col: 1 },  // Right input
    { row: 0, col: 2 },  // Output
    { row: 1, col: 0 },  // Fourth wire
    { row: 1, col: 1 }   // Fifth wire
  ],
  coeffs: [        // 15 coefficients defining the constraint
    "1",           // c[0]: left coefficient
    "0",           // c[1]: right coefficient
    "0",           // c[2]: output coefficient
    "0",           // c[3]: multiplication coefficient
    "-12",         // c[4]: constant term
    // ... 10 more coefficients
  ]
}
```

### Coefficient Meanings (Generic Gate)
- `[1, 0, 0, 0, -12]`: Represents `1*left + 0*right + 0*output + 0*(left*right) - 12 = 0`
- `[1, -1, 0, 0, 0]`: Represents `left - right = 0` (simple assignment)
- `[0, 0, 1, -1, 0]`: Represents `output - (left*right) = 0` (multiplication)

## 6. Fix Implementation Status

### ✅ Completed
1. Field arithmetic operations added to sparky-adapter.js
2. Rust implementations for mul, sub, square, inv
3. Constraint bridge infrastructure working
4. Mode management fixed

### ❌ Current Issue
The constraint bridge can't retrieve constraints because:
1. `constraintSystemToJson()` returns empty even after operations
2. Likely timing issue or state management problem
3. Need to ensure constraints are committed before retrieval

### 🔧 Next Steps
1. Debug why `getConstraintSystem()` returns empty
2. Check if constraints need explicit finalization
3. Verify mode stays in ConstraintGeneration throughout
4. Ensure runReset() not called prematurely