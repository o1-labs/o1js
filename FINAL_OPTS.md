# Snarky's Final Optimizations - Complete Analysis

**Created**: July 3, 2025  
**Purpose**: Document Snarky's remaining optimizations that need to be implemented in Sparky for full parity.

## Executive Summary

Snarky achieves minimal constraint generation through four key optimizations beyond constraint batching:

1. **Constant Folding** - Evaluate constant expressions at compile-time
2. **Union-Find Wire Optimization** - Replace equality constraints with circuit wiring
3. **Witness Value Optimization** - Skip constraints in prover-only code
4. **Linear Combination Simplification** - Algebraic simplification of expressions

These optimizations work together to eliminate unnecessary constraints, often reducing constraint count to zero for common operations.

## 1. Constant Folding Optimization

### Overview
Snarky evaluates operations on constants at compile-time instead of generating constraints.

### Implementation Location
- Main logic: `/src/mina/src/lib/snarky/src/base/checked.ml`
- Cvar operations: `/src/mina/src/lib/snarky/src/base/cvar.ml`
- Arithmetic operations: `/src/mina/src/lib/snarky/src/base/utils.ml`

### Key Implementation

```ocaml
(* assert_equal in checked.ml *)
let assert_equal x y =
  match (Backend.Cvar.to_constant x, Backend.Cvar.to_constant y) with
  | Some x, Some y ->
      if Backend.Field.equal x y then return ()  (* NO CONSTRAINT! *)
      else
        failwithf "assert_equal: %{sexp} != %{sexp}" x y ()
  | _ ->
      assert_ (Backend.Constraint.equal x y)

(* Cvar.to_constant *)
let to_constant : t -> Field.t option = function
  | Constant x -> Some x
  | _ -> None
```

### Optimization Rules
1. **Equality**: `Constant(x) = Constant(y)` → compile-time check, no constraint
2. **Arithmetic**: 
   - `Constant(a) * Constant(b)` → `Constant(a*b)`
   - `Constant(a) + Constant(b)` → `Constant(a+b)`
   - `Constant(a) / Constant(b)` → `Constant(a/b)`
3. **Special cases**:
   - `0 + x` → `x`
   - `1 * x` → `x`
   - `0 * x` → `0`

### Impact
Eliminates all constraints for constant-only operations.

## 2. Union-Find Wire Optimization

### Overview
Instead of creating equality constraints, Snarky uses Union-Find to track equivalent variables and enforces equality through permutation arguments (wiring).

### Implementation Location
- Main logic: `/src/mina/src/lib/crypto/kimchi_pasta_snarky_backend/plonk_constraint_system.ml`
- Union-Find: Standard OCaml Union_find module

### Key Implementation

```ocaml
(* In constraint system type *)
type ('f, 'desc) t = {
  mutable equivalence_classes : (int, Union_find.t) Hashtbl.t;
  (* ... *)
}

(* Union-Find initialization *)
let union_find t v : Union_find.t =
  let idx = V.idx v in
  match Hashtbl.find_opt t.equivalence_classes idx with
  | None ->
      let uf = Union_find.create idx in
      Hashtbl.add t.equivalence_classes idx uf ;
      uf
  | Some uf -> uf

(* In add_constraint *)
| Equal (v1, v2) -> (
    let (s1, x1), (s2, x2) = (red v1, red v2) in
    match (x1, x2) with
    | `Var x1, `Var x2 ->
        if Fp.equal s1 s2 then (
          if not (Fp.equal s1 Fp.zero) then
            Union_find.union (union_find sys x1) (union_find sys x2) )
        (* NO CONSTRAINT ADDED! *)
```

### How It Works
1. Each variable gets a Union-Find structure
2. When `x = y` with same coefficient: union their sets
3. During finalization: create permutation linking all unioned variables
4. Result: One permutation replaces many constraints

### Optimization Triggers
- Variables must have same coefficient: `1*x = 1*y` ✓, `2*x = 3*y` ✗
- Coefficient must be non-zero
- Works for variable-variable and variable-constant equalities

### Impact
- `x = y, y = z` → 0 constraints + 1 permutation (vs 2 constraints)
- Multiple uses of same constant → 1 constraint + wiring (vs N constraints)

## 3. Witness Value Optimization

### Overview
Code in `as_prover` blocks only runs during witness generation, not constraint generation.

### Implementation Location
- Run state: `/src/mina/src/lib/snarky/src/base/run_state.ml`
- As prover: `/src/mina/src/lib/snarky/src/base/checked.ml`

