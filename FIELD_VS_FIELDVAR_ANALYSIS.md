# Field vs FieldVar Analysis

Created: 2025-01-05 02:00 UTC
Last Modified: 2025-01-05 02:00 UTC

## Understanding the Distinction

### Field (High-Level)
- **What**: TypeScript/JavaScript class that users interact with
- **Example**: `Field(123)`, `field.add(other)`
- **Purpose**: User-friendly API with methods and type safety

### FieldVar (Low-Level)
- **What**: Internal array representation used by constraint systems
- **Format**: `[type, data]` where:
  - Constants: `[0, [0, "value"]]`
  - Variables: `[1, id]`
  - Addition: `[2, leftExpr, rightExpr]`
  - Scale: `[3, [0, "scalar"], expr]`
- **Purpose**: Cross-language data format (OCaml ↔ JavaScript ↔ Rust)

## The Root Cause of Test Failures

### Error Analysis
```
Sparky error: Invalid FieldVar format: expected constant with 1 argument, got 4 arguments
```

This error occurs when Sparky's Rust code expects a constant in format:
- **Expected**: `[0, [0, "value"]]` (2 elements at top level)
- **Received**: Something with 4 arguments

### Investigation Findings

From `sparky-core/src/fieldvar_parser.rs`:
```rust
// Constant Values: [0, FieldConst]
// Format: [0, [0, bigint_string]]
// Example: [0, [0, "12345678901234567890"]]
```

The parser expects:
1. First element: `0` (type tag for constant)
2. Second element: `[0, "value"]` (FieldConst structure)

### Likely Cause

The error "got 4 arguments" suggests that either:
1. **Incorrect Serialization**: The JavaScript layer is sending `[0, 0, "value", something]` instead of `[0, [0, "value"]]`
2. **Double Wrapping**: The value might be wrapped twice, creating extra nesting
3. **Field Object Leakage**: A Field object with multiple properties is being serialized instead of just the FieldVar array

### The Fix Required

1. **Check sparky-adapter constant creation**: Ensure `fieldOperations.constant()` returns proper format
2. **Verify Field to FieldVar conversion**: The `.value` property of Field should be a properly formatted FieldVar
3. **Debug serialization boundary**: Add logging at the JavaScript-to-WASM boundary to see exact data format

## Why This Matters

The Field vs FieldVar distinction is critical because:
- **Snarky** uses FieldVar format internally
- **Sparky** must match this format exactly for compatibility
- Any mismatch breaks the entire constraint compilation process

## Next Steps

1. Add debug logging to see exact FieldVar format being passed
2. Check if Field objects are being passed instead of FieldVar arrays
3. Ensure proper unwrapping of Field.value before passing to WASM
4. Verify the format converter is being used consistently