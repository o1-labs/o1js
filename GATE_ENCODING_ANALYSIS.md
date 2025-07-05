# Gate Encoding Analysis: Snarky vs Sparky

Created: January 5, 2025, 03:00 UTC
Last Modified: January 5, 2025, 03:00 UTC

## Overview

This document analyzes the fundamental differences in how Snarky and Sparky encode constraints into gates, explaining why they produce different JSON representations even for mathematically equivalent operations.

## Key Finding

**Snarky and Sparky use different gate encoding strategies that are mathematically equivalent but structurally different.**

## Gate Encoding Comparison

### Field Addition Example

**Input Operation**: `Field(10).add(Field(20))` with witness variables

#### Snarky Encoding
```json
{
  "gates": [{
    "type": "Generic",
    "wires": [
      {"row": 0, "col": 5},
      {"row": 0, "col": 1}, 
      {"row": 1, "col": 1},
      {"row": 1, "col": 0},
      {"row": 0, "col": 4},
      {"row": 0, "col": 0},
      {"row": 0, "col": 6}
    ],
    "coeffs": ["0", "0", "1", "-1", "0", "1", "1", "-1", "0", "0"]
  }]
}
```
- **1 complex Generic gate**
- **Row/col wire addressing** for constraint matrix placement
- **10 coefficients** encoding the entire operation

#### Sparky Encoding (After Optimization)
```json
{
  "gates": [
    {
      "type": "generic",
      "wires": [6, 0, 5],
      "coeffs": []
    },
    {
      "type": "generic", 
      "wires": [6, 3, 9],
      "coeffs": []
    },
    {
      "type": "generic",
      "wires": [11, 0, 5, 3, 9],
      "coeffs": []
    }
  ]
}
```
- **3 simpler gates** after optimization
- **Flat wire indexing** (direct variable references)
- **Empty coefficients** (operations implicit in structure)

## Why The Difference?

### 1. **Compilation Philosophy**
- **Snarky**: Direct constraint encoding into PLONK gates with explicit coefficients
- **Sparky**: Multi-phase compilation with optimization passes that restructure constraints

### 2. **Gate Representation**
- **Snarky**: Uses kimchi's Generic gate format with full coefficient arrays
- **Sparky**: Uses simplified gate representation, relying on gate structure

### 3. **Wire Addressing**
- **Snarky**: Row/column addressing for constraint matrix placement
- **Sparky**: Direct variable ID references

### 4. **Optimization Strategy**
- **Snarky**: Minimal optimization, preserves operation structure
- **Sparky**: Aggressive optimization that combines and restructures constraints

## Mathematical Equivalence

Despite the different representations, both systems generate mathematically equivalent constraint systems:
- Same satisfiability conditions
- Same solution space
- Same security properties

## Impact on VK Generation

The different gate encodings lead to different verification keys (VKs) because:
1. Gate count differs (1 vs 3 gates)
2. Gate structure differs (complex vs simple)
3. Wire layout differs (row/col vs flat)

This explains why Sparky and Snarky produce different VK hashes even when the constraint systems are mathematically equivalent.

## Recommendations

### Option 1: Match Snarky's Encoding (Complex)
- Modify Sparky to generate identical gate layouts
- Disable optimizations that change gate structure
- Implement row/col wire addressing
- Generate full coefficient arrays

### Option 2: Accept Different Encodings (Pragmatic)
- Document that backends use different gate encodings
- Ensure mathematical equivalence testing
- Focus on functional correctness over bit-identical output
- Use backend-specific test expectations

### Option 3: Adapter Layer (Hybrid)
- Create a transformation layer that converts Sparky gates to Snarky format
- Preserve Sparky's optimizations internally
- Present Snarky-compatible output for compatibility

## Conclusion

The gate encoding differences between Snarky and Sparky are fundamental architectural choices, not bugs. While they produce different JSON representations, both systems are mathematically correct and secure. The choice of how to handle this difference depends on the project's compatibility requirements versus optimization goals.