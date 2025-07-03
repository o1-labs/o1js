# Final Gate Ordering Investigation Report

## Executive Summary

We have identified the **root cause** of the VK mismatch between Snarky and Sparky: **different wire column assignments in generic gates**. Despite implementing identical constraint batching logic, the two backends assign variables to different column positions, creating different permutation polynomials and thus different verification keys.

## Key Findings

### 1. Constraint Batching Works Correctly ✅
- Both Snarky and Sparky successfully batch 2 generic constraints per gate
- Debug logs confirm: `Created batched generic gate with 2 constraints`
- Gate counts match expected patterns (3 gates for 5 constraints)

### 2. Wire Column Assignment Differs ❌
For the same constraint `pub + priv = 10`:

**Snarky Wire Pattern:** `[5, 1, 2, 2, 0, 0, 6]`
**Sparky Wire Pattern:** `[0, 1, 2, 3, 4, 5]`

### 3. Impact on Verification Key
Different wire assignments → Different permutation polynomials → Different VK hashes

## Evidence from Test Results

### Simple Test: `pub + priv = 10`
```
Snarky VK: 24932896158126161871033013284450510069343583251918852319711031675282646308003
Sparky VK: 23726221123596378337090502172653150322643644951063921610078651996076729616290
```

### Complex Test: Multiple Constraints
```
Gate 0 Wire Comparison:
  Wire 0: Snarky col=5, Sparky col=0 ✗
  Wire 1: Snarky col=1, Sparky col=1 ✓  
  Wire 2: Snarky col=2, Sparky col=2 ✓
  Wire 3: Snarky col=2, Sparky col=3 ✗  (Snarky reuses col 2!)
  Wire 4: Snarky col=0, Sparky col=4 ✗
  Wire 5: Snarky col=0, Sparky col=5 ✗  (Snarky reuses col 0!)
```

## Technical Analysis

### Snarky's Wire Assignment (OCaml)
1. **Sequential Assignment**: `add_row` wires variables to columns 0,1,2,... sequentially
2. **Permutation Application**: `equivalence_classes_to_hashtbl` creates permutation cycles
3. **Final Wiring**: Permutation maps original positions to final wire columns

Key code in `plonk_constraint_system.ml`:
```ocaml
Array.iteri vars_for_perm ~f:(fun col x ->
    Option.iter x ~f:(fun x -> wire sys x sys.next_row col))
```

### Sparky's Wire Assignment (Rust)
1. **Sequential Assignment**: Uses `enumerate()` to assign columns 0,1,2,... 
2. **Permutation Logic**: Implemented but produces different results
3. **Issue**: Variables assigned to columns differently due to constraint processing order

Key code in `constraint.rs`:
```rust
for (col, var_opt) in vars.iter().enumerate().take(6) {
    if let Some(var) = var_opt {
        self.wire(*var, current_row, col);
    }
}
```

## Root Cause Analysis

### Variable Equivalence Classes
The permutation argument enforces that variables appearing in multiple gates must be "wired" together. Snarky and Sparky build different equivalence classes because:

1. **Union-Find Usage**: While both implement union-find optimization, they apply it at different points
2. **Variable Creation Order**: Internal variables are created in different sequences
3. **Constraint Processing**: The order of constraint reduction affects equivalence classes

### Example: Why Wire 0 is at Column 5 in Snarky
- Variable 0 appears in multiple positions during constraint reduction
- Snarky's equivalence class algorithm creates a cycle: pos(0,0) → pos(0,5)
- Sparky's algorithm doesn't create the same cycle

## Proposed Solutions

### 1. Mirror Snarky's Equivalence Class Algorithm (Recommended)
Study and exactly replicate Snarky's `equivalence_classes_to_hashtbl` function:
```ocaml
let rotate_left = function [] -> [] | x :: xs -> xs @ [ x ] in
List.iter2_exn ps (rotate_left ps) ~f:(fun input output ->
    Hashtbl.add_exn res ~key:input ~data:output)
```

### 2. Canonical Wire Ordering
Before VK generation, sort wires by a deterministic rule to normalize gates.

### 3. Debug Variable Flow
Add extensive logging to trace:
- Which variables get assigned to which positions
- How equivalence classes are built
- The final permutation mapping

## Implementation Priority

**Critical**: The wire ordering fix is essential for VK parity. This is not just an optimization - it's a correctness requirement for zkApp compatibility.

**Timeline**: This should be fixed before any production use of Sparky, as it fundamentally affects proof verification.

## Test Strategy

1. **Unit Test**: Single constraint with known expected wire pattern
2. **Regression Test**: Verify fix doesn't break existing functionality  
3. **Comprehensive Test**: Multiple constraint types and patterns
4. **Integration Test**: Real zkApp compilation and verification

## Conclusion

Gate ordering investigation revealed that Sparky successfully implements constraint batching (solving the original performance concern) but has a critical wire assignment bug that prevents VK compatibility. The fix requires aligning Sparky's equivalence class and permutation algorithms with Snarky's exact implementation.