# CRITICAL BUG: Union-Find Incorrectly Eliminates Constraints

**Date**: July 3, 2025  
**Severity**: CRITICAL - Correctness Issue  
**Location**: `src/sparky/sparky-core/src/constraint.rs:665-672`

## Bug Description

The Union-Find optimization incorrectly eliminates necessary constraints when processing `Equal(Add(Var, Constant), Expected)` expressions.

## Root Cause Analysis

### What Should Happen
```
Equal(Add(Var(id), Constant(c)), Expected)
```
Should generate constraints:
1. `res = var + c` (from reduce_lincom_exact) 
2. `res = expected` (from Equal constraint)
Combined: `var + c = expected`

### What Actually Happens
1. `reduce_lincom_exact(Add(Var(id), Constant(c)))` creates `res = var + c`, returns `(1, Var(res))`
2. `reduce_lincom_exact(Expected)` returns `(expected, Constant)`
3. **BUG**: Union-Find finds cached constant for `expected` and unifies `res` with cached variable
4. **NO constraint added** to enforce `res = expected`
5. The constraint `res = var + c` exists, but `res` can be any value due to missing constraint

### Code Location
```rust
// Line 665-672: BUGGY Union-Find optimization
if let Some(&cached_var) = self.cached_constants.get(&ratio) {
    // UNION-FIND: Union with existing constant variable
    self.global_union_find.make_set(x1);
    self.global_union_find.make_set(cached_var);
    let unified = self.global_union_find.union(&x1, &cached_var);
    if unified {
        log::debug!("Union-Find: Unified with cached constant ({:?} ∪ {:?})", x1, cached_var);
    }
    // ❌ NO CONSTRAINT ADDED!
}
```

## Impact

This makes constraints trivially satisfiable because:
1. Variable `res` is unified with a cached constant
2. But the relationship `res = var + c` allows `var` to take any value
3. The constraint system becomes under-constrained
4. Invalid witness values are accepted

## Evidence

Test results show Sparky accepts invalid constraints:
- `3 * 4 ≠ 10` should fail → **Sparky accepts** ❌
- `0 * 5 ≠ 1` should fail → **Sparky accepts** ❌

## Fix Strategy

**Option 1: Always Add Constraint**
```rust
// Always generate the constraint, even with cached constants
self.add_generic_constraint(
    &[s1, FieldElement::zero(), FieldElement::zero(), FieldElement::zero(), -s2],
    &[Some(x1), None, None, None, None]
);
// THEN cache if needed
self.cached_constants.insert(ratio, x1);
```

**Option 2: Verify Union-Find Correctness**
Only use Union-Find if the cached variable actually represents the same mathematical relationship.

**Option 3: Disable Aggressive Union-Find**
Disable the cached constant optimization for this case to ensure constraints are always generated.

## Immediate Action Required

This is a **correctness bug** that makes the zkSNARK system unsound. Must fix before any VK parity work.

## Test Case

The bug can be reproduced with any constraint of the form:
```javascript
const result = a.mul(b);  // Creates Add(Var, Constant) 
result.assertEquals(wrong_value);  // Should fail but passes
```