# Bug Masking Patterns in Sparky and Sparky-Adapter

This document catalogues instances where Sparky and sparky-adapter.js return default values or silent failures that mask underlying bugs instead of properly reporting errors.

## Executive Summary

Found **15+ instances** of bug masking patterns across the codebase. These patterns hide real errors and make debugging extremely difficult. Many follow the anti-pattern of "if things are bad, return a default value."

## 🚨 Critical Issues in sparky-adapter.js

### 1. **Silent Constraint Retrieval Failure** (Lines 1287-1293)
```javascript
function getAccumulatedConstraints() {
  try {
    const constraintsJson = getRunModule().getConstraintSystem();
    // ... process constraints ...
  } catch (error) {
    // Error occurred, return empty array  ❌ MASKING!
  }
  
  return [];  // ❌ Always returns empty on failure
}
```
**Problem**: Critical constraint bridge failures are silently ignored, returning `[]` which makes it appear constraints were successfully retrieved when they weren't.

### 2. **Silent readVar Failures** (Lines 446-454)  
```javascript
field: {
  readVar(x) {
    try {
      return getFieldModule().readVar(x);
    } catch (error) {
      // If we're not in prover mode, Sparky will throw an error
      // Re-throw with a more descriptive message  ❌ BUT ONLY SPECIFIC ERRORS
      if (error.message && error.message.includes('prover mode')) {
        throw new Error('readVar can only be called in prover mode');
      }
      throw error;  // Other errors re-thrown, but inconsistent
    }
  }
}
```
**Problem**: Only specific error types are handled with descriptive messages. Other failures may be silently converted to generic JS errors.

### 3. **Missing Error Propagation in Mode Switching** (Lines 1303-1315)
```javascript
function endConstraintAccumulation() {
  if (globalThis.__sparkyConstraintHandle) {
    try {
      globalThis.__sparkyConstraintHandle.exit();
      globalThis.__sparkyConstraintHandle = null;
    } catch (error) {
      // Error exiting constraint system  ❌ SILENTLY IGNORED!
    }
  }
}
```
**Problem**: Critical state management errors during constraint mode exit are completely ignored.

### 4. **Generic Error Swallowing** (Lines 574-580)
```javascript
try {
  sparkyInstance.gatesRaw(GENERIC_GATE_TYPE, values, coefficients);
} catch (error) {
  throw error;  // ❌ Re-throws but may lose context from WASM
}
```
**Problem**: WASM errors are known to be silently swallowed (documented in DEV.md), but the code assumes they propagate properly.

### 5. **Default Return Values for Complex Operations** 
```javascript
// Line 307: Placeholder witness data
const result = [0, [], []]; // Placeholder - need to implement witness extraction

// Line 430-434: Always returns expected structure even if data is missing
if (!json.gates) {
  return {
    gates: json.constraints || [],  ❌ ASSUMES constraints exist
    public_input_size: json.public_input_size || 0  ❌ DEFAULTS to 0
  };
}
```
**Problem**: Returns structured defaults that mask underlying data retrieval failures.

## 🔧 Critical Issues in Sparky Rust Code

### 6. **Silent Variable Evaluation Failures** (constraint.rs:255-257)
```rust
let x_str = x.eval(witness).map(|v| v.to_string()).unwrap_or_else(|_| "?".to_string());
let y_str = y.eval(witness).map(|v| v.to_string()).unwrap_or_else(|_| "?".to_string());
```
**Problem**: Variable evaluation failures are masked as "?" in debugging output instead of surfacing the actual error.

### 7. **Lookup Constraint Always Returns Success** (constraint.rs:235-241)
```rust
Constraint::Lookup(_lookup_constraint) => {
    // Lookup constraints need access to the lookup table manager
    // For now, we'll return true as a placeholder  ❌ ALWAYS TRUE!
    // The proper evaluation should be done by the constraint system
    // that has access to the lookup tables
    Ok(true)
}
```
**Problem**: All lookup constraints return `true` regardless of actual validity, completely masking lookup table errors.

### 8. **Default Values on Constraint System Creation** (constraint.rs:495-501)
```rust
pub fn finalize(&mut self) {
    // In snarky, this is where final preparation happens
    // For now, we just ensure sizes are set
    if self.public_input_size.is_none() {
        self.public_input_size = Some(0);  ❌ DEFAULTS to 0
    }
    if self.auxiliary_input_size.is_none() {
        self.auxiliary_input_size = Some(0);  ❌ DEFAULTS to 0
    }
}
```
**Problem**: Missing size information is defaulted to 0 instead of being treated as an error condition.

