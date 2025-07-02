# Option 1: Complete Functor Implementation Plan

## Overview

Route all JavaScript field operations through OCaml FFI backend when Sparky is active, ensuring all constraints go through the same constraint system.

## Architecture

```
Current Flow (Broken):
JS Field.mul() → sparky-adapter.js → Sparky WASM → Sparky constraint system
                                                        ↓
                                                    (Can't retrieve)

New Flow (Fixed):
JS Field.mul() → sparky-adapter.js → OCaml FFI → FFI_backend → back to JS → Sparky WASM
                                           ↓
                                    (OCaml constraint system)
```

## Implementation Steps

### Step 1: Add OCaml → JavaScript Bridge Functions

In pickles_bindings.ml, expose the backend operations to JavaScript:

```ocaml
(* Export backend operations for JavaScript to call *)
let () =
  let backend_field_add = Js.wrap_callback (fun x y ->
    let x_field = field_of_js x in
    let y_field = field_of_js y in
    let result = backend_exists Field.typ ~compute:(fun () ->
      match get_active_backend () with
      | Current -> Current_backend.Field.add x_field y_field
      | FFI -> FFI_backend.Field.add x_field y_field
    ) in
    field_to_js result
  ) in
  
  let backend_field_mul = Js.wrap_callback (fun x y ->
    (* Similar implementation *)
  ) in
  
  (* Register in global object *)
  Js.Unsafe.global##.ocamlBackendBridge := Js.Unsafe.obj [|
    ("fieldAdd", backend_field_add);
    ("fieldMul", backend_field_mul);
    (* ... other operations ... *)
  |]
```

### Step 2: Modify sparky-adapter.js

Route field operations through OCaml when in constraint generation mode:

```javascript
// In sparky-adapter.js
field: {
  add(x, y) {
    // If we're in constraint generation mode and OCaml bridge exists
    if (isCompilingCircuit && globalThis.ocamlBackendBridge) {
      // Route through OCaml FFI backend
      return globalThis.ocamlBackendBridge.fieldAdd(x, y);
    }
    // Otherwise use Sparky directly
    const result = getFieldModule().add(x, y);
    return Array.isArray(result) ? result : cvarToFieldVar(result);
  },
  
  mul(x, y) {
    if (isCompilingCircuit && globalThis.ocamlBackendBridge) {
      return globalThis.ocamlBackendBridge.fieldMul(x, y);
    }
    const result = getFieldModule().mul(x, y);
    return Array.isArray(result) ? result : cvarToFieldVar(result);
  },
  // ... similar for other operations
}
```

### Step 3: Fix FFI_backend to Call Back to JavaScript

The FFI_backend should use the actual Sparky implementation:

```ocaml
module FFI_backend : BACKEND = struct
  (* ... existing code ... *)
  
  module Field = struct
    let add (x : t) (y : t) : t =
      (* Instead of calling snarky##.field##.add, call Sparky directly *)
      let sparky_module = Js.Unsafe.global##.sparkyDirect in
      let result = Js.Unsafe.meth_call sparky_module "fieldAdd"
        [| field_to_js x; field_to_js y |] in
      field_of_js result
  end
end
```

### Step 4: Create Direct Sparky Access

Expose Sparky operations without the routing logic:

```javascript
// In sparky-adapter.js
if (typeof globalThis !== 'undefined') {
  // Direct Sparky access for OCaml FFI backend
  globalThis.sparkyDirect = {
    fieldAdd: (x, y) => {
      const result = getFieldModule().add(x, y);
      return Array.isArray(result) ? result : cvarToFieldVar(result);
    },
    fieldMul: (x, y) => {
      const result = getFieldModule().mul(x, y);
      return Array.isArray(result) ? result : cvarToFieldVar(result);
    },
    // ... other operations
  };
}
```

## Benefits

1. **Unified Constraint System**: All constraints go through OCaml's constraint system
2. **Proper VK Generation**: OCaml has full visibility of all constraints
3. **Backend Agnostic**: Works with any backend that implements the interface
4. **Type Safe**: OCaml's type system ensures correctness

## Challenges

1. **Performance**: Extra FFI overhead for each field operation
2. **Complexity**: Circular dependency between OCaml and JavaScript
3. **Data Conversion**: Need careful conversion between representations

## Testing Strategy

1. Test with simple circuit first
2. Verify constraints are captured in OCaml
3. Check VK uniqueness
4. Performance benchmarks