### Key Implementation

```ocaml
(* Run_state module *)
type 'field t = {
  mutable as_prover : bool;
  (* ... *)
}

(* In add_constraint *)
let add_constraint (t : t) (c : Constraint.t) =
  let open Run_state in
  (* If as_prover = true, no constraint is added *)
  if t.as_prover then ()
  else (
    Constraint_logger.log_constraint c ;
    t.system <-
      Constraint_system.add_constraint ~stack:!stack_prefixes c t.system )

(* as_prover implementation *)
let as_prover (run : unit -> 'a) : 'a As_prover.Ref.t =
  let old = Run_state.(get_as_prover (get ())) in
  Run_state.set_as_prover true;
  let result = run () in
  Run_state.set_as_prover old;
  As_prover.Ref.create result
```

### Usage Pattern
```ocaml
let x = 
  exists Field.typ ~compute:(fun () ->
    (* This computation only runs during proving *)
    As_prover.read_var some_var
  )
```

### Key Properties
1. No constraints generated inside `as_prover` blocks
2. Maintains constraint system consistency between compilation and proving
3. Allows complex witness computations without constraint overhead

## 4. Linear Combination Simplification

### Overview
Snarky simplifies linear expressions before generating constraints through two stages.

### Implementation Location
- Cvar operations: `/src/mina/src/lib/snarky/src/base/cvar.ml`
- Reduce lincom: `/src/mina/src/lib/crypto/kimchi_pasta_snarky_backend/plonk_constraint_system.ml`

### Stage 1: Cvar Construction

```ocaml
(* Scale simplification *)
let scale (x : t) (s : Field.t) : t =
  if Field.(equal s zero) then constant Field.zero
  else if Field.(equal s one) then x
  else
    match x with
    | Constant x -> Constant (Field.mul s x)
    | Scale (s', x') -> Scale (Field.mul s s', x')
    | _ -> Scale (s, x)

(* Add simplification *)
let add x y =
  match (x, y) with
  | Constant x, _ when Field.(equal x zero) -> y
  | _, Constant y when Field.(equal y zero) -> x
  | Constant x, Constant y -> Constant (Field.add x y)
  | _ -> Add (x, y)
```

### Stage 2: Constraint Generation

```ocaml
(* accumulate_terms *)
let accumulate_terms terms =
  List.fold_left terms ~init:Field.Map.empty ~f:(fun acc (c, v) ->
    Map.update acc v ~f:(function
      | None -> c
      | Some c' -> Field.(c + c')))
  |> Map.filter ~f:(fun c -> not Field.(equal c zero))
```

### Simplification Rules
1. **Identity operations**: `0+x→x`, `1*x→x`, `0*x→0`
2. **Constant folding**: `c1+c2→(c1+c2)`, `c1*c2→(c1*c2)`
3. **Term combination**: `a*x+b*x→(a+b)*x`
4. **Zero cancellation**: `x-x→0`
5. **Nested scale flattening**: `a*(b*x)→(a*b)*x`

### Example Pipeline
```
Input: 2*x + 3*x - x + 0 + 1
Stage 1: Add(Scale(2,x), Add(Scale(3,x), Add(Scale(-1,x), Constant(1))))
         (0 eliminated during construction)
Stage 2: Flatten → constant=1, terms=[(2,x), (3,x), (-1,x)]
         Accumulate → [(4,x)]
Result: 4*x + 1
```

## Implementation Priority

### 1. Constant Folding (HIGHEST)
- Most straightforward to implement
- Immediate impact on constraint count
- Foundation for other optimizations

### 2. Linear Combination Simplification (HIGH)
- Works well with constant folding
- Reduces complexity of expressions
- Makes other optimizations more effective

### 3. Union-Find Wire Optimization (MEDIUM)
- More complex implementation
- Requires modifying constraint system structure
- Big impact for equality-heavy circuits

### 4. Witness Value Optimization (LOW)
- Already partially implemented in Sparky
- Less impact on typical circuits
- Mainly affects prover-specific computations

## Expected Impact

Implementing these optimizations should:
1. Reduce constraint count by 50-90% for typical circuits
2. Achieve full parity with Snarky for most operations
3. Enable identical VK generation between backends
4. Significantly improve proving performance

## Next Steps

1. Implement constant folding in Sparky's `assert_equal`
2. Add expression simplification to Cvar operations
3. Integrate Union-Find data structure for wire optimization
4. Ensure witness-only code doesn't generate constraints