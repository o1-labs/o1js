# VK Parity Investigation Report: Critical Findings

**Investigation Date**: July 2, 2025  
**Investigator**: Claude Code  
**Status**: CRITICAL INCOMPATIBILITIES IDENTIFIED

## Executive Summary

The investigation into verification key (VK) parity between Sparky (Rust) and Snarky (OCaml) backends reveals **catastrophic compatibility issues** with a current VK parity rate of **0.0%** (down from previously claimed 28.6% or 50%).

## Discrepancy in Documented Claims vs Reality

### Documentation Claims vs Actual Results
- **DEV.md claims**: "28.6% success rate" and "50% (2/4 operations)"
- **CLAUDE.md claims**: "50% VK parity success rate"
- **Actual test results**: **0.0% success rate (0/12 tests passing)**

This represents a critical disconnect between documentation and system reality.

## Root Cause Analysis: Three Critical Technical Issues

### 1. **Coefficient Corruption in Sparky** ❌ CRITICAL

**Issue**: Sparky generates corrupted field coefficients containing the field modulus value.

**Evidence**:
```
Snarky coefficients:  [1, 0, 0, ...]           # Normal
Sparky coefficients:  [1, 28948022309329048855892746252171976963363056481941560715954676764349967630336, 0, ...]  # Corrupted
```

**Root Cause**: The value `28948022309329048855892746252171976963363056481941560715954676764349967630336` appears to be related to the Pallas field modulus and should never appear in constraint coefficients.

**Impact**: Corrupted coefficients completely invalidate VK generation, leading to non-matching verification keys.

### 2. **Constraint Over-Generation** ❌ BLOCKING

**Issue**: Sparky generates 2-3x more constraints than Snarky for identical operations.

**Evidence**:
```
Operation: x * y = z
- Snarky: 1 constraint (fused R1CS)
- Sparky: 3 constraints (separate linear constraints)

Operation: x = y  
- Snarky: 0 constraints (optimized away)
- Sparky: 1 constraint (unnecessary linear constraint)
```

**Root Cause**: Architectural difference - Snarky optimizes during constraint generation, Sparky generates then attempts optimization.

**Impact**: Different constraint counts result in completely different constraint systems and VK hashes.

### 3. **Architectural Mismatch** ❌ FUNDAMENTAL

**Issue**: The two backends have fundamentally different constraint generation philosophies.

**Snarky Approach**:
- Performs constraint fusion during generation
- Optimizes expressions before creating constraints
- Results in minimal, optimized constraint systems

**Sparky Approach**:
- Generates explicit linear constraints for all operations
- Attempts optimization post-generation
- Results in verbose, unoptimized constraint systems

## Test Results: Comprehensive Failure

### Latest Comprehensive Test Results (0.0% Success)
```
Test Suite: comprehensive-vk-parity-test.mjs
Results: 0/12 tests passing (0.0% success rate)

Failed Tests:
1. Simple Equality: x = 1               - Coefficient mismatch
2. Variable Equality: x = y             - Structure mismatch  
3. Addition: x + y = z                  - Coefficient mismatch
4. Subtraction: x - y = z               - Coefficient mismatch
5. Scaling: 5 * x = y                   - Coefficient mismatch
6. Multiplication: x * y = z            - Structure mismatch
7. Square: x² = y                       - Structure mismatch
8. Boolean: x ∈ {0,1}                   - Structure mismatch
9. Conditional: if-then-else            - Error
10. Multiple Constraints: x=1, y=2, z=x+y - Structure mismatch
11. Complex: (x + y) * z = w            - Structure mismatch
12. Poseidon Hash: Real-world circuit   - Error
```

### Diagnostic Test Results
The diagnostic test confirmed:
- ✅ Backend switching mechanism: WORKING
- ✅ GlobalThis routing: WORKING  
- ❌ Coefficient generation: CORRUPTED
- ❌ Constraint counts: MISMATCHED
- ❌ VK generation: INCOMPATIBLE

## Infrastructure Analysis

### What's Working ✅
1. **Backend Switching**: The `switchBackend()` function works correctly
2. **Module Loading**: Both OCaml and WASM modules load successfully
3. **Basic Operations**: Individual field operations execute correctly
4. **GlobalThis Routing**: The `globalThis.__snarky` updates correctly during switches

### What's Broken ❌
1. **Constraint Generation**: Produces incompatible constraint systems
2. **Coefficient Encoding**: Sparky encodes field values incorrectly in constraints
3. **Optimization Pipeline**: Post-generation optimization doesn't match Snarky's inline optimization
4. **VK Generation**: Produces completely different verification keys

