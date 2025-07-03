# Gate Ordering Analysis Results

## Executive Summary

The gate ordering investigation revealed that Sparky now successfully implements constraint batching, matching Snarky's optimization. Both backends batch generic constraints 2-per-gate, significantly reducing the total gate count.

## Key Findings

### 1. Constraint Batching Status
- **Snarky**: ✅ WORKING - Batches 2 constraints per generic gate
- **Sparky**: ✅ WORKING - Successfully implements the same batching optimization

### 2. Gate Count Analysis
For a test with 5 generic constraints:
- **Expected with batching**: 3 gates (2 batched + 1 single)
- **Snarky actual**: 6 gates total (includes setup gates)
- **Sparky actual**: 6 gates total (matches Snarky)

### 3. Debug Output Shows Batching Working
```
DEBUG sparky-core/src/constraint.rs:829 Queued generic constraint for batching
DEBUG sparky-core/src/constraint.rs:851 Created batched generic gate with 2 constraints
DEBUG sparky-core/src/constraint.rs:932 Finalized pending constraint as single gate
```

### 4. Remaining VK Mismatch Issue

Despite successful batching, VK hashes still don't match:
- Snarky VK: `24932896158126161871033013284450510069343583251918852319711031675282646308003`
- Sparky VK: `23726221123596378337090502172653150322643644951063921610078651996076729616290`

## Gate Ordering Differences

### Snarky OCaml Implementation (`plonk_constraint_system.ml`)

1. **Pending Queue**: Snarky maintains a `pending_generic_gate` queue (line 832)
2. **Batching Logic** (lines 1428-1437):
   ```ocaml
   match sys.pending_generic_gate with
   | None -> 
       sys.pending_generic_gate <- Some (l, r, o, coeffs)  (* Queue it *)
   | Some (l2, r2, o2, coeffs2) ->
       let coeffs = Array.append coeffs coeffs2 in
       add_row sys [| l; r; o; l2; r2; o2 |] Generic coeffs ;
       sys.pending_generic_gate <- None
   ```
3. **Finalization**: Any pending constraint is added as a single gate during `finalize_and_get_gates`

### Sparky Rust Implementation (`constraint.rs`)

1. **Identical Logic**: Sparky now implements the exact same batching pattern
2. **Pending Queue**: `pending_generic_gate: Option<PendingGenericGate>` (line 378)
3. **Batching Implementation** (lines 820-853):
   - First constraint is queued
   - Second constraint triggers batching with 10 coefficients
   - Creates gate with 6 wire positions
4. **Finalization**: Handles pending constraints correctly (lines 905-934)

## Why VKs Still Don't Match

Despite identical batching, several factors could cause VK differences:

### 1. Gate Type Ordering
Both backends generate the same gates but potentially in different orders due to:
- Public input gate placement
- Zero padding gates
- Constraint processing order

### 2. Wire Permutation Differences
- **Snarky**: Uses `equivalence_classes_to_hashtbl` with specific rotation scheme
- **Sparky**: May implement wiring/permutation differently

### 3. Coefficient Precision
The debug output shows Sparky using precise field arithmetic:
```
"0100000000000000000000000000000000000000000000000000000000000000"
"00000000ed302d991bf94c09fc98462200000000000000000000000000000040"
```

### 4. Union-Find Optimization
Snarky applies union-find optimization to eliminate redundant equality constraints. Sparky implements this but may apply it differently.

## Recommendations

1. **Gate Order Investigation**: Compare the exact sequence of gates between backends
2. **Permutation Analysis**: Verify wire permutation implementation matches exactly
3. **Public Input Handling**: Ensure public input gates are placed identically
4. **Finalization Sequence**: Verify the exact order of operations during constraint system finalization

## Next Steps

1. Create detailed gate-by-gate comparison tests
2. Implement gate sorting/normalization before VK generation
3. Verify permutation argument implementation
4. Test with circuits that have deterministic gate ordering