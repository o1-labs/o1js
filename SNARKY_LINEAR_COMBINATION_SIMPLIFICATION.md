# Snarky Linear Combination Simplification Analysis

## Overview

Snarky implements linear combination simplification at multiple levels to optimize constraint generation. The simplification happens primarily in two stages:
1. During Cvar (constraint variable) construction
2. During constraint system generation via `reduce_lincom`

## 1. Cvar-Level Simplifications

The `Cvar` module (`src/mina/src/lib/snarky/src/base/cvar.ml`) implements algebraic simplifications directly in the AST construction:

### Scale Simplification (`scale` function)
```ocaml
let scale x s =
  if Field.(equal s zero) then Constant Field.zero      (* 0*x → 0 *)
  else if Field.(equal s one) then x                     (* 1*x → x *)
  else
    match x with
    | Constant x ->
        Constant (Field.mul x s)                          (* s*c → (s*c) *)
    | Scale (sx, x) ->
        Scale (Field.mul sx s, x)                         (* s*(sx*x) → (s*sx)*x *)
    | _ ->
        Scale (s, x)
```

Key simplifications:
- `0 * x → 0` (returns constant zero)
- `1 * x → x` (identity)
- `s * c → (s*c)` where c is constant
- `s * (sx * x) → (s*sx) * x` (combines nested scales)

### Addition Simplification (`add` function)
```ocaml
let add x y =
  match (x, y) with
  | Constant x, _ when Field.(equal x zero) ->
      y                                                   (* 0 + y → y *)
  | _, Constant y when Field.(equal y zero) ->
      x                                                   (* x + 0 → x *)
  | Constant x, Constant y ->
      Constant (Field.add x y)                           (* c1 + c2 → (c1+c2) *)
  | _, _ ->
      Add (x, y)
```

Key simplifications:
- `0 + y → y` (left identity)
- `x + 0 → x` (right identity)
- `c1 + c2 → (c1+c2)` (constant folding)

### Subtraction Simplification (`sub` function)
```ocaml
let sub t1 t2 =
  match (t1, t2) with
  | Constant x, Constant y ->
      Constant (Field.sub x y)                           (* c1 - c2 → (c1-c2) *)
  | _ ->
      add t1 (scale t2 neg_one)                         (* x - y → x + (-1)*y *)
```

## 2. Constraint System Level Simplifications

### Term Accumulation (`accumulate_terms`)
In `plonk_constraint_system.ml`, terms with the same variable are combined:

```ocaml
let accumulate_terms terms =
  List.fold terms ~init:Int.Map.empty ~f:(fun acc (x, i) ->
      Map.change acc i ~f:(fun y ->
          let res = match y with None -> x | Some y -> Fp.add x y in
          if Fp.(equal zero res) then None else Some res ) )
```

This function:
- Groups terms by variable index
- Adds coefficients of the same variable: `3*x + 2*x → 5*x`
- Removes zero terms: if coefficients sum to 0, the term is removed
- Example: `[(3, i2); (2, i2); (1, i3)]` → `{i2 → 5, i3 → 1}`

### Linear Combination Reduction (`reduce_lincom`)
The `reduce_lincom` function converts a `Cvar.t` expression into constraints:

```ocaml
let reduce_lincom sys (x : Fp.t Snarky_backendless.Cvar.t) =
  let constant, terms =
    Fp.(
      Snarky_backendless.Cvar.to_constant_and_terms ~add ~mul ~zero ~equal
        ~one)
      x
  in
  let terms = accumulate_terms terms in
  (* ... constraint generation ... *)
```

The process:
1. Converts `Cvar.t` to constant + list of (coefficient, variable) pairs
2. Accumulates terms with same variables
3. Handles special cases:
   - Pure constant → returns `(c, `Constant)`
   - Single term `s*x` → returns `(s, `Var x)`
   - Multiple terms → creates constraints to compute the sum

## 3. Expression Flattening

The `to_constant_and_terms` function flattens the Cvar expression tree:

```ocaml
let rec go scale constant terms = function
  | Constant c ->
      (add constant (mul scale c), terms)
  | Var v ->
      (constant, (scale, v) :: terms)
  | Scale (s, t) ->
      go (mul s scale) constant terms t
  | Add (x1, x2) ->
      let c1, terms1 = go scale constant terms x1 in
      go scale c1 terms1 x2
```

This recursively:
- Collects all constants into a single constant term
- Flattens nested additions and scales
- Produces a flat list of (coefficient, variable) pairs

## 4. Complete Simplification Pipeline

For an expression like `2*x + 3*x - x + 0 + 1`:

1. **Cvar construction**:
   - `0` is eliminated by `add` 
   - Constants are folded

2. **Flattening** (`to_constant_and_terms`):
   - Result: constant = 1, terms = [(2, x), (3, x), (-1, x)]

3. **Accumulation** (`accumulate_terms`):
   - Terms combined: [(2+3-1, x)] = [(4, x)]
   - Zero coefficients removed

4. **Final result**: `4*x + 1`

## 5. Key Simplification Rules Summary

1. **Identity elimination**:
   - `0 + x → x`
   - `x + 0 → x`
   - `1 * x → x`
   - `0 * x → 0`

2. **Constant folding**:
   - `c1 + c2 → (c1+c2)`
   - `c1 * c2 → (c1*c2)`

3. **Term combination**:
   - `a*x + b*x → (a+b)*x`
   - `s*(t*x) → (s*t)*x`

4. **Zero removal**:
   - Terms with zero coefficient are removed
   - `x - x → 0` (through term accumulation)

5. **Subtraction rewriting**:
   - `x - y → x + (-1)*y`

These simplifications ensure that the constraint system generated is minimal and efficient, avoiding redundant constraints and unnecessary variables.