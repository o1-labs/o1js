# Gate Ordering Solution: Root Cause Identified

## Problem Found: Wire Column Ordering

The VK mismatch is caused by different wire column ordering between Snarky and Sparky for the same constraint.

### Example: Simple constraint `pub + priv = 10`

**Snarky Gate:**
```json
{
  "wires": [
    {"row": 0, "col": 5},  // Wire 0
    {"row": 0, "col": 1},  // Wire 1
    {"row": 0, "col": 2},  // Wire 2
    {"row": 0, "col": 3},  // Wire 3
    {"row": 0, "col": 4},  // Wire 4
    {"row": 0, "col": 0},  // Wire 5
    {"row": 0, "col": 6}   // Wire 6
  ],
  "coeffs": [1, 0, 0, 0, -10, 1, 1, -1, 0, 0]
}
```

**Sparky Gate:**
```json
{
  "wires": [
    {"row": 0, "col": 0},  // Wire 0 - DIFFERENT!
    {"row": 0, "col": 1},  // Wire 1
    {"row": 0, "col": 2},  // Wire 2
    {"row": 0, "col": 3},  // Wire 3
    {"row": 0, "col": 4},  // Wire 4
    {"row": 0, "col": 5}   // Wire 5 - DIFFERENT!
  ],
  "coeffs": [1, 1, -1, 0, -10, 1, 0, 0, 0, 0]
}
```

## The Issue

1. **Wire Assignment**: Snarky and Sparky assign variables to different column positions
2. **Coefficient Ordering**: The coefficients are reordered to match the wire positions
3. **Permutation Impact**: Different wire positions create different permutation arguments in the PLONK proof system

## Why This Matters for VK

The verification key includes commitments to:
1. The selector polynomials (derived from gate types and coefficients)
2. The permutation polynomial (derived from wire connections)

Even though the constraints are logically equivalent, different wire orderings produce different polynomials and thus different VKs.

## Solution Approaches

### 1. Standardize Wire Assignment (Recommended)
Modify Sparky to match Snarky's wire assignment strategy:
- Analyze how Snarky assigns variables to columns
- Implement the same assignment logic in Sparky

### 2. Canonical Gate Representation
Before VK generation, normalize gates to a canonical form:
- Sort wires by a deterministic rule
- Reorder coefficients to match

### 3. Fix at Source
Investigate why the wire assignments differ:
- Check `add_row` implementation in both backends
- Look at variable-to-column mapping logic

## Specific Differences Found

### Wire Column Assignments
- Snarky uses columns: [5, 1, 2, 3, 4, 0, 6]
- Sparky uses columns: [0, 1, 2, 3, 4, 5] (sequential)

### Coefficient Position Mapping
The coefficient arrays correspond to different wire positions:
- Snarky's coeff[0] corresponds to wire at col 5
- Sparky's coeff[0] corresponds to wire at col 0

## Implementation Fix

The fix needs to be in Sparky's `add_row` or wire assignment logic to match Snarky's column selection strategy. This is likely in:
1. `sparky-core/src/constraint.rs` - The `wire` function
2. `sparky-adapter.js` - The constraint system export logic

## Next Steps

1. Trace Snarky's wire column assignment algorithm
2. Implement identical logic in Sparky
3. Verify VK parity with the fix