### 9. **Silent Field Operation Failures** (field.rs:99-100, 111, 117-119)
```rust
if !state.has_witness() {
    return Err(JsValue::from_str("Cannot read variable value outside of prover mode"));
}
// ... but then:
Err(e) => Err(JsValue::from_str(&format!("Variable not found: {:?}", e)))  ❌ CONVERTS TO STRING
```
**Problem**: Structured error information is converted to generic string messages, losing type and context information.

### 10. **Digest Computation Placeholder** (constraint.rs:602-611)
```rust
pub fn digest(&self) -> String {
    // TODO: Implement proper digest computation  ❌ PLACEHOLDER!
    // For now, just a simple hash based on constraint count
    use std::hash::{Hash, Hasher};
    use std::collections::hash_map::DefaultHasher;
    
    let mut hasher = DefaultHasher::new();
    self.constraints.len().hash(&mut hasher);
    format!("{:x}", hasher.finish())  ❌ FAKE DIGEST!
}
```
**Problem**: Critical VK generation relies on constraint system digest, but this returns a fake hash based only on constraint count, not constraint content.

### 11. **Generic Error Conversion Throughout WASM** 
```rust
// Multiple instances in WASM files
.map_err(|e| JsValue::from_str(&format!("Operation failed: {:?}", e)))
```
**Problem**: Rich Rust error types are consistently flattened to debug strings, losing all structured error information at the WASM boundary.

### 12. **Default Wire Allocation for Complex Cvars** (constraint.rs:804-815)
```rust
// Handle linear combinations by creating auxiliary variables
// For now, create a placeholder - this needs proper implementation
Cvar::Add(a, _b) => {
    // TODO: Implement proper handling of linear combinations
    // For now, just allocate based on the first term  ❌ IGNORES SECOND TERM!
    self.cvar_to_wire(a, allocator)
}
Cvar::Scale(_scalar, a) => {
    // TODO: Implement proper handling of scaled terms
    // For now, just allocate based on the inner term  ❌ IGNORES SCALAR!
    self.cvar_to_wire(a, allocator)
}
```
**Problem**: Complex constraint variable structures are reduced to simplified representations, potentially losing mathematical correctness.

## 🛠️ Error Handling Anti-patterns

### 13. **Unwrap with Default Patterns**
Found throughout the Rust codebase:
- `unwrap_or_else(|_| "?".to_string())` - hides evaluation errors
- `unwrap_or(FieldElement::zero())` - defaults to zero on parse failures  
- `ok_or(SparkyError::VariableNotFound(*id))` - may mask other error types

### 14. **Try-Catch Return Default Patterns**
Found in JavaScript:
- Catching errors and returning `[]`, `{}`, or `0`
- Returning placeholder data structures on failure
- Silent fallback to "working" default states

### 15. **Missing Validation**
Many functions accept invalid inputs and attempt to process them rather than validating:
- Array length assumptions without checking
- Type assumptions without validation
- State assumptions without verification

## 🎯 Recommended Fixes

### Immediate Actions

1. **Remove Silent Fallbacks**: All functions returning default values on errors should instead throw descriptive errors
2. **Fix Constraint Bridge**: `getAccumulatedConstraints()` must surface all errors, not mask them
3. **Implement Real Digest**: Replace the placeholder digest with proper constraint system hashing
4. **Fix Lookup Evaluation**: Implement actual lookup constraint validation instead of always returning `true`

### Systematic Changes

1. **Error Propagation Policy**: Establish that errors should always propagate up with context, never be masked
2. **Validation First**: Add input validation to all public API functions  
3. **Structured Error Types**: Replace string error messages with typed error objects
4. **Debug vs Release**: Use debug assertions for impossible conditions, not silent fallbacks

### Testing Requirements

1. **Negative Testing**: Add tests that verify proper error conditions are surfaced
2. **Error Path Coverage**: Ensure all error handling paths are exercised in tests
3. **Integration Error Testing**: Test error propagation across WASM boundaries

## 🚨 Impact Assessment

These masking patterns are **critical bugs** because:

1. **Debugging Impossibility**: Silent failures make it impossible to diagnose real issues
2. **Correctness Violations**: Mathematical operations returning defaults can produce incorrect proofs
3. **Security Implications**: Constraint system failures that are masked could compromise soundness
4. **Development Velocity**: Bug masking makes development and maintenance significantly harder

The VK parity issue described in DEV.md may be partially caused by these masking patterns hiding the real constraint generation problems.