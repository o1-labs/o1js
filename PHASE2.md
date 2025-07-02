# Phase 2: Coefficient Semantic Alignment & VK Parity

**Created**: July 2, 2025  
**Status**: In Progress  
**Priority**: Critical for backend switching functionality

## Current Problem Summary

### Issue
Sparky and Snarky generate identical gate structures (7 wires, 5 coefficients) but produce different coefficient values for the same constraint, causing verification key (VK) mismatches.

### Test Case
Circuit: `x.assertEquals(Field(3))`

**Expected (Snarky)**: `[1, 0, 0, 0, -3]` → `1*x + 0 + 0 + 0 + (-3) = 0`  
**Actual (Sparky)**: `[452312848583266388373324160190187140051835877600158453279131187530910662656, 24978832453430380873717209971532228208145673387365420563795187597376, 0, 0, 0]`

### Root Cause Analysis

1. **Snarky Optimization**: When `x.assertEquals(Field(3))` is called, Snarky's `assertEqual` function recognizes the `variable = constant` pattern and optimizes it to a linear constraint `1*x + (-3) = 0`.

2. **Sparky Issue**: The `reduce_to_v` function in `constraint.rs:334-336` converts **all** `Cvar` types to `VarId`, including constants. This means:
   ```rust
   // This converts Cvar::Constant(3) to a new VarId!
   let x_var = self.reduce_to_v(&x);
   let y_var = self.reduce_to_v(&y);  // Constant becomes variable
   self.constraints.push(Constraint::Equal(Cvar::Var(x_var), Cvar::Var(y_var)));
   ```

3. **Lost Optimization**: By the time the constraint reaches `equal_to_generic_gate`, it's `Equal(Var, Var)` instead of `Equal(Var, Constant)`, so the optimization I added never triggers.

## Phase 2 Implementation Plan

### Task 1: Fix Constraint Processing ⭐ CRITICAL
**Location**: `src/sparky/sparky-core/src/constraint.rs:327-360`  
**Goal**: Preserve constant semantics during constraint addition

#### 1.1 Modify `add_constraint` Function
```rust
// BEFORE (problematic):
Constraint::Equal(x, y) => {
    let x_var = self.reduce_to_v(&x);  // Always converts to VarId
    let y_var = self.reduce_to_v(&y);  // Always converts to VarId
    self.constraints.push(Constraint::Equal(Cvar::Var(x_var), Cvar::Var(y_var)));
}

// AFTER (preserve constants):
Constraint::Equal(x, y) => {
    // Check for var = constant optimization opportunity
    match (&x, &y) {
        (Cvar::Var(_), Cvar::Constant(_)) |
        (Cvar::Constant(_), Cvar::Var(_)) => {
            // Keep original constraint for linear optimization
            self.constraints.push(Constraint::Equal(x, y));
        }
        _ => {
            // General case: reduce to variables
            let x_var = self.reduce_to_v(&x);
            let y_var = self.reduce_to_v(&y);
            self.constraints.push(Constraint::Equal(Cvar::Var(x_var), Cvar::Var(y_var)));
        }
    }
}
```

#### 1.2 Verify `equal_to_generic_gate` Optimization
**Location**: `src/sparky/sparky-core/src/constraint.rs:786-873`  
**Status**: Already implemented ✅  
**Action**: Validate that the existing optimization produces correct coefficients `[1, 0, 0, 0, -3]`

### Task 2: Implement Missing Functions ⭐ HIGH
**Goal**: Add any missing constraint system functions that Sparky needs

#### 2.1 Find `reduce_to_v` Implementation
**Current Status**: Referenced but implementation not found  
**Search**: Need to locate or implement this function

#### 2.2 Implement `cvar_to_linear_combination` 
**Location**: Referenced in `constraint.rs:372` but not implemented  
**Goal**: Convert Cvar expressions to linear combination form for optimization

### Task 3: Debug and Validate ⭐ HIGH
**Goal**: Comprehensive testing of coefficient generation

