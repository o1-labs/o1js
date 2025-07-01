# Sparky Constraint Representation Issue

## Executive Summary

Sparky is generating incorrect constraints for arithmetic operations like `a.add(b).assertEquals(c)`. Instead of creating the proper constraint `a + b - c = 0`, it's creating `a - b = 0`, resulting in incompatible constraint systems with Snarky.

## The Problem

When processing `a.add(b).assertEquals(c)` in o1js:

### Expected Behavior (Snarky)
- Creates constraint: `a + b - c = 0`
- Coefficients: `[1, 1, -1, 0, 0]`
- Wires: `[a, b, c, pad, pad, pad, pad]`
- Produces correct verification keys and proofs
- **Number of rows**: 1

### Actual Behavior (Sparky)
- Creates constraint: `a - b = 0` 
- Coefficients: `[1, -1, 0, 0, 0]`
- Wires: `[a, b, c, pad, pad, pad, pad]`
- Produces incompatible constraint systems
- **Number of rows**: 1 (same as Snarky, but wrong constraint)

## Root Cause Investigation History

### Phase 1: Initial Theory (DISPROVEN)
Initially thought Sparky was creating intermediate witness variables for `a.add(b)` before assertEqual was called. **FOUND**: Add nodes are actually preserved as AST nodes `[2, [1, 0], [1, 1]]`.

### Phase 2: reduce_lincom Theory (PARTIALLY CORRECT)
Discovered Snarky's `reduce_lincom` function in `plonk_constraint_system.ml` that flattens expressions without creating intermediate variables. **IMPLEMENTED**: `reduce_lincom` in Rust, but it was never called.

### Phase 3: Constraint Processing Theory (PARTIALLY CORRECT)
Found that `equal_to_generic_gate` has correct pattern matching for `Add(a, b) = c` and generates `[1, 1, -1, 0, 0]` coefficients. **FOUND**: This method exists but isn't being called.

### Phase 4: WASM Path Discovery (BREAKTHROUGH!)
**CRITICAL FINDING**: The actual constraint generation bypasses all the optimization code entirely!

## The Real Root Cause (FINALLY FOUND!)

After extensive debugging with multiple levels of debug output, discovered:

### What's Actually Happening
1. `a.add(b).assertEquals(c)` calls `sparky-adapter.js:assertEqual(x, y)`
2. This calls `getFieldModule().assertEqual(x, y)` (WASM method)
3. **This is NOT the same as `assert_equal_impl` in field.rs**
4. The WASM `assertEqual` method is generating constraints directly
5. **It completely bypasses the `to_kimchi_json` constraint-to-gate conversion**
6. **It completely bypasses the `equal_to_generic_gate` pattern matching**
7. **It completely bypasses the `reduce_lincom` optimization**

### Evidence
- Added debug output to multiple WASM `toJson` methods - **NONE appear in test output**
- Added debug output to `assert_equal_impl` in field.rs - **NOT called**
- Added debug output to `equal_to_generic_gate` - **NOT called**
- **reduce_lincom was never used because the entire optimization pipeline is bypassed**

### The Smoking Gun
The raw JSON from WASM shows:
```
coeffs: ["0100000000000000000000000000000000000000000000000000000000000000", 
         "00000000ed302d991bf94c09fc98462200000000000000000000000000000040", 
         "0000000000000000000000000000000000000000000000000000000000000000"]
```
- First coeff = 1 
- Second coeff = p-1 (which is -1)
- Third coeff = 0

This proves the constraint `1*a + (-1)*b + 0*c = 0` (i.e., `a - b = 0`) is being generated at the source, not in post-processing.

## The Real Fix Needed

Find the actual WASM `assertEqual` method that's being called and ensure it:
1. **Detects the Add pattern in the inputs**
2. **Generates the correct coefficients [1, 1, -1, 0, 0]**
3. **Creates constraint `a + b - c = 0` instead of `a - b = 0`**

The optimization code exists but is never reached because constraint generation takes a completely different path than expected.

## Status: Ready for Final Fix

- ✅ **Add nodes are preserved correctly**: `[2, [1, 0], [1, 1]]`
- ✅ **Pattern matching code exists and is correct**
- ✅ **reduce_lincom is implemented correctly**
- ✅ **Constraint system API works**
- ❌ **Wrong WASM assertEqual method is being called**
- ❌ **Need to find and fix the actual constraint generation path**

**Next step**: Locate the WASM `assertEqual` method in the Field module and implement the Add pattern detection there.