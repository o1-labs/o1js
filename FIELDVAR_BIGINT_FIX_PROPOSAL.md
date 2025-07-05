# FieldVar BigInt Serialization Fix Proposal

Created: 2025-01-05 02:30 UTC
Last Modified: 2025-01-05 02:30 UTC

## Problem Summary

The comprehensive test suite fails with "Invalid FieldVar format: expected constant with 1 argument, got 4 arguments" when compiling SmartContracts on the Sparky backend.

## Root Cause

1. **Field values contain BigInt**: When `Field(123)` is created, its internal `.value` property is `[0, [0, 123n]]`
2. **WASM boundary uses JSON serialization**: The sparky-wasm module likely uses JSON to pass data
3. **JSON.stringify cannot serialize BigInt**: This causes the error "Do not know how to serialize a BigInt"
4. **Malformed data reaches Rust parser**: The failed serialization results in incorrect data format

## Evidence

From debug script output:
```javascript
Field(123).value = [0, [0, 123n]]  // Contains BigInt
Field(-1).value = [0, [0, 28948022309329048855892746252171976963363056481941560715954676764349967630336n]]
```

## Solution

### Option 1: Add BigInt Serialization Handler (Quick Fix)

Add a global BigInt.toJSON handler in the sparky-adapter initialization:

```typescript
// In module-loader.ts or index.ts initialization
if (typeof BigInt !== 'undefined' && !BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function() {
    return this.toString();
  };
}
```

### Option 2: Convert at WASM Boundary (Proper Fix)

Create a conversion function that handles FieldVar arrays before passing to WASM:

```typescript
// In sparky-adapter/field-operations.ts
function prepareFieldVarForWasm(fieldVar: FieldVar): any {
  if (!Array.isArray(fieldVar)) return fieldVar;
  
  return fieldVar.map(elem => {
    if (typeof elem === 'bigint') {
      return elem.toString();
    } else if (Array.isArray(elem)) {
      return elem.map(nested => 
        typeof nested === 'bigint' ? nested.toString() : nested
      );
    }
    return elem;
  });
}

// Use in all field operations
assertEqual(x: FieldVar, y: FieldVar): void {
  const xPrepared = prepareFieldVarForWasm(x);
  const yPrepared = prepareFieldVarForWasm(y);
  getFieldModule().assertEqual(xPrepared, yPrepared);
}
```

### Option 3: Fix at Field Creation (Most Robust)

Ensure Field values never contain BigInt in the first place:

```typescript
// In Field constructor or wherever FieldVar is created
function createFieldVar(value: bigint | string): FieldVar {
  const strValue = typeof value === 'string' ? value : value.toString();
  return [0, [0, strValue]];  // Always use string, never BigInt
}
```

## Recommendation

**Implement Option 2** - Convert at WASM boundary. This:
- Fixes the immediate issue
- Maintains type safety in TypeScript
- Doesn't modify global prototypes
- Handles all edge cases

## Implementation Location

The fix should be implemented in:
- `/home/fizzixnerd/src/o1labs/o1js2/src/bindings/sparky-adapter/field-operations.ts`
- Apply to all functions that pass FieldVar arrays to WASM:
  - `assertEqual`
  - `assertMul`
  - `assertSquare`
  - `add`, `mul`, `sub`, `scale`, etc.

## Testing

After implementation:
1. Run the failing test: `npm run test:sparky-comprehensive`
2. Verify VK parity improves beyond current 42.9%
3. Ensure no regression in other tests