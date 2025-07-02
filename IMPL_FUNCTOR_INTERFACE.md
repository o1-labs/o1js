# IMPL Functor Interface Requirements

## Overview
This document identifies all operations needed in the IMPL functor interface for the Pickles implementation to support both Snarky and Sparky backends.

## Core Types
- `field` - The field element type
- `Field.t` - Field variable type
- `Field.Constant.t` - Field constant type  
- `Boolean.var` - Boolean variable type
- `Typ.t` - Type representation
- `Constraint.t` - Constraint type

## Field Operations

### Basic Field Operations
- `Field.constant : Field.Constant.t -> Field.t` - Create constant field
- `Field.add : Field.t -> Field.t -> Field.t` - Field addition
- `Field.sub : Field.t -> Field.t -> Field.t` - Field subtraction  
- `Field.mul : Field.t -> Field.t -> Field.t` - Field multiplication
- `Field.div : Field.t -> Field.t -> Field.t` - Field division
- `Field.inv : Field.t -> Field.t` - Field inverse
- `Field.square : Field.t -> Field.t` - Field squaring
- `Field.scale : Field.t -> Field.Constant.t -> Field.t` - Scale by constant
- `Field.negate : Field.t -> Field.t` - Field negation

### Field Comparisons
- `Field.compare : bit_length:int -> Field.t -> Field.t -> Field.comparison_result`
  - Returns `{ less : Boolean.var; less_or_equal : Boolean.var }`

### Field Assertions
- `assert_equal : Field.t -> Field.t -> unit` - Assert two fields equal
- `assert_r1cs : Field.t -> Field.t -> Field.t -> unit` - Assert x*y = z
- `assert_square : Field.t -> Field.t -> unit` - Assert x*x = y
- `assert_boolean : Field.t -> unit` - Assert x*x = x

## Boolean Operations
- `Boolean.true_ : Boolean.var` - Boolean true constant
- `Boolean.false_ : Boolean.var` - Boolean false constant
- `Boolean.not : Boolean.var -> Boolean.var` - Boolean negation
- `Boolean.( && ) : Boolean.var -> Boolean.var -> Boolean.var` - Boolean AND
- `Boolean.( || ) : Boolean.var -> Boolean.var -> Boolean.var` - Boolean OR
- `Boolean.equal : Boolean.var -> Boolean.var -> Boolean.var` - Boolean equality
- `Boolean.of_field : Field.t -> Boolean.var` - Convert field to boolean

## Constraint Operations
- `Constraint.equal : Field.t -> Field.t -> Constraint.t` - Equality constraint
- `Constraint.r1cs : Field.t -> Field.t -> Field.t -> Constraint.t` - R1CS constraint
- `Constraint.square : Field.t -> Field.t -> Constraint.t` - Square constraint
- `Constraint.boolean : Field.t -> Constraint.t` - Boolean constraint

## Witness Generation
- `exists : ('a, 'b) Typ.t -> compute:(unit -> 'b) -> 'a` - Create witness variable
- `Typ.field : (Field.t, Field.Constant.t) Typ.t` - Field type
- `Typ.boolean : (Boolean.var, bool) Typ.t` - Boolean type
- `Typ.array : length:int -> ('a, 'b) Typ.t -> ('a array, 'b array) Typ.t` - Array type
- `Typ.unit : (unit, unit) Typ.t` - Unit type
- `Typ.prover_value : unit -> ('a, 'a) Typ.t` - Prover-only value type

## Constraint System Management
- `assert_ : Constraint.t -> unit` - Add constraint to system
- `with_label : string -> (unit -> 'a) -> 'a` - Label constraints
- `constraint_system_manual : input_typ:('i, 'j) Typ.t -> return_typ:('r, 's) Typ.t -> 
    { run_circuit : ('i -> 'r) -> unit; finish_computation : 'j -> 's }`
- `generate_witness_manual : input_typ:('i, 'j) Typ.t -> return_typ:('r, 's) Typ.t -> 
    unit -> { run_circuit : ('i -> 'r) -> unit; finish_computation : unit -> 'j * 's }`

## Prover Operations  
- `in_prover : unit -> bool` - Check if in prover mode
- `as_prover : (unit -> unit) -> unit` - Run code in prover mode
- `As_prover.read_var : Field.t -> Field.Constant.t` - Read field value in prover
- `As_prover.in_prover_block : unit -> bool` - Check if in prover block

## Internal Types Needed
- `Internal_Basic.Typ.typ'` - Internal type representation
- `Internal_Basic.Checked.t` - Checked computation type

## Gate Operations (for constraint generation)
The IMPL module needs to support adding various gate types:
- Generic gates
- Zero gates  
- Poseidon gates
- EC addition gates
- EC scalar multiplication gates
- Range check gates
- Foreign field gates
- XOR gates
- Rotate gates
- Lookup gates

## Key Functions Used in Pickles

### From pickles_bindings.ml:
```ocaml
(* Creating witnesses *)
Impl.exists Field.typ ~compute:(fun () -> Field.Constant.of_int value)
Impl.exists inner_curve_typ ~compute:(fun _ -> Inner_curve.one)
Impl.exists (Impl.Typ.prover_value ()) ~compute:(fun () -> proof)

(* Assertions *)
Impl.assert_ (Impl.Constraint.equal sum var_o)
Impl.assert_ (Impl.Constraint.equal var var)

(* Label for debugging *)
Impl.with_label label (fun () -> Impl.assert_ gate)

(* Constraint system generation *)
Impl.constraint_system_manual ~input_typ ~return_typ
Impl.generate_witness_manual ~input_typ ~return_typ
```

### From snarky_bindings.ml:
```ocaml
(* Field operations *)
Field.compare ~bit_length x y
Field.add scaled_l scaled_r
Field.scale var_l (Field.Constant.of_int scale_l)

(* Prover operations *)
As_prover.read_var x
As_prover.in_prover_block ()

(* Type operations *)
Typ.array ~length:i Field.typ
```

## Implementation Strategy

To create a functor that supports both Snarky and Sparky:

1. Define a module type `BACKEND` with all low-level operations
2. Create `IMPL` functor that takes a `BACKEND` and provides the full interface
3. Implement `Snarky_backend` and `Sparky_backend` modules conforming to `BACKEND`
4. The functor instantiation chooses which backend to use

This allows Pickles to work with either backend transparently while maintaining the same high-level interface.