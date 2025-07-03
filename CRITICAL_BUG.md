# CRITICAL BUG: Sparky Under-Constrained System

**Date**: July 3, 2025  
**Severity**: CRITICAL - Correctness Issue  
**Status**: IMMEDIATE INVESTIGATION REQUIRED  

## Bug Summary

Sparky's constraint system is **under-constrained**, accepting invalid witness values that Snarky correctly rejects.

## Evidence

### Test Results
- **Test**: "3 * 4 ≠ 10" (should be REJECTED)
  - Snarky: ❌ REJECTED (correct)
  - Sparky: ✅ SATISFIED (WRONG!)

- **Test**: "0 * 5 ≠ 1" (should be REJECTED)  
  - Snarky: ❌ REJECTED (correct)
  - Sparky: ✅ SATISFIED (WRONG!)

### Debug Output Analysis
```
x_cvar=Add(Var(VarId(2)), Constant(...))
y_cvar=Constant(ArkField { inner: BigInt([0, 0, 0, 0])
```

This suggests Sparky is comparing `result + constant` with `0`, which is always satisfiable by adjusting the constant.

## Root Cause Analysis

### The Real Issue
The "fewer constraints" in Sparky are NOT due to valid optimization - they're due to **missing multiplication constraints**.

### Previous Misunderstanding
- ❌ **Thought**: Sparky optimizes more aggressively than Snarky
- ✅ **Reality**: Sparky drops necessary constraints

### Constraint Generation Bug
Sparky appears to be:
1. Creating multiplication constraints correctly initially
2. But Union-Find or constraint merging incorrectly eliminates them
3. Or the `assertMul` implementation has a fundamental bug

## Impact Assessment

### Correctness Impact
- **CRITICAL**: Invalid proofs could be generated and accepted
- **CRITICAL**: Security vulnerability in zkSNARK system
- **CRITICAL**: All previous "optimization" analysis is invalid

### Development Impact
- Must fix constraint generation before any optimization work
- All VK parity testing was based on incorrect constraint systems
- Need to rebuild understanding from correct constraint generation

## Investigation Priority

### IMMEDIATE (Fix correctness bug)
1. Debug `assertMul` implementation in Sparky
2. Verify R1CS constraint generation
3. Check Union-Find variable merging logic
4. Test constraint generation step-by-step

### SECONDARY (After correctness fixed)
1. Re-run all VK parity tests with correct constraints
2. Re-evaluate optimization aggressiveness
3. Update all documentation based on corrected understanding

## Code Locations to Investigate

### Sparky assertMul Implementation
- `src/bindings/sparky-adapter.js:813` (assertMul function)
- `src/sparky/sparky-wasm/src/field.rs` (WASM multiplication)
- `src/sparky/sparky-core/src/constraint.rs` (R1CS constraint generation)

### Union-Find Implementation
- `src/sparky/sparky-core/src/constraint.rs:13-71` (Union-Find logic)
- Variable merging conditions in `add_constraint`

### Constraint Processing
- Equal constraint handling
- R1CS constraint creation
- Constraint optimization passes

## Test Cases for Verification

Once fixed, verify with:
1. Valid multiplications (should pass both backends)
2. Invalid multiplications (should fail both backends)
3. Edge cases (zero, large numbers)
4. Complex expressions with multiple operations

## Conclusion

This discovery fundamentally changes our approach. The priority is now:
1. **Fix constraint generation correctness** 
2. **Verify mathematical equivalence**
3. **Then optimize while preserving correctness**

The VK parity issue is a **symptom** of this constraint generation bug, not the root problem.