# Sparky Optimization Bug Fix

**Created:** July 6, 2025 12:58 PM UTC  
**Last Modified:** July 6, 2025 12:58 PM UTC

## Summary

Sparky's optimization passes are collapsing legitimate multi-constraint programs down to single constraints due to overly aggressive optimization settings. This breaks the expected circuit structure and may cause verification key mismatches with Snarky.

## Root Cause Analysis

### 1. Default Configuration is Too Aggressive

**File:** `src/sparky/sparky-wasm/src/config.rs`  
**Issue:** Lines 67 and 51 set `OptimizationMode::Aggressive` as default

```rust
// Current (PROBLEMATIC):
pub static ref OPTIMIZATION_MODE: Mutex<OptimizationMode> = {
    Mutex::new(OptimizationMode::Aggressive)  // ← TOO AGGRESSIVE
};

// In OptimizationConfig::default():
Self::aggressive()  // ← Enables 20 optimization passes
```

### 2. Addition Chain Optimization is Over-Zealous

**File:** `src/sparky/sparky-ir/src/transforms/optimizations.rs`  
**Function:** `optimize_addition_chains()` (lines 304-415)

The function explicitly states:
```rust
/// Optimize addition chains: (((a + b) + c) + d) → single linear constraint
```

This merges multiple arithmetic operations into single constraints, explaining the 8→1 constraint reduction.

**Problem areas:**
- Line 377: `constraints_to_remove.insert(constraint_idx);`
- Line 392: `total_eliminated += 1;`
- Line 299: Called in every optimization pass

### 3. Variable Unification Removes Essential Constraints

**File:** `src/sparky/sparky-ir/src/transforms/optimizations.rs`  
**Function:** `apply_complex_substitutions()` (lines 932-1038)

This can substitute variables with their definitions and remove constraints that represent user assertions like `assertEquals(a, b)`.

### 4. Excessive Iteration Count

**File:** `src/sparky/sparky-ir/src/transforms/mod.rs`  
**Line 86:** `max_passes: 20`

With 20 passes, even small optimizations compound to remove too many constraints.

## Specific Test Case

The `SimpleArithmetic` program:
```javascript
const result = a.mul(b).add(publicInput);
```

**Expected:** 2 constraints (multiplication + addition)  
**Actual:** 1 constraint (after addition chain optimization)

## Immediate Fixes Required

### Fix 1: Change Default Optimization Mode

**File:** `src/sparky/sparky-wasm/src/config.rs`

```rust
// BEFORE:
pub static ref OPTIMIZATION_MODE: Mutex<OptimizationMode> = {
    Mutex::new(OptimizationMode::Aggressive)
};

// AFTER:
pub static ref OPTIMIZATION_MODE: Mutex<OptimizationMode> = {
    Mutex::new(OptimizationMode::SnarkyCompatible)
};
```

### Fix 2: Reduce Maximum Optimization Passes

**File:** `src/sparky/sparky-ir/src/transforms/mod.rs`

```rust
// In aggressive() function, line 86:
// BEFORE:
max_passes: 20,

// AFTER:
max_passes: 5,
```

### Fix 3: Disable Addition Chain Optimization (Temporary)

**File:** `src/sparky/sparky-ir/src/transforms/optimizations.rs`

```rust
// In simplify_linear_combinations(), line 299:
// BEFORE:
self.optimize_addition_chains(program)?;

// AFTER:
// DISABLED: Addition chain optimization too aggressive
// self.optimize_addition_chains(program)?;
```

### Fix 4: Add Constraint Count Validation

**File:** `src/sparky/sparky-ir/src/transforms/optimizations.rs`

Add validation before/after optimization:

```rust
// In OptimizationCoordinator::optimize()
let initial_constraint_count = program.constraint_system.constraints.len();

// ... apply optimizations ...

let final_constraint_count = program.constraint_system.constraints.len();
let reduction_ratio = (initial_constraint_count as f64) / (final_constraint_count as f64);

// Warn if reduction is too aggressive (>50% reduction might be suspicious)
if reduction_ratio > 2.0 {
    web_sys::console::warn_2(
        &"⚠️ Aggressive constraint reduction detected".into(),
        &format!("Reduced {} → {} constraints ({}x reduction)", 
                initial_constraint_count, final_constraint_count, reduction_ratio).into(),
    );
}
```

## Longer-term Solutions

### 1. Constraint Preservation Guards

Add metadata to distinguish between:
- **User constraints:** Explicit `assertEquals()` calls that must be preserved
- **Intermediate constraints:** Temporary variables that can be optimized away

### 2. Optimization Mode Selection

Provide runtime configuration:
```javascript
// In JavaScript/TypeScript API
import { setSparkyOptimizationMode } from 'o1js/sparky';

// For development/testing - preserve all constraints
setSparkyOptimizationMode('debug');

// For production - balanced optimization
setSparkyOptimizationMode('snarky-compatible');

// For maximum optimization (current behavior)
setSparkyOptimizationMode('aggressive');
```

### 3. Constraint Audit Trail

Log constraint changes during optimization:
```rust
struct ConstraintAuditLog {
    pass_name: String,
    constraints_before: usize,
    constraints_after: usize,
    variables_unified: usize,
    optimization_time_us: u64,
}
```

## Testing Plan

### 1. Regression Tests

Create tests for programs that should maintain specific constraint counts:

```javascript
// Test: SimpleArithmetic should have 2+ constraints
// Test: ExplicitAssertions should preserve assertEquals constraints
// Test: MultiStepComputation should not collapse to 1 constraint
```

### 2. VK Parity Tests

Verify that Sparky and Snarky produce compatible verification keys for the same programs after optimization fixes.

### 3. Performance Impact

Measure the performance impact of reduced optimization:
- Constraint count comparison
- Proving time comparison
- Memory usage comparison

## Expected Outcomes

After applying these fixes:

1. **SimpleArithmetic:** Should maintain 2+ constraints (multiplication + addition)
2. **Programs with assertEquals:** Should preserve explicit assertions as constraints
3. **VK Parity:** Better compatibility between Sparky and Snarky verification keys
4. **Stability:** Reduced risk of over-optimization breaking circuit semantics

## Risk Assessment

**Low Risk:** 
- Configuration changes (optimization mode, max passes)
- Adding validation and logging

**Medium Risk:**
- Disabling addition chain optimization (may affect performance)
- Modifying constraint removal logic

**High Risk:**
- Major changes to variable unification algorithm

## Recommendation

Start with **Fix 1** and **Fix 2** (configuration changes) as they have the lowest risk and highest impact. Then add **Fix 4** (validation) to monitor the effects. **Fix 3** (disabling addition chain optimization) should be considered if the configuration changes are insufficient.

The goal is to find the right balance between optimization and correctness, ensuring that Sparky produces circuits with the expected constraint structure while still providing performance benefits.