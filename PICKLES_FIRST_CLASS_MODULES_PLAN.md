# First-Class Modules Plan for Pickles Backend

## Overview

Simplify the Pickles backend architecture by using first-class modules to wrap JavaScript objects (Snarky or Sparky) directly, eliminating circular dependencies.

## Current Problems

1. Circular dependency: OCaml → JS → OCaml → JS
2. Complex bridge code in both directions
3. State management issues with constraint accumulation
4. Unnecessary complexity for a simple problem

## Proposed Solution

Use OCaml's first-class modules to:
1. Accept a JS backend object at runtime
2. Wrap it in a module
3. Use functors to create the appropriate backend
4. Instantiate Pickles with that backend

## Architecture

```
Before: OCaml Pickles → FFI_backend → JS bridge → OCaml bridge → JS backend
After:  OCaml Pickles → JS_backend_wrapper → JS object (Snarky/Sparky)
```

## Implementation Plan

### Phase 1: Define Module Types (30 min)

```ocaml
(* Module type for a wrapped JS backend *)
module type JS_BACKEND = sig
  val backend : Js.Unsafe.any
end

(* Signature for first-class Pickles module *)
module type PICKLES = sig
  val compile : ...
  (* All Pickles exports *)
end
```

### Phase 2: Create Backend Functor (45 min)

```ocaml
(* Functor: JS object → BACKEND *)
module Backend_of_js (JS : JS_BACKEND) : BACKEND = struct
  let js = JS.backend
  
  module Field = struct
    type t = Field.t
    
    module Constant = struct
      type t = Field.Constant.t
      let of_int n = Field.Constant.of_int n
    end
    
    let typ = Field.typ
    
    let add x y =
      let result = Js.Unsafe.meth_call js##.field "add"
        [| field_to_js x; field_to_js y |] in
      field_of_js result
      
    let scale c x =
      let result = Js.Unsafe.meth_call js##.field "scale"
        [| field_to_js x; Obj.magic c |] in
      field_of_js result
  end
  
  (* ... other modules ... *)
end
```

### Phase 3: Modify Pickles Creation (45 min)

```ocaml
(* Function to create Pickles with a specific backend *)
let create_pickles (backend_js : Js.Unsafe.any) : (module PICKLES) =
  let module JS = struct
    let backend = backend_js
  end in
  let module Backend = Backend_of_js(JS) in
  let module Impl = Make_impl(Backend) in
  let module P = Pickles_functor(Impl) in
  (module P : PICKLES)
  
(* Runtime backend selection *)
let get_pickles () =
  if is_sparky_active () then
    let sparky_backend = Js.Unsafe.global##.__snarky##.Snarky in
    create_pickles sparky_backend
  else
    let snarky_backend = 
      (* Create JS wrapper around OCaml Snarky *)
      Js.Unsafe.obj [|
        ("field", Js.Unsafe.obj [|
          ("add", Js.wrap_callback (fun x y -> 
            field_to_js (Impl.Field.add (field_of_js x) (field_of_js y))
          ));
          (* ... other methods ... *)
        |]);
        (* ... other modules ... *)
      |]
    in
    create_pickles snarky_backend
```

### Phase 4: Clean Up (30 min)

1. Remove the complex bridge code:
   - Remove `ocamlBackendBridge` from sparky-adapter.js
   - Remove the Field_bridge module from pickles_bindings.ml
   - Simplify field operations in sparky-adapter.js

2. Update initialization:
   - Ensure JS backend objects are available when needed
   - Proper error handling if backends aren't initialized

### Phase 5: Testing (30 min)

1. Test with Snarky backend
2. Test with Sparky backend
3. Verify VK generation works correctly
4. Check constraint accumulation

## Benefits

1. **Simplicity**: Direct OCaml → JS calls only
2. **No Circular Dependencies**: Clean unidirectional flow
3. **Runtime Flexibility**: Easy to switch backends
4. **Type Safety**: First-class modules maintain type safety
5. **Testability**: Can inject mock backends

## Migration Steps

1. Implement new architecture alongside existing
2. Test thoroughly
3. Remove old bridge code
4. Update documentation

## Success Criteria

1. Both backends work through the same interface
2. VK generation produces unique keys for different circuits
3. No circular dependencies
4. Cleaner, simpler code

## Timeline

- Phase 1: 30 minutes
- Phase 2: 45 minutes  
- Phase 3: 45 minutes
- Phase 4: 30 minutes
- Phase 5: 30 minutes

Total: ~3 hours