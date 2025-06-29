# Field.readVar Fix Plan

## Problem Analysis

The `field.readVar` function in the Sparky adapter is failing because of a format mismatch between o1js FieldVar representation and Sparky's expected format.

### Current Situation

1. **o1js FieldVar Format** (TypeScript array-based):
   ```javascript
   // Constants
   [0, [0, bigint]]  // [FieldType.Constant, FieldConst]
   
   // Variables
   [1, number]       // [FieldType.Var, variable_index]
   
   // Add
   [2, FieldVar, FieldVar]  // [FieldType.Add, left, right]
   
   // Scale
   [3, [0, bigint], FieldVar]  // [FieldType.Scale, constant, var]
   ```

2. **Sparky Expected Format** (object-based):
   ```javascript
   // Constants
   { type: "constant", value: "bigint_string" }
   
   // Variables
   { type: "var", id: number }
   
   // Add
   { type: "add", left: Cvar, right: Cvar }
   
   // Scale
   { type: "scale", scalar: "bigint_string", cvar: Cvar }
   ```

3. **Sparky's readVar Implementation**:
   - Has full support for reading constants, variables, and compound expressions
   - Recursively evaluates Add and Scale expressions
   - Looks up witness values from RunState for variables
   - Returns bigint values as strings to JavaScript

## Root Cause

The Sparky adapter's `readVar` implementation is throwing an error for non-constant fields because it's not converting the o1js FieldVar format to Sparky's expected Cvar format before calling the WASM function.

## Solution Design

### Step 1: Create Format Converter

Add a converter function in `sparky-adapter.js` that transforms o1js FieldVar to Sparky Cvar format:

```javascript
function fieldVarToCvar(fieldVar) {
  if (!Array.isArray(fieldVar)) {
    throw new Error('Invalid FieldVar format');
  }
  
  const [type, ...data] = fieldVar;
  
  switch (type) {
    case 0: // Constant
      const [, bigintValue] = data[0]; // data[0] is [0, bigint]
      return {
        type: 'constant',
        value: bigintValue.toString()
      };
      
    case 1: // Var
      return {
        type: 'var',
        id: data[0] // variable index
      };
      
    case 2: // Add
      return {
        type: 'add',
        left: fieldVarToCvar(data[0]),
        right: fieldVarToCvar(data[1])
      };
      
    case 3: // Scale
      const [, scalarBigint] = data[0]; // data[0] is [0, bigint]
      return {
        type: 'scale',
        scalar: scalarBigint.toString(),
        cvar: fieldVarToCvar(data[1])
      };
      
    default:
      throw new Error(`Unknown FieldVar type: ${type}`);
  }
}
```

### Step 2: Update readVar Implementation

Replace the current `readVar` implementation in `sparky-adapter.js`:

```javascript
readVar(x) {
  // Convert o1js FieldVar to Sparky Cvar format
  const cvar = fieldVarToCvar(x);
  
  // Call Sparky's readVar implementation
  const resultString = sparkyInstance.field.readVar(cvar);
  
  // Convert string result back to bigint
  return BigInt(resultString);
}
```

### Step 3: Ensure Sparky Instance is Initialized

Make sure `sparkyInstance` has the field.readVar method available. This should already be exposed by the WASM module.

### Step 4: Handle Edge Cases

1. **Error Handling**: Wrap in try-catch to provide meaningful error messages
2. **Type Validation**: Ensure input is valid FieldVar format
3. **Prover Mode Check**: Sparky's readVar only works in prover mode

## Implementation Steps

1. **Update sparky-adapter.js**:
   - Add `fieldVarToCvar` converter function
   - Update `readVar` to use the converter
   - Add proper error handling

2. **Test the Fix**:
   - Test with constants: `[0, [0, 42n]]`
   - Test with variables: `[1, 0]`
   - Test with compound expressions: `[2, [1, 0], [0, [0, 5n]]]`
   - Verify error handling for non-prover mode

3. **Verify Integration**:
   - Run existing tests with Sparky backend
   - Ensure Field.toConstant() works in prover blocks
   - Test Bool.toBoolean() which uses readVar internally

## Expected Outcome

After implementing this fix:
- `field.readVar` will work for all FieldVar types (constants, variables, compounds)
- High-level operations like `Field.toConstant()` and `Bool.toBoolean()` will work
- The test "7. Testing low-level Snarky API" will pass
- No more "readVar for non-constant fields not yet implemented" errors

## Future Considerations

1. **Performance**: The format conversion adds overhead. Consider caching conversions if needed.
2. **Bidirectional Conversion**: May need to convert Sparky Cvars back to FieldVars for other operations.
3. **Type Safety**: Consider adding TypeScript types for better development experience.