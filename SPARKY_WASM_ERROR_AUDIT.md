# Sparky WASM Error Audit Report

Created: January 5, 2025 15:55 UTC
Last Modified: January 5, 2025 15:55 UTC

## Summary

This audit identifies all locations in `sparky-wasm/src/lib.rs` where string errors are returned using `JsValue::from_str()` instead of proper JavaScript Error objects using `js_sys::Error::new()`.

## Current State

- Total string error instances found: 36
- Some errors already use `js_sys::Error::new()` (lines 2488, 2501, 2516, 2518)
- Most errors still use `JsValue::from_str()`

## Error Patterns to Fix

### 1. Direct `JsValue::from_str` errors (10 instances)

```rust
// Line 374
.ok_or_else(|| JsValue::from_str("Failed to convert to string"))?;

// Line 409
return Err(JsValue::from_str(&format!("Unknown Cvar type: {}", type_str)));

// Line 466  
.ok_or_else(|| JsValue::from_str("Failed to convert to string"))?;

// Line 499
return Err(JsValue::from_str(&format!("Unknown Cvar type: {}", type_str)));

// Line 817
_ => return Err(JsValue::from_str(&format!(

// Line 826
Err(JsValue::from_str("Failed to acquire optimization mode lock"))

// Line 884
return Err(JsValue::from_str("Generic gate requires exactly 3 variables"));

// Line 890
return Err(JsValue::from_str("Generic gate requires exactly 5 coefficients"));

// Line 2445
let table_id = id.as_string().ok_or_else(|| JsValue::from_str("Table ID must be string"))?;

// Line 2462
let table_id = id.as_string().ok_or_else(|| JsValue::from_str("Table ID must be string"))?;
```

### 2. `map_err` with `JsValue::from_str` (24 instances)

All instances of "Failed to acquire compiler lock":
- Lines: 292, 894, 992, 1046, 1134, 1165, 1190, 1212, 1257, 1305, 1484, 2327, 2419, 2442, 2459, 2479, 2541, 2664, 2690, 2719

Other `map_err` patterns:
- Line 372: `map_err(|_| JsValue::from_str("Failed to stringify input"))?`
- Line 377: `map_err(|e| JsValue::from_str(&format!("JSON parse error: {}", e)))?`
- Line 464: `map_err(|_| JsValue::from_str("Failed to stringify Cvar"))?`
- Line 469: `map_err(|e| JsValue::from_str(&format!("JSON parse error: {}", e)))?`

### 3. Special case - `sparky_error_to_js_value` function (Line 511)

```rust
JsValue::from_str(&format!("Sparky error: {}", error))
```

## Recommended Fix Pattern

Replace all instances with proper JavaScript Error objects:

```rust
// Before:
.map_err(|_| JsValue::from_str("Failed to acquire compiler lock"))?;

// After:
.map_err(|_| -> JsValue { js_sys::Error::new("Failed to acquire compiler lock").into() })?;

// Before:
return Err(JsValue::from_str(&format!("Unknown Cvar type: {}", type_str)));

// After:
return Err(js_sys::Error::new(&format!("Unknown Cvar type: {}", type_str)).into());

// Before:
.ok_or_else(|| JsValue::from_str("Failed to convert to string"))?;

// After:
.ok_or_else(|| -> JsValue { js_sys::Error::new("Failed to convert to string").into() })?;
```

## Priority Fixes

1. **High Priority**: The `sparky_error_to_js_value` function (line 511) - This affects all Sparky errors
2. **Medium Priority**: All "Failed to acquire compiler lock" errors - These are the most common
3. **Low Priority**: Other individual error cases

## Benefits of Fix

1. ✅ Proper JavaScript Error objects with stack traces
2. ✅ Better error handling in JavaScript/TypeScript code
3. ✅ Consistent with Web API standards
4. ✅ Already partially implemented (see lines 2488, 2501, 2516, 2518)

## Next Steps

1. Update all `JsValue::from_str()` calls to `js_sys::Error::new().into()`
2. Test error handling in JavaScript to ensure proper error objects are received
3. Consider adding error types/codes for better error categorization