# VarId Mismatch Bug - Critical Issue Blocking Multiplication

## Executive Summary

Multiplication in Sparky fails with "Variable VarId(X) not found in witness" because Sparky uses different variable counters for constraint generation vs witness generation modes. This causes constraints to reference variable IDs that don't exist in the witness map.

## The Problem

```
CONSTRAINT MODE: Creates VarId(0), VarId(1), VarId(2), VarId(3)
WITNESS MODE:    Creates VarId(4), VarId(5), VarId(6)
CONSTRAINT:      References R1CS(VarId(0), VarId(1), VarId(3))
ERROR:           VarId(3) not found in witness map!
```

## Root Cause

1. **Separate RunState Instances**: Each mode (constraint/witness) gets a fresh RunState with `next_var = 0`
2. **No Counter Synchronization**: Variable IDs restart from 0 in each mode
3. **Internal Variable Creation**: `reduce_lincom_exact` creates VarId(3) during constraint mode only
4. **Witness Lookup Failure**: Constraints reference IDs from constraint mode, but witness map has different IDs

## Evidence

### Debug Output Shows ID Mismatch
```
// Constraint Generation
Created witness variable VarId(0) with value: 3
Created witness variable VarId(1) with value: 4
Created witness variable VarId(2) with value: 12
Constraint: R1CS(Var(VarId(0)), Var(VarId(1)), Var(VarId(3)))

// Witness Generation  
Created witness variable VarId(4) with value: 3  // Should be VarId(0)!
Created witness variable VarId(5) with value: 4  // Should be VarId(1)!
Created witness variable VarId(6) with value: 12 // Should be VarId(2)!
Error: Variable VarId(7) not found in witness     // Looking for VarId(3)!
```

### Internal Variable Creation
The mysterious VarId(3) comes from `reduce_lincom_exact`:
```rust
// constraint.rs:1803
Some(c) => {
    let res = self.create_internal_var();  // Creates VarId(3) in constraint mode only!
```

## Impact

- **All multiplication fails** - Every mul() operation hits this bug
- **14.3% VK parity** - Can't improve without working multiplication
- **Blocks zkSNARK development** - Core arithmetic operation broken

## Solution Approaches

### Option 1: Global Variable Counter (Recommended)
- Share a single variable counter across all modes
- Ensures consistent IDs regardless of mode
- Matches Snarky's approach

### Option 2: Variable Remapping
- Map constraint-mode IDs to witness-mode IDs
- More complex but preserves current architecture
- Requires careful bookkeeping

### Option 3: Recreate Internal Variables
- Ensure `reduce_lincom_exact` runs in both modes
- Creates same internal variables in witness mode
- May have performance implications

## Implementation Plan

1. **Immediate Fix**: Add global variable counter to WASM state
2. **Test**: Verify multiplication works with synchronized IDs
3. **Cleanup**: Remove ID remapping workarounds
4. **Validate**: Check VK parity improvement

## Files to Modify

- `sparky-wasm/src/lib.rs` - Add global variable counter
- `sparky-core/src/run_state.rs` - Use global counter instead of local
- `sparky-core/src/constraint.rs` - Ensure consistent variable creation

## Test Case

```javascript
// This should work after fix:
const a = Provable.witness(Field, () => Field.from(3));
const b = Provable.witness(Field, () => Field.from(4));
const c = a.mul(b);
c.assertEquals(Field.from(12)); // Currently fails with VarId mismatch
```

## Conclusion

This is THE blocking issue for Sparky multiplication. All previous fixes (witness storage, array handling, MlArray) were necessary prerequisites, but this VarId mismatch is the final barrier. Once fixed, multiplication should work and VK parity should improve significantly from the current 14.3%.