# Sparky Integration Reminders and TODOs

## Critical Implementation Tasks

### 1. Field Operations
- [x] ~~**Implement `field.readVar` for variables**~~: ✅ FIXED - Now works for constants, variables, and compound expressions by converting o1js FieldVar format to Sparky Cvar format
- [x] ~~**Implement proper `field.random`**~~: ✅ FIXED - Now uses Fp.random() which provides cryptographically secure random field elements using rejection sampling with crypto.randomBytes

### 2. Missing Gate Operations
- [ ] **Implement range check gates**: `rangeCheck0` and `rangeCheck1` are not available in Sparky adapter
- [ ] **Implement EC operations**: `ecAdd`, `ecScale`, `ecEndoscale`, `ecEndoscalar` need implementation
- [ ] **Implement lookup gates**: `lookup` gate functionality missing
- [ ] **Implement foreign field operations**: `foreignFieldAdd`, `foreignFieldMul` not implemented

### 3. Constraint System
- [ ] **Fix constraint system format**: Sparky returns string format, needs to match Snarky's object format
- [ ] **Implement proper row counting**: `constraintSystem.rows()` returns 0 even with constraints
- [ ] **Add constraint system JSON serialization**: Match Snarky's JSON format

### 4. Proof System Integration
- [ ] **Fix ZkProgram compilation**: Currently switches back to Snarky during compilation
- [ ] **Implement proof generation**: Full proof creation pipeline needs Sparky support
- [ ] **Add proof verification**: Verify proofs created with Sparky backend

### 5. WASM Bindings
- [ ] **Expose missing Rust functions**: Many Sparky functions may not be exported to WASM
- [ ] **Add field variable creation**: Need proper methods to create field variables
- [ ] **Implement witness generation**: Proper witness array handling

### 6. Placeholder Implementations to Fix
- [ ] **`toSparkyField` conversion**: Currently basic, needs full AST traversal
- [ ] **EC operations stubs**: All return placeholder values
- [ ] **Lookup operations**: Currently no-ops
- [ ] **Poseidon integration**: Exists in Sparky but not connected

### 7. Testing
- [ ] **Create comprehensive comparison tests**: Test every API method with both backends
- [ ] **Add performance benchmarks**: Compare Sparky vs Snarky performance
- [ ] **Test with real zkApps**: Ensure compatibility with existing applications

## Notes

- The adapter pattern works well for basic operations
- Main challenge is API mismatch between OCaml and Rust implementations
- Need to decide whether to adapt Sparky to match Snarky API or create a new unified API

## Priority Order

1. Fix `field.readVar` for variables (blocks many operations)
2. Implement proper constraint system format conversion
3. Fix proof generation pipeline
4. Add missing gate operations
5. Complete EC operations
6. Add comprehensive tests