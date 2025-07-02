# Pickles Functor Implementation - Phase 1 Plan

## Current Architecture Analysis

### 1. Module Structure
- **Impl**: Currently defined as `Pickles.Impls.Step` (line 3 of pickles_bindings.ml)
- **Backend**: Currently defined as `Pickles.Backend` (line 7)
- **Field, Boolean, Typ**: Extracted from Impl (lines 4-6)

### 2. Impl Usage Pattern
The `Impl` module provides these key operations:
- `Impl.exists` - Create constraint system variables
- `Impl.assert_` - Add constraints  
- `Impl.Constraint.equal` - Create equality constraints
- `Impl.Field` - Field type and operations
- `Impl.Boolean` - Boolean type and operations
- `Impl.Typ` - Type system operations
- `Impl.Typ.prover_value` - Prover-specific types

### 3. Backend Usage Pattern
The `Backend` module provides:
- `Backend.Tick` - Vesta-based operations (for Step)
- `Backend.Tock` - Pallas-based operations (for Wrap)
- Each has submodules like `Keypair`, `Field`, `Verification_key`, etc.

### 4. Dependencies
From `impls.mli`, we see that:
- `Step.Impl` is `Snarky_backendless.Snark.Run.Make(Kimchi_pasta_snarky_backend.Vesta_based_plonk)`
- The backend modules come from `Kimchi_backend.Pasta`

## Phase 1 Implementation Plan

### Step 1: Create the BACKEND Module Type
Create a module type that captures all the operations needed by Pickles:

```ocaml
module type BACKEND = sig
  module Field : sig
    type t
    module Constant : sig
      type t
      val of_int : int -> t
    end
    val typ : (t, Constant.t) Typ.t
    val scale : t -> Constant.t -> t
    val add : t -> t -> t
  end
  
  module Boolean : sig
    type var = t
  end
  
  module Constraint : sig
    type t
    val equal : Field.t -> Field.t -> t
    val r1cs : Field.t -> Field.t -> Field.t -> t
    val square : Field.t -> Field.t -> t
  end
  
  val exists : ('var, 'value) Typ.t -> compute:(unit -> 'value) -> 'var
  val assert_ : Constraint.t -> unit
  
  (* Include other necessary operations *)
end
```

### Step 2: Extract Current Implementation
Create a module that implements BACKEND using the current hardcoded modules:

```ocaml
module Current_backend : BACKEND = struct
  module Field = Impl.Field
  module Boolean = Impl.Boolean
  module Constraint = Impl.Constraint
  
  let exists = Impl.exists
  let assert_ = Impl.assert_
  (* ... other operations ... *)
end
```

### Step 3: Create Pickles Functor
Transform the current module into a functor:

```ocaml
module Make_pickles (B : BACKEND) = struct
  module Field = B.Field
  module Boolean = B.Boolean
  (* ... rest of the current implementation ... *)
end
```

### Step 4: Instantiate for Backward Compatibility
```ocaml
module Pickles_implementation = Make_pickles(Current_backend)
```

## Key Challenges to Address

1. **Type Dependencies**: Many types in Pickles depend on specific backend types. We'll need to carefully abstract these.

2. **Inner Curve Types**: The `inner_curve_typ` in `dummy_constraints` depends on specific curve implementations.

3. **Backend Module Access**: Current code directly accesses `Backend.Tick` and `Backend.Tock`. This needs abstraction.

4. **Constraint Bridge Integration**: The Sparky constraint bridge code needs to work with the abstracted backend.

## Next Steps

1. Start by creating `BACKEND` module type in pickles_bindings.ml
2. Gradually extract all Impl operations into the signature
3. Create the `Current_backend` module
4. Test that everything still compiles and works
5. Only then proceed to create the functor

This incremental approach ensures we don't break existing functionality while preparing for the functor transformation.