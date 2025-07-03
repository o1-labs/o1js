# Witness Value Optimization in Snarky

This document explains how Snarky implements witness value optimization - an optimization technique that skips generating constraints for values that are provably equal during witness generation.

## Overview

Snarky has two main execution modes:
1. **Constraint Generation Mode** - Building the constraint system (circuit compilation)
2. **Witness Generation Mode** - Computing actual witness values (proof generation)

The witness value optimization leverages the fact that during witness generation, we have concrete values and can sometimes prove equality without adding constraints.

## How It Works

### 1. Execution Modes

The system tracks which mode it's in through the `Run_state` module:

```ocaml
type t = {
  has_witness : bool;         (* true in witness generation mode *)
  as_prover : bool ref;       (* true when in as_prover block *)
  eval_constraints : bool;    (* whether to check constraints *)
  system : constraint_system option;  (* None in witness mode *)
  ...
}
```

### 2. The `as_prover` Blocks

The `as_prover` function allows code to run only during witness generation:

```ocaml
let as_prover f =
  if inCheckedComputation() then
    Snarky.run.asProver(f)
  else
    f()
```

Key properties:
- Code inside `as_prover` blocks runs **only** during witness generation
- No constraints are added inside these blocks (prevents constraint system mismatch)
- Used for witness computations and optimizations

### 3. Witness Value Optimization

The optimization happens in several places:

#### Constant Folding in `assert_equal`

```ocaml
let assert_equal x y =
  match (Backend.Cvar.to_constant x, Backend.Cvar.to_constant y) with
  | Some x, Some y ->
      (* Both are constants - check equality without constraint *)
      if Backend.Field.equal x y then return ()
      else failwithf "assert_equal: %s != %s" x y ()
  | _ ->
      (* At least one is a variable - add equality constraint *)
      assert_ (Backend.Constraint.equal x y)
```

This optimization:
- Checks if both values are constants
- If yes, verifies equality at compile time
- Skips constraint generation for provably equal constants

#### Constraint Addition Logic

```ocaml
let add_constraint c =
  Function (fun s ->
    if Run_state.as_prover s then
      (* Don't add constraints in prover mode *)
      (s, ())
    else (
      (* Only add constraint if not in prover mode *)
      if not (Run_state.as_prover s) then
        Option.iter (Run_state.system s) ~f:(fun system ->
          add_constraint c system);
      (s, ())
    ))
```

This ensures:
- No constraints are added during `as_prover` blocks
- Constraint system remains consistent between modes

### 4. Witness Block Context

When creating witness values:

```typescript
// From witness.ts
let id = snarkContext.enter({ ...ctx, inWitnessBlock: true });
try {
  fields = exists(provable.sizeInFields(), () => {
    let value = provable.fromValue(compute());
    let fields = provable.toFields(value);
    return fields.map((x) => x.toBigInt());
  });
} finally {
  snarkContext.leave(id);
}
```

The `inWitnessBlock` flag indicates witness computation is happening.

### 5. Constraint Evaluation

During witness generation, constraints can be evaluated but not added:

```ocaml
if Run_state.eval_constraints s
   && !eval_constraints
   && not (Constraint.eval c (get_value s))
then
  failwithf "Constraint unsatisfied: %s" ...
```

This allows checking constraint satisfaction without modifying the constraint system.

## When The Optimization Applies

The witness value optimization applies when:

1. **Constant Values**: Both operands in an equality check are constants
2. **As Prover Blocks**: Computations inside `as_prover` that don't affect the constraint system
3. **Witness Generation**: During proof generation when concrete values are available

## Interaction with Other Optimizations

This optimization works alongside:

1. **Constant Folding**: Compile-time evaluation of operations on constants
2. **Union-Find**: (Would be implemented in the Cvar module for variable aliasing)
3. **Common Subexpression Elimination**: Reusing computed values

## Implementation in Sparky

For Sparky to implement this optimization, it needs:

1. **Mode Tracking**: Distinguish between constraint and witness generation modes
2. **Constant Detection**: Check if Cvars represent constant values
3. **Conditional Constraint Addition**: Skip constraints for provably equal constants
4. **As Prover Support**: Implement blocks that only execute during witness generation

The current Sparky adapter has placeholders for these features:

```javascript
enterGenerateWitness() {
  const handle = getRunModule().enterGenerateWitness();
  return () => {
    // TODO: Get actual witness data from Sparky
    const result = [0, [], []];
    handle.exit();
    return result;
  };
}
```

## Summary

The witness value optimization in Snarky:
- Leverages runtime information during witness generation
- Skips unnecessary constraints for provably equal values
- Maintains constraint system consistency between modes
- Works through the `as_prover` mechanism and constant detection
- Reduces constraint count without affecting soundness

This optimization is particularly effective for:
- Circuits with many constant values
- Conditional logic that resolves to constants
- Repeated computations with the same inputs