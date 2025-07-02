# Pickles Functor Implementation Plan

## Overview

This document outlines the plan to refactor Pickles to use a functor-based architecture, allowing it to work with both OCaml (Snarky) and JavaScript (Sparky) backends through a unified interface.

## Problem Statement

Currently, Pickles is hardcoded to use the OCaml Snarky implementation. When we switch to Sparky:
1. Field operations still route through OCaml's implementation
2. Constraints are generated in OCaml's constraint system
3. The constraint bridge tries to retrieve from Sparky's (empty) constraint system
4. Result: All Sparky VKs are identical because no constraints are captured

## Solution: Functor-Based Backend Abstraction

Make Pickles a functor that takes an implementation module, allowing us to:
- Use direct OCaml implementation for Snarky
- Use JavaScript FFI implementation for Sparky
- Test the FFI implementation with Snarky first
- Ensure all operations route through the correct backend

## Architecture

```ocaml
module type BACKEND = sig
  (* Low-level backend operations *)
  type field
  type field_var
  type boolean_var
  type constraint_system
  
  val field_add : field_var -> field_var -> field_var
  val field_mul : field_var -> field_var -> field_var
  (* ... other operations ... *)
end

module type IMPL = sig
  (* High-level Snarky interface *)
  include Snarky_backendless.Snark.S
end

module Make_impl (B : BACKEND) : IMPL = struct
  (* Implementation using backend B *)
end

module Pickles_functor (Impl : IMPL) = struct
  (* Current Pickles implementation, parameterized by Impl *)
end
```

## Implementation Steps

### Phase 1: Extract Current Implementation (2-3 hours)

1. **Create backend interface module** (`backend_intf.ml`)
   - [ ] Define `BACKEND` module type with all required operations
   - [ ] Define `FIELD_OPS`, `BOOL_OPS`, `CONSTRAINT_OPS` signatures
   - [ ] Define state management operations

2. **Extract OCaml backend** (`backend_snarky.ml`)
   - [ ] Create `Snarky_backend` module implementing `BACKEND`
   - [ ] Move current direct implementations here
   - [ ] Ensure it compiles and passes existing tests

3. **Create IMPL functor** (`impl_functor.ml`)
   - [ ] Define `Make_impl` functor taking `BACKEND`
   - [ ] Implement full `Snarky_backendless.Snark.S` interface
   - [ ] Map high-level operations to backend operations

### Phase 2: Create FFI Backend (3-4 hours)

1. **Define JavaScript interface** (`backend_ffi.ml`)
   - [ ] Create `FFI_backend` module implementing `BACKEND`
   - [ ] Use `Js_of_ocaml` bindings to call JavaScript functions
   - [ ] Handle data conversion between OCaml and JavaScript

2. **Update JavaScript side** (`sparky-adapter.js`)
   - [ ] Ensure all required operations are exposed
   - [ ] Add any missing field operations
   - [ ] Verify proper return value formats

3. **Error handling**
   - [ ] Wrap JavaScript calls with proper exception handling
   - [ ] Convert JavaScript errors to OCaml exceptions
   - [ ] Add logging for debugging

### Phase 3: Refactor Pickles (2-3 hours)

1. **Make Pickles a functor** (`pickles_functor.ml`)
   - [ ] Change `module Pickles = struct` to `module Pickles_functor (Impl : IMPL) = struct`
   - [ ] Replace all `Impl.` references to use the functor parameter
   - [ ] Update module signatures

2. **Create backend selection** (`pickles_bindings.ml`)
   - [ ] Add backend detection logic
   - [ ] Instantiate appropriate Impl based on active backend
   - [ ] Create Pickles instance with selected Impl

3. **Update constraint bridge**
   - [ ] Remove current constraint accumulation hack
   - [ ] Simplify to just backend selection
   - [ ] Test constraint flow with both backends

### Phase 4: Testing and Validation (2-3 hours)

1. **Test FFI with Snarky**
   - [ ] Create test comparing direct vs FFI with Snarky backend
   - [ ] Verify identical constraint generation
   - [ ] Check performance impact