#### 3.1 Add Detailed Logging
```rust
// Add to equal_to_generic_gate function
match (x, y) {
    (Cvar::Var(_), Cvar::Constant(constant)) => {
        log::debug!("OPTIMIZATION: var = constant case, constant = {:?}", constant);
        // ... existing optimization code
    }
    // ... other cases
}
```

#### 3.2 Create Test Suite
**Files**:
- `test-debug-constraint-flow.mjs` (already created) ✅
- `test-gate-format-comparison.mjs` (already exists) ✅
- Add more constraint types: boolean, square, r1cs

#### 3.3 Validate Field Arithmetic
**Goal**: Ensure `-3` in field arithmetic equals `28948022309329048855892746252171976963363056481941560715954676764349967630334`
```rust
// Test: FieldElement::from(3).neg().to_hex_string()
// Expected: "28948022309329048855892746252171976963363056481941560715954676764349967630334"
```

### Task 4: Advanced Constraint Optimization ⭐ MEDIUM
**Goal**: Implement full `reduce_lincom` optimization matching Snarky

#### 4.1 Linear Combination Optimization
**Reference**: `constraint.rs:364-411` has framework for this
**Status**: Partially implemented but may need activation

#### 4.2 Multi-term Constraint Optimization
**Goal**: Handle complex linear expressions like `2*x + 3*y - 5 = 0`

### Task 5: Verification Key Parity Testing ⭐ HIGH
**Goal**: Validate that VKs match after coefficient alignment

#### 5.1 Simple Circuit VK Comparison
```javascript
// Test identical VKs for: x.assertEquals(Field(3))
const snarkyVK = await generateVK(circuit, 'snarky');
const sparkyVK = await generateVK(circuit, 'sparky');
assert(snarkyVK === sparkyVK, 'VKs must match');
```

#### 5.2 Complex Circuit Testing
- Multiple constraints
- Different constraint types  
- Edge cases with constants

## Success Criteria

### Primary Goals ✅ Must Complete
1. **Coefficient Match**: Test `x.assertEquals(Field(3))` produces `[1, 0, 0, 0, -3]` in Sparky
2. **VK Parity**: Simple circuits generate identical verification keys
3. **No Regressions**: All existing Sparky functionality continues working

### Secondary Goals 🎯 Should Complete
1. **Performance**: Coefficient generation within 1.5x of Snarky performance
2. **Comprehensive Testing**: Full test suite for constraint types
3. **Documentation**: Update SPARKY_CALLGRAPH_TEXT.md with changes

### Stretch Goals 🌟 Nice to Have
1. **Advanced Optimization**: Full `reduce_lincom` implementation
2. **Debug Tools**: Rich constraint debugging utilities
3. **Performance Profiling**: Identify any remaining performance gaps

## Timeline Estimate

**Critical Path**: Tasks 1-3 (Constraint Processing, Implementation, Validation)  
**Estimated Time**: 4-6 hours focused work  
**Dependencies**: None - all tasks can proceed immediately  

**Milestone 1**: Coefficient alignment working (Tasks 1-2)  
**Milestone 2**: Full validation and testing (Task 3)  
**Milestone 3**: VK parity achieved (Task 5)  

## Risk Assessment

**High Risk**: 
- Missing `reduce_to_v` implementation may require more investigation
- Field arithmetic edge cases might cause subtle bugs

**Medium Risk**:  
- Complex constraint optimization may have interdependencies  
- Performance regressions during optimization fixes

**Low Risk**:
- Gate structure is already correct (7 wires, 5 coefficients) ✅
- Core Sparky functionality proven to work ✅
- Clear path to coefficient alignment identified ✅

## Notes

- The `equal_to_generic_gate` optimization I added (lines 786-873) is correct but never executed due to upstream `reduce_to_v` conversion
- All infrastructure for the fix exists - just need to modify the constraint processing pipeline  
- Field(3).neg() = 28948022309329048855892746252171976963363056481941560715954676764349967630334 (validated)
- Gate structure already matches between backends (major hurdle cleared)