## Technical Deep Dive: Constraint System Analysis

### Example: Simple Equality `x.assertEquals(Field(1))`

**Snarky Output**:
```json
{
  "gates": [],
  "rows": 0,
  "publicInputSize": 0
}
```
*Note: Snarky optimizes this away entirely*

**Sparky Output**:
```json
{
  "gates": [
    {
      "typ": "Generic",
      "coeffs": ["0100000000000000000000000000000000000000000000000000000000000000", "00000000ed302d991bf94c09fc98462200000000000000000000000000000040", "0000000000000000000000000000000000000000000000000000000000000000", "0000000000000000000000000000000000000000000000000000000000000000", "0000000000000000000000000000000000000000000000000000000000000000"]
    }
  ],
  "rows": 1,
  "publicInputSize": 0
}
```
*Note: Sparky generates an explicit linear constraint with corrupted coefficient*

### Debug Trace Analysis

From Sparky debug output:
```
DEBUG sparky-core/src/constraint.rs:539 Added linear constraint with 1 variables and constant 28948022309329048855892746252171976963363056481941560715954676764349967630336
```

This constant value matches the coefficient corruption seen in the JSON output, confirming the issue is in Sparky's constraint generation logic.

## Immediate Action Items: Critical Fixes Required

### Priority 1: Fix Coefficient Corruption 🚨
**Location**: `sparky-core/src/constraint.rs` around line 539
**Issue**: Field modulus value being used as constraint coefficient
**Fix Required**: Investigate why field modulus appears in linear constraint generation

### Priority 2: Implement Constraint Fusion 🔧
**Location**: Sparky constraint generation pipeline
**Issue**: Lack of inline optimization during constraint generation
**Fix Required**: Match Snarky's constraint fusion patterns

### Priority 3: Normalize Constraint Systems ⚙️
**Location**: VK generation pipeline
**Issue**: Different constraint patterns produce different VKs
**Fix Required**: Add normalization step before VK generation

### Priority 4: Update Documentation 📝
**Location**: DEV.md, CLAUDE.md
**Issue**: Documentation claims 28.6%-50% success, reality is 0%
**Fix Required**: Update to reflect actual current status

## Testing Infrastructure Assessment

### Existing Tests Status
- ✅ `comprehensive-vk-parity-test.mjs`: Working, provides accurate baseline
- ✅ `vk-parity-comprehensive.test.ts`: Working, systematic framework
- ✅ `backend-test-framework.ts`: Working, good utilities
- ✅ `vk-parity-diagnostic.test.ts`: New, identifies root causes

### Test Coverage
- ✅ Basic field operations
- ✅ Constraint system generation
- ✅ Backend switching
- ✅ VK generation comparison
- ❌ Missing: Constraint normalization tests
- ❌ Missing: Coefficient validation tests

## Recommendations

### Immediate (Days 1-3)
1. **Emergency Documentation Update**: Correct VK parity claims to reflect 0% reality
2. **Coefficient Debug**: Add logging to identify source of field modulus in constraints
3. **Block Production Use**: VK parity issues make Sparky unsuitable for production

### Short Term (Week 1)
1. **Fix Coefficient Corruption**: Root cause analysis and fix in Sparky constraint generation
2. **Implement Basic Constraint Fusion**: Match Snarky patterns for simple operations
3. **Add Constraint Validation**: Prevent invalid coefficients from being generated

### Medium Term (Weeks 2-4)
1. **Complete Constraint Fusion**: Implement full Snarky-compatible constraint optimization
2. **VK Normalization**: Add pre-processing to normalize constraint systems before VK generation
3. **Comprehensive Testing**: Expand test coverage to all operation types

### Long Term (Month 2+)
1. **Architectural Alignment**: Consider restructuring Sparky to match Snarky's generation patterns
2. **Performance Optimization**: Once compatibility achieved, optimize performance
3. **Production Readiness**: Full validation and stress testing

## Conclusion

The VK parity situation is **significantly worse than documented**, with **0% compatibility** rather than the claimed 28.6%-50%. The issues are fundamental and architectural, requiring substantial engineering work to resolve.

The primary blockers are:
1. **Coefficient corruption** in Sparky constraint generation
2. **Architectural mismatch** between Snarky's inline optimization and Sparky's post-generation optimization
3. **Constraint over-generation** leading to incompatible constraint systems

**Recommendation**: Sparky should **not be used in production** until these fundamental compatibility issues are resolved.

---

*Investigation completed using systematic testing and diagnostic analysis of both backends.*