2. **Test with Sparky**
   - [ ] Verify constraints are generated in Sparky
   - [ ] Check VK uniqueness for different programs
   - [ ] Validate constraint coefficients

3. **Integration tests**
   - [ ] Run existing test suite with both backends
   - [ ] Add backend-switching tests
   - [ ] Verify proof generation works

## Detailed Operation Mappings

### Field Operations
```ocaml
(* BACKEND *)
val field_add : field_var -> field_var -> field_var
val field_mul : field_var -> field_var -> field_var
val field_sub : field_var -> field_var -> field_var
val field_div : field_var -> field_var -> field_var
val field_square : field_var -> field_var
val field_inv : field_var -> field_var
val field_equal : field_var -> field_var -> boolean_var

(* FFI Implementation *)
let field_add x y =
  Js.Unsafe.meth_call 
    (Js.Unsafe.global##.__snarky)
    "fieldAdd" [| to_js_field x; to_js_field y |]
  |> of_js_field
```

### Constraint Operations
```ocaml
(* BACKEND *)
val assert_equal : field_var -> field_var -> unit
val assert_r1cs : field_var -> field_var -> field_var -> unit
val assert_square : field_var -> field_var -> unit
val assert_boolean : boolean_var -> unit

(* FFI Implementation *)
let assert_equal x y =
  Js.Unsafe.meth_call
    (Js.Unsafe.global##.__snarky)
    "assertEqual" [| to_js_field x; to_js_field y |]
```

### Witness Generation
```ocaml
(* BACKEND *)
val exists : typ:'a typ -> compute:('a option -> 'a) -> 'a

(* FFI Implementation *)
let exists ~typ ~compute =
  let compute_js = Js.wrap_callback (fun () ->
    let value = compute None in
    typ_to_js typ value
  ) in
  Js.Unsafe.meth_call
    (Js.Unsafe.global##.__snarky##.run)
    "exists" [| typ_to_js_typ typ; compute_js |]
  |> of_js_typ typ
```

## Key Considerations

### 1. Data Conversion
- Field elements: OCaml arrays ↔ JavaScript arrays
- Boolean variables: OCaml type ↔ JavaScript objects
- Constraint systems: OCaml records ↔ JavaScript objects

### 2. Performance
- FFI calls have overhead, but compilation is not latency-sensitive
- Batch operations where possible
- Cache converted values

### 3. Error Handling
- JavaScript exceptions must be caught and converted
- Type mismatches should give clear errors
- Add debug logging for constraint operations

### 4. State Management
- Backend state (mode, constraint system) must be consistent
- Handle concurrent operations safely
- Clear state between compilations

## Success Criteria

1. **Identical Behavior**: FFI backend with Snarky produces identical constraints to direct implementation
2. **Unique VKs**: Different Sparky programs generate different verification keys
3. **Correct Constraints**: Sparky generates proper arithmetic constraints, not just variable assignments
4. **All Tests Pass**: Existing test suite works with both backends
5. **Performance**: Compilation time increase < 2x with FFI backend

## Risk Mitigation

1. **Test FFI layer independently**: Use Snarky backend first to validate FFI correctness
2. **Incremental implementation**: Start with minimal operations, add more gradually
3. **Extensive logging**: Add debug output for all FFI calls during development
4. **Fallback plan**: Keep current implementation available as escape hatch

## Timeline

- Phase 1: 2-3 hours (Extract current implementation)
- Phase 2: 3-4 hours (Create FFI backend)
- Phase 3: 2-3 hours (Refactor Pickles)
- Phase 4: 2-3 hours (Testing and validation)

**Total estimate**: 10-13 hours of focused work

## Next Steps

1. Start with Phase 1: Extract current implementation into backend module
2. Test extraction doesn't break anything
3. Proceed to FFI implementation
4. Iterate based on test results

This plan provides a clear path to solving the constraint generation issue while maintaining compatibility with existing code.