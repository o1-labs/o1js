# Union-Find Wire Optimization in Snarky

## Overview

Snarky uses a Union-Find data structure to optimize constraint generation by creating "wires" between variables instead of explicit constraints when possible. This optimization significantly reduces the number of constraints in the final circuit.

## Key Data Structures

### 1. Union-Find Storage
```ocaml
type t = {
  ...
  ; union_finds : V.t Core_kernel.Union_find.t V.Table.t
  ; equivalence_classes : Row.t Position.t list V.Table.t
  ...
}
```

- `union_finds`: Maps each variable to its Union-Find structure
- `equivalence_classes`: Tracks all positions (row, column) where each variable is used

### 2. Variable Types
```ocaml
type V.t =
  | External of int     (* User-provided variables via exists *)
  | Internal of Internal_var.t  (* Intermediate computation variables *)
```

## The Union-Find Algorithm

### 1. Initialization
When a variable is created or first used, it gets its own Union-Find set:

```ocaml
let union_find sys v =
  Hashtbl.find_or_add sys.union_finds v ~default:(fun () ->
      Union_find.create v )
```

### 2. Union Operation - The Key Optimization

When adding an `Equal` constraint between two variables, Snarky checks if it can use Union-Find instead:

```ocaml
| Equal (v1, v2) -> (
    let (s1, x1), (s2, x2) = (red v1, red v2) in
    match (x1, x2) with
    | `Var x1, `Var x2 ->
        if Fp.equal s1 s2 then (
          if not (Fp.equal s1 Fp.zero) then
            Union_find.union (union_find sys x1) (union_find sys x2) )
        else 
          (* Must add actual constraint if coefficients differ *)
          add_generic_constraint ~l:x1 ~r:x2
            [| s1; Fp.(negate s2); Fp.zero; Fp.zero; Fp.zero |]
            sys
```

**Key insight**: When asserting `s1*x1 = s2*x2`:
- If `s1 = s2` (and non-zero), we can union `x1` and `x2` instead of adding a constraint
- If `s1 ≠ s2`, we must add an actual constraint

### 3. Constant Caching Optimization

When one side is a constant:

```ocaml
| `Var x1, `Constant -> (
    let ratio = Fp.(s2 / s1) in
    match Hashtbl.find sys.cached_constants ratio with
    | Some x2 ->
        (* Found existing variable equal to this constant *)
        Union_find.union (union_find sys x1) (union_find sys x2)
    | None ->
        (* Must create constraint and cache for future use *)
        add_generic_constraint ~l:x1
          [| s1; Fp.zero; Fp.zero; Fp.zero; Fp.negate s2 |]
          sys ;
        Hashtbl.set sys.cached_constants ~key:ratio ~data:x1 )
```

This caches variables that equal specific constants, allowing future uses of the same constant to be wired instead of constrained.

## Wire Creation Process

### 1. Recording Variable Usage
Every time a variable is used in a gate, its position is recorded:

```ocaml
let wire' sys key row (col : int) =
  ignore (union_find sys key : V.t Union_find.t) ;
  V.Table.add_multi sys.equivalence_classes ~key ~data:{ row; col }
```

### 2. Finalization - Creating Permutation Arguments

During circuit finalization, Union-Find sets are converted to permutation constraints:

```ocaml
let equivalence_classes_to_hashtbl sys =
  let equivalence_classes = V.Table.create () in
  Hashtbl.iteri sys.equivalence_classes ~f:(fun ~key ~data ->
      let u = Hashtbl.find_exn sys.union_finds key in
      Hashtbl.update equivalence_classes (Union_find.get u) ~f:(function
        | None ->
            Relative_position.Hash_set.of_list data
        | Some ps ->
            List.iter ~f:(Hash_set.add ps) data ;
            ps ) ) ;
```

This process:
1. For each variable, finds its Union-Find root
2. Merges all positions of unioned variables into a single equivalence class
3. Creates a cyclic permutation linking all positions (creating the "wire")

## Benefits

1. **Constraint Reduction**: Instead of `n-1` equality constraints for `n` equal variables, we get a single permutation polynomial
2. **Constant Deduplication**: Multiple uses of the same constant value share a single constraint
3. **Efficient Variable Aliasing**: Variables that are proven equal can be treated as the same wire

## Example

Consider asserting `x = y` and `y = z`:
- Without optimization: 2 constraints
- With Union-Find: 0 constraints + 1 permutation linking all uses of x, y, z

The permutation ensures that during proof generation, the prover must use the same value wherever any of these variables appear, effectively enforcing equality without explicit constraints.

## Limitations

Union-Find optimization only applies when:
1. Variables have the same coefficient (e.g., `1*x = 1*y`, not `2*x = 3*y`)
2. At least one side is a variable (not constant = constant)
3. The coefficient is non-zero (zero coefficients don't create meaningful equalities)

When these conditions aren't met, Snarky falls back to creating explicit constraints.