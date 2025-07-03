# Constraint Batching Implementation Guide

**Created**: July 3, 2025  
**Purpose**: Document the constraint batching implementation and remaining optimizations needed for full Snarky parity.

## Overview

Constraint batching is a critical optimization that Snarky uses to reduce the number of gates in the constraint system. By batching TWO generic constraints into ONE gate, it achieves approximately 50% reduction in constraint count for generic operations.

## Implementation Status: ✅ COMPLETE

The constraint batching mechanism has been successfully implemented in Sparky to match Snarky's exact behavior.

### Key Files Modified

1. **`src/sparky/sparky-core/src/constraint.rs`**
   - Added `PendingGenericGate` struct to hold pending constraints
   - Added `pending_generic_gate: Option<PendingGenericGate>` to `ConstraintSystem`
   - Implemented `add_generic_constraint` with batching logic
   - Added `finalize_constraints()` to handle remaining pending constraints
   - Added new constraint types: `BatchedGeneric` and `SingleGeneric`

2. **`src/sparky/sparky-core/src/run_state.rs`**
   - Updated `finalize_constraint_system` to call `finalize_constraints()`

## How Constraint Batching Works

### 1. Data Structure
```rust
pub struct PendingGenericGate {
    vars: (Option<VarId>, Option<VarId>, Option<VarId>),  // l, r, o
    coeffs: Vec<FieldElement>,  // 5 coefficients
}
```

### 2. Batching Algorithm
```rust
pub fn add_generic_constraint(&mut self, coeffs: &[FieldElement], vars: &[Option<VarId>]) {
    match self.pending_generic_gate.take() {
        None => {
            // First constraint: queue it
            self.pending_generic_gate = Some(PendingGenericGate {
                vars: (vars[0], vars[1], vars[2]),
                coeffs: coeffs[0..5].to_vec(),
            });
        }
        Some(pending) => {
            // Second constraint: batch with pending
            let combined_coeffs = [pending.coeffs, coeffs[0..5]].concat();  // 10 coeffs
            let combined_vars = [
                pending.vars.0, pending.vars.1, pending.vars.2,  // First constraint
                vars[0], vars[1], vars[2]                        // Second constraint
            ];
            self.add_batched_generic_gate(&combined_coeffs, &combined_vars);
            self.pending_generic_gate = None;
        }
    }
}
```

### 3. Gate Structure
- **Single Gate**: 3 variables, 5 coefficients
- **Batched Gate**: 6 variables, 10 coefficients (contains 2 constraints)

### 4. Finalization
Any remaining pending constraint is converted to a single gate during finalization:
```rust
pub fn finalize_constraints(&mut self) {
    if let Some(pending) = self.pending_generic_gate.take() {
        // Convert to single gate
        let gate = KimchiGate {
            typ: "Generic".to_string(),
            wires: create_wires(pending.vars),
            coeffs: pending.coeffs.iter().map(|c| c.to_hex_string()).collect(),
        };
        self.constraints.push(Constraint::SingleGeneric { gate });
    }
}
```

## Test Results

The constraint batching implementation has been verified to work correctly:

```
🧪 Constraint Batching Proof Test
=================================
✅ Sparky Results:
  Total gates: 6
  Gate details:
    Gate 0: Generic with 10 coeffs and 6 wires
      → This is a BATCHED gate (2 constraints in 1 gate)
    Gate 1: Generic with 5 coeffs and 3 wires
      → This is a SINGLE constraint gate
```

## Remaining Optimizations for Full Snarky Parity

While constraint batching is now implemented, Snarky performs additional optimizations that eliminate constraints entirely:

### 1. **Constant Folding** (CRITICAL)
```ocaml
let assert_equal x y =
  match (Backend.Cvar.to_constant x, Backend.Cvar.to_constant y) with
  | Some x, Some y ->
      if Backend.Field.equal x y then return ()  // NO CONSTRAINT!
      else failwithf "assert_equal: %{sexp} != %{sexp}" x y ()
  | _ -> assert_ (Backend.Constraint.equal x y)
```
**Implementation needed**: Check if both operands evaluate to equal constants, skip constraint.

### 2. **Union-Find Wire Optimization** (CRITICAL)
```ocaml
| Equal (v1, v2) -> (
    let (s1, x1), (s2, x2) = (red v1, red v2) in
    match (x1, x2) with
    | `Var x1, `Var x2 ->
        if Fp.equal s1 s2 then
          Union_find.union (union_find sys x1) (union_find sys x2)  // WIRE, not constraint!
```
**Implementation needed**: When variables have same coefficient, wire them together instead of adding constraint.

### 3. **Witness Value Optimization** (HIGH)
During witness generation, if values are known to be equal, skip constraint generation entirely.

### 4. **Linear Combination Simplification** (MEDIUM)
- `x + x → 2*x`
- `x - x → 0`
- `0*x → 0`
- `1*x → x`

## Usage Notes

1. **Always finalize**: The constraint system MUST call `finalize_constraints()` before generating the final output
2. **Batching is automatic**: No changes needed in higher-level code - batching happens transparently
3. **Performance**: Expect ~50% reduction in generic constraint count

## Next Steps

1. Implement constant folding optimization in `assert_equal`
2. Add Union-Find data structure for wire optimization
3. Implement witness-time constraint skipping
4. Add linear combination simplification pass

## References

- Snarky implementation: `/src/mina/src/lib/crypto/kimchi_pasta_snarky_backend/plonk_constraint_system.ml`
- Original constraint batching logic: lines 1428-1437
- Union-Find optimization: lines 1629-1632