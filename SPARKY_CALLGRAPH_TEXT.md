# Sparky Call Graph - Text Version

**Last Updated**: July 1, 2025

## Recent Updates

### OCaml → JavaScript Bridge Implementation (July 1, 2025)
- Added `Field_bridge` module in `pickles_bindings.ml` for OCaml→JS field operations
- Registered functions in `globalThis.ocamlBackendBridge` for backend routing
- Added field conversion helpers in `sparky-adapter.js`
- See DEV.md Phase 4 for complete details

## WASM Entry Points → Call Hierarchies

### Field Operations

#### fieldExists
```
fieldExists
├── with_run_state
├── exists_impl
    ├── alloc_var
    │   ├── has_witness
    │   └── set_variable_value
    └── cvar_to_js
```

#### fieldConstant
```
fieldConstant
├── with_run_state
├── constant
    ├── from_str
    └── cvar_to_js
```

#### fieldAdd
```
fieldAdd
├── with_run_state
├── linear_combination
    ├── add
    ├── scale
    └── var
```

#### fieldScale
```
fieldScale
├── with_run_state
├── scale
    ├── linear_combination
    └── mul
```

#### fieldMul (IMPLEMENTED)
```
fieldMul
├── with_run_state
├── mul_impl
    ├── js_to_cvar (x, y)
    ├── check if constant multiplication
    │   ├── both constant → multiply and return constant
    │   ├── one constant → use scale operation
    │   └── both variables → create witness and constraint
    ├── exists (create witness for result)
    ├── assert_r1cs(x, y, result)
    └── cvar_to_js (return result)
```

#### fieldSub (IMPLEMENTED)
```
fieldSub
├── sub_impl
    ├── js_to_cvar (x, y)
    ├── scale y by -1 (negate)
    ├── add x and negated y
    └── cvar_to_js (return result)
```

#### fieldSquare (IMPLEMENTED)
```
fieldSquare
├── with_run_state
├── square_impl
    ├── js_to_cvar (x)
    ├── check if constant
    │   ├── constant → square and return constant
    │   └── variable → create witness and constraint
    ├── exists (create witness for result)
    ├── assert_square(x, result)
    └── cvar_to_js (return result)
```

#### fieldInv (IMPLEMENTED)
```
fieldInv
├── with_run_state
├── inv_impl
    ├── js_to_cvar (x)
    ├── check if constant
    │   ├── constant → compute inverse or error if zero
    │   └── variable → create witness and constraint
    ├── exists (create witness for 1/x)
    ├── assert_r1cs(x, inv, 1)
    └── cvar_to_js (return result)
```

#### fieldDiv (Uses fieldInv)
```
fieldDiv (in sparky-adapter.js)
├── fieldInv(y)
└── fieldMul(x, yInv)
```

#### fieldAssertEqual
```
fieldAssertEqual
├── with_run_state
├── add_constraint
│   ├── linear_combination
│   └── get_constraint_system
└── assert_equal
    └── reduce_lincom
```

#### fieldAssertMul
```
fieldAssertMul
├── with_run_state
├── assert_r1cs
    ├── reduce_lincom
    ├── add_constraint
    ├── linear_combination
    └── mul
```

#### fieldAssertSquare
```
fieldAssertSquare
├── with_run_state
├── assert_square
    ├── reduce_lincom
    ├── add_constraint
    └── square
```

#### fieldAssertBoolean
```
fieldAssertBoolean
├── with_run_state
├── assert_boolean
    ├── reduce_lincom
    ├── add_constraint
    ├── is_zero
    └── one
```

#### fieldReadVar
```
fieldReadVar
├── with_run_state_ref
├── get_variable_value
    └── to_string
```

### Gate Operations

#### gatesZero
```
gatesZero
├── with_run_state
├── zero_gate
    ├── add_constraint
        └── linear_combination
```

#### gatesGeneric
```
gatesGeneric
├── with_run_state
├── generic_gate
    ├── add_constraint
    ├── linear_combination
        └── constant
```

#### gatesEcAdd
```
gatesEcAdd
├── with_run_state
├── ec_add_gate
    ├── add_constraint
    ├── assert_r1cs
    └── linear_combination
```

#### gatesEcDouble
```
gatesEcDouble
├── with_run_state
├── ec_double_gate
    ├── add_constraint
    └── assert_r1cs
```

#### gatesEcScalarMult
```
gatesEcScalarMult
├── with_run_state
├── ec_scalar_mult_gate
    ├── add_constraint
    └── range_check_0
```

#### gatesRangeCheck0
```
gatesRangeCheck0
├── with_run_state
├── range_check_0
    ├── add_constraint
    └── assert_r1cs
```

#### gatesRangeCheck1
```
gatesRangeCheck1
├── with_run_state
├── range_check_1
    └── add_constraint
```

#### gatesRangeCheck64
```
gatesRangeCheck64
├── with_run_state
├── range_check_64
    ├── add_constraint
    └── range_check_0
```

#### gatesRaw
```
gatesRaw
├── with_run_state
├── raw_gate_impl
    └── add_constraint
```

### Poseidon Operations

#### poseidonUpdate
```
poseidonUpdate
├── with_run_state
├── absorb_input_into_state
├── permute
    └── round_function
        ├── s_box
        ├── mix_layer
        └── add_round_constants
```

#### poseidonHashToGroup
```
poseidonHashToGroup
├── with_run_state
├── poseidon_hash
    └── HybridPoseidon
        ├── permute
        └── round_function
```

#### gatesPoseidonHash2
```
gatesPoseidonHash2
├── with_run_state
├── poseidon_hash
    ├── round_function
    │   └── s_box
    └── add_constraint
```

#### gatesPoseidonHashArray
```
gatesPoseidonHashArray
├── with_run_state
├── poseidon_hash
    ├── absorb_input_into_state
    ├── permute
    └── add_constraint
```

### Run Control

#### runAsProver
```
runAsProver
├── with_run_state
│   └── run_state
├── get_mode
└── set_mode
```

#### runInProver
```
runInProver
├── with_run_state_ref
└── get_mode
```

#### runInProverBlock
```
runInProverBlock
├── with_run_state_ref
└── get_mode
```

#### runConstraintMode
```
runConstraintMode
├── with_run_state
└── set_mode
```

#### runWitnessMode
```
runWitnessMode
├── with_run_state
└── set_mode
```

#### runSetEvalConstraints
```
runSetEvalConstraints
├── with_run_state
└── set_eval_constraints
```

#### runReset
```
runReset
└── reset_run_state
    └── clear_constraint_system
```

#### runEnterConstraintSystem
```
runEnterConstraintSystem
├── with_run_state
│   └── get_constraint_system
└── set_mode
```

#### runEnterGenerateWitness
```
runEnterGenerateWitness
├── with_run_state
└── set_mode
    └── has_witness
```

#### runEnterAsProver
```
runEnterAsProver
├── with_run_state
└── set_mode
```

### Constraint System Operations

#### constraintSystemRows
```
constraintSystemRows
├── with_run_state_ref
└── get_constraint_system
    └── num_constraints
```

#### constraintSystemDigest
```
constraintSystemDigest
├── with_run_state_ref
└── get_constraint_system
    └── digest
        └── poseidon_hash
```

#### constraintSystemToJson
```
constraintSystemToJson
├── with_run_state_ref
└── get_constraint_system
    └── serialize_constraints
        └── to_json
```

### Foreign Field Operations

#### foreignFieldFromHex
```
foreignFieldFromHex
├── with_run_state
└── foreign_field_from_hex_impl
    └── from_str
```

#### foreignFieldFromDecimal
```
foreignFieldFromDecimal
├── with_run_state
└── foreign_field_from_decimal_impl
    └── from_str
```

#### foreignFieldRangeCheck
```
foreignFieldRangeCheck
├── with_run_state
└── range_check_foreign_field_impl
    └── limb_decomposition
        └── range_check_0
```

#### foreignFieldAdd
```
foreignFieldAdd
├── with_run_state
└── foreign_field_add_impl
    ├── add_constraint
    ├── assert_r1cs
    └── limb_decomposition
```

#### foreignFieldMul
```
foreignFieldMul
├── with_run_state
└── foreign_field_mul_impl
    ├── assert_r1cs
    ├── limb_decomposition
    └── range_check_0
```

#### testSecp256k1Field
```
testSecp256k1Field
├── with_run_state
├── foreign_field_mul_impl
└── foreign_field_add_impl
```

## Summary Statistics

- **Total WASM Entry Points**: 46
- **Categories**:
  - Field Operations: 18
  - Gate Operations: 9
  - Poseidon Operations: 4
  - Run Control: 10
  - Constraint System: 3
  - Foreign Field: 6

## Most Common Core Functions

1. **with_run_state**: Called by almost every entry point
2. **add_constraint**: Core constraint system operation
3. **assert_r1cs**: R1CS constraint assertion
4. **linear_combination**: Field arithmetic combination
5. **get_constraint_system**: Access constraint system

## Call Depth Analysis

- **Depth 1**: Direct calls from entry points (e.g., with_run_state, zero_gate)
- **Depth 2**: Secondary calls (e.g., add_constraint from zero_gate)
- **Depth 3**: Tertiary calls (e.g., linear_combination from add_constraint)
- **Maximum Depth**: 3 levels in most cases

## Architecture Insights

1. **Run State Management**: Almost all operations go through `with_run_state` or `with_run_state_ref`
2. **Constraint Building**: Most gates ultimately call `add_constraint`
3. **Field Operations**: Built on `linear_combination` and basic arithmetic
4. **Poseidon**: Complex multi-level structure with rounds and permutations
5. **Foreign Fields**: Specialized operations with limb decomposition
6. **Constraint Reduction**: All assertion functions now call `reduce_lincom` before creating constraints

## Critical Issue Discovered (July 1, 2025)

### Sparky Constraint Generation Problem

**Finding**: Sparky is not generating proper arithmetic constraints. Instead of circuit logic, it only generates trivial variable assignment constraints.

**Evidence**:
- All Sparky VKs have identical hash: `18829260448603674120636678492061729587559537667160824024435698932992912500478n`
- Only generates Generic gates with coefficients `[1, -1, 0, 0, 0]` (variable assignments)
- No multiplication/addition constraints captured

**Call Graph Impact**:
```
fieldAssertEqual
├── with_run_state
├── add_constraint
    ├── reduce_lincom (working but receives wrong input)
    └── ConstraintSystem::add_constraint
        └── Creates Generic gate with [1, -1, 0, 0, 0] pattern only
```

**Root Cause Suspects**:
1. Field operations (mul, add) not calling proper constraint generation
2. Mode switching issue - may be in witness mode during constraint generation
3. Bridge between JS field operations and Rust constraint system broken
4. Linear combination builder not constructing proper arithmetic expressions

**Next Investigation Steps**:
- Trace fieldMul → assertMul → add_constraint call path
- Verify constraintMode() is active during circuit compilation
- Check if linear_combination is building correct expressions
- Compare Snarky vs Sparky constraint construction for identical operations

## OCaml → JavaScript Bridge Architecture (July 1, 2025)

### Overview
The OCaml → JavaScript bridge allows OCaml Pickles code to call JavaScript field operations when Sparky backend is active.

### Bridge Components

#### OCaml Side (pickles_bindings.ml)
```
Field_bridge module
├── field_to_js / field_of_js (field conversions)
├── constant_to_js / constant_of_js (constant conversions)
├── add_callback → backend_field_add → Field.add
├── mul_callback → backend_field_mul → Field.mul + assert_r1cs
├── sub_callback → backend_field_sub → Field.scale(-1) + Field.add
├── scale_callback → backend_field_scale → Field.scale
├── assert_equal_callback → backend_assert → Constraint.equal
├── assert_mul_callback → backend_assert → Constraint.r1cs
└── assert_square_callback → backend_assert → Constraint.square
```

#### JavaScript Side (sparky-adapter.js)
```
globalThis.__snarky.Snarky
├── fieldFromOcaml (identity function for Sparky)
├── fieldToOcaml (identity function for Sparky)
├── constantFromOcaml (converts numbers/bigints to Fp)
└── constantToOcaml (identity function for Sparky)
```

#### Global Registration
```
globalThis.ocamlBackendBridge
├── fieldAdd
├── fieldMul
├── fieldSub
├── fieldScale
├── fieldAssertEqual
├── fieldAssertMul
├── fieldAssertSquare
└── isActiveSparkyBackend
```

### Call Flow Example
```
JavaScript zkProgram execution
→ OCaml Pickles compilation
→ Field_bridge.mul_callback invoked
→ Checks is_sparky_active()
→ If true: Routes to FFI_backend
→ FFI_backend calls JavaScript Sparky methods
→ Returns result to OCaml
→ OCaml continues compilation with Sparky constraints
```

## Phase 3: First-Class Modules Architecture (July 1, 2025)

### Overview
Phase 3 implements first-class modules support for dynamic backend selection, allowing runtime switching between Snarky and Sparky while maintaining API compatibility.

### Architecture Components

#### New Module Types
```ocaml
PICKLES_S - Complete Pickles module signature
├── Statement_with_proof = Pickles.Statement_with_proof
├── Side_loaded = Pickles.Side_loaded  
├── Tag = Pickles.Tag
├── Verification_key = Pickles.Verification_key
├── Proof = Pickles.Proof
├── Provers = Pickles.Provers
├── Inductive_rule = Pickles.Inductive_rule
├── compile_promise : <complex_signature>
└── verify_promise : <statement_list> -> unit Or_error.t Promise.t
```

#### First-Class Module Functions
```ocaml
create_pickles_with_backend : Js.Unsafe.any -> (module PICKLES_S)
├── Input: JavaScript backend object
├── Output: First-class Pickles module
└── Current: Returns standard Pickles (future: custom backend)

create_snarky_js_wrapper : unit -> Js.Unsafe.any
├── Creates JavaScript wrapper for OCaml Snarky
├── Exports all backend operations to JavaScript
├── Field ops: fieldConstantOfInt, fieldTyp, fieldScale, fieldAdd
├── Constraint ops: constraintEqual, constraintR1CS, constraintSquare  
├── Type ops: typUnit, typArray, typTuple2, typTransport, typProverValue
├── Core ops: exists, assert
├── Prover ops: asProverReadVar
└── Internal ops: checkedReturn

get_current_pickles : unit -> (module PICKLES_S)
├── Checks is_sparky_active()
├── Returns appropriate Pickles module
└── Future: Will return Sparky-based Pickles
```

#### Updated Compilation Flow
```
pickles_compile
├── Get current Pickles module: let (module CurrentPickles : PICKLES_S) = get_current_pickles ()
├── Use dynamic module: CurrentPickles.compile_promise
├── Update verify function: CurrentPickles.Proof.t
├── Update get_vk function: CurrentPickles.Side_loaded.Verification_key
└── Maintain full backward compatibility
```

#### JavaScript Exports
```javascript
pickles.createPicklesWithBackend - Create Pickles with custom backend
pickles.createSnarkyJsWrapper - Get JS wrapper for OCaml Snarky  
pickles.getCurrentPickles - Returns "snarky" or "sparky" string
```

### Backend Selection Strategy
```
Runtime Check → get_current_pickles() → Dynamic Module Selection
├── is_sparky_active() = true → Future: Sparky-based Pickles
└── is_sparky_active() = false → Standard Snarky-based Pickles
```

### Implementation Benefits
1. **API Compatibility**: Existing code continues to work unchanged
2. **Runtime Selection**: Backend choice made at execution time
3. **Type Safety**: First-class modules preserve type information
4. **Extensibility**: Easy to add new backends in the future
5. **Performance**: No overhead when not switching backends

### Status
✅ Phase 3 Complete - Infrastructure for backend switching implemented
🔄 Next: Create actual Sparky-based Pickles module
📋 Future: Performance benchmarking and optimization