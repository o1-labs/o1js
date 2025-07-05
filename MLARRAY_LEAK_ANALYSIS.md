# MLArray Leak Analysis

Created: 2025-01-05 03:15 UTC
Last Modified: 2025-01-05 03:15 UTC

## The Real Root Cause

The error "expected constant with 1 argument, got 4 arguments" indicates an **MLArray is being passed where a FieldVar is expected**.

### Parser Logic
1. **Expected FieldVar constant**: `[0, [0, "value"]]`
2. **Parser sees**: `0` (first element) → thinks it's a constant
3. **Parser passes**: `&array[1..]` to `parse_constant()`
4. **For correct input**: `[[0, "value"]]` (length 1) ✅
5. **For error case**: `[elem1, elem2, elem3, elem4]` (length 4) ❌

### What's Actually Being Passed
An MLArray with 4 elements: `[0, elem1, elem2, elem3, elem4]`

### How MLArrays Work
- **MLArray format**: `[0, ...elements]` 
- **Example**: 3 Fields → `[0, field1, field2, field3]`
- **Problem**: First element `0` matches FieldVar constant tag!

### Where This Could Happen
1. **Field state arrays**: When state contains multiple Fields
2. **Method parameters**: When methods take multiple Field arguments  
3. **Witness generation**: When multiple Fields are created together
4. **Format conversion**: When JavaScript arrays are incorrectly wrapped as MLArrays

### The Fix Location
Look for places where:
- MLArrays are created from Field arrays
- Field collections are passed to WASM
- Array format conversions happen

### Investigation Priority
1. **State management**: How are @state(Field) declarations handled?
2. **Method compilation**: How are @method parameters processed?
3. **Constraint accumulation**: What format is used during constraint collection?