# LIR to Constraint Conversion Summary

Created: July 6, 2025
Last Modified: July 6, 2025 12:45 PM UTC

## Overview

This document summarizes the implementation of LIR (Low-level IR) gate to sparky-core ConstraintType conversion functionality. This conversion is the reverse of the MIR->LIR transformation and allows recovery of high-level constraint semantics from lowered gate representations.

## Implementation

### Core Module: `lir-to-constraint.ts`

Located at: `/src/bindings/sparky-adapter/lir-to-constraint.ts`

The module provides:

1. **Type Definitions**
   - `ConstraintType` - Matches sparky-core constraint types
   - `LirGate` - LIR gate representations
   - `LirConstraint` - Complete constraint with gate and column assignments

2. **Main Conversion Function**
   ```typescript
   function lirGateToConstraintType(lir: LirConstraint): ConstraintType | null
   ```
   Converts a single LIR constraint to its high-level ConstraintType representation.

3. **Batch Processing**
   ```typescript
   function convertLirConstraintSystem(constraints: LirConstraint[]): ConstraintType[]
   ```
   Processes an array of LIR constraints.

4. **Analysis Tools**
   ```typescript
   function analyzeLirConstraintSystem(constraints: LirConstraint[])
   ```
   Provides statistics about conversion success rates.

## Supported Conversions

### Generic Gates

Generic gates with coefficients `a*l + b*r + c*o + d*l*r + e = 0` are pattern-matched to:

- **R1CS**: `0*l + 0*r + (-1)*o + 1*l*r + 0 = 0` → `l * r = o`
- **Square**: `0*l + 0*r + (-1)*o + 1*l*l + 0 = 0` → `l² = o` (where left = right)
- **Boolean**: `1*l + 0*r + 0*o + (-1)*l*l + 0 = 0` → `l(1-l) = 0`
- **Equal**: `1*l + (-1)*r + 0*o + 0*l*r + 0 = 0` → `l = r`
- **BooleanNot**: `1*l + 0*r + (-1)*o + 0*l*r + (-1) = 0` → `o = 1 - l`
- **Linear**: Any combination of linear terms without multiplication

### Specialized Gates

- **Poseidon**: Full permutation state table → hash constraint
- **RangeCheck0**: 88-bit decomposition → range check constraint
- **EcAddComplete**: Elliptic curve addition → EC point addition
- **EcVarBaseMul**: Variable base scalar multiplication → EC scalar mul
- **ForeignFieldAdd**: Limbed arithmetic → foreign field addition
- **ForeignFieldMul**: Limbed multiplication → foreign field multiplication

## Key Implementation Details

### Field Arithmetic

- Field order: `28948022309329048855892746252171976963363056481941560715954676764349967630337`
- Minus one representation: `FIELD_ORDER - 1n`
- Proper handling of negative coefficients in field arithmetic

### Column Assignments

- Standard gates use `left`, `right`, `output` columns
- Complex gates use additional `aux` columns for extra variables
- Foreign field operations encode limbs in auxiliary columns

### Error Handling

- Returns `null` for non-convertible patterns
- Validates auxiliary column counts
- Warns about unknown gate types

## Test Coverage

### Test Files

1. **`test-lir-to-constraint.ts`** - Basic conversion tests
2. **`test-lir-conversion-demo.ts`** - Comprehensive demonstration

### Test Results

✅ All core gate types convert successfully:
- Foreign Field Addition
- R1CS Multiplication  
- Boolean Constraints
- Linear Constraints

✅ Edge cases handled properly:
- Missing auxiliary columns
- Unknown gate types
- Non-standard coefficient patterns

## Usage Example

```typescript
import { lirGateToConstraintType } from '../bindings/sparky-adapter/lir-to-constraint.js';

// Convert a LIR constraint
const constraint = lirGateToConstraintType(lirConstraint);

if (constraint) {
  console.log(`Converted to ${constraint.type}`);
} else {
  console.log('Could not convert LIR gate');
}
```

## Future Enhancements

1. **Additional Gate Types**
   - Lookup gates
   - XOR/AND gates
   - Rotation gates

2. **Metadata Preservation**
   - Source location tracking
   - Optimization hints
   - Debug information

3. **Performance Optimization**
   - Caching for repeated patterns
   - Bulk conversion optimizations

## Integration Points

The LIR conversion functionality integrates with:
- sparky-wasm constraint system export
- sparky-ir transformations
- Debugging and analysis tools

This provides a complete bidirectional transformation pipeline between high-level constraints and low-level gates.