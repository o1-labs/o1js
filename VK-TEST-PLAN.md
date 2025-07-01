# VK Compatibility Test Plan

## Overview
This comprehensive test suite addresses the critical blocker for Sparky/Snarky compatibility: verification key (VK) parity. The test suite covers EVERY entry function in the WASM API to ensure complete compatibility.

## Test Structure

### 1. Comprehensive Test Suite (`src/test/sparky-vk-comprehensive.test.ts`)
Tests every WASM API entry function:

#### Field Operations
- `fromNumber` - Field creation from numbers
- `random` - Cryptographically secure random field generation
- `readVar` - Reading witness variables in prover mode
- `assertEqual` - Field equality assertions
- `assertMul` - Multiplication constraints
- `assertSquare` - Square constraints
- `assertBoolean` - Boolean constraints
- `add`, `sub`, `mul`, `div` - Arithmetic operations
- `negate`, `inv`, `sqrt` - Field operations

#### Bool Operations
- `and`, `or`, `not` - Boolean logic gates
- `assertEqual` - Boolean equality

#### Hash Functions
- `poseidon` - Poseidon hash
- `poseidon.sponge` - Poseidon sponge construction

#### EC Operations
- `ecAdd` - Elliptic curve point addition
- `ecScale` - Variable-base scalar multiplication
- `ecEndoscale` - Endomorphism-optimized scalar multiplication

#### Range Checks
- `rangeCheck64` - 64-bit range constraints
- `rangeCheck0` - Zero-value range check
- `rangeCheck1` - Complex multi-limb range checks

#### Foreign Field Operations
- `foreignFieldAdd` - Addition in foreign fields
- `foreignFieldMul` - Multiplication in foreign fields

#### Advanced Gates
- `generic` - Generic gate with custom coefficients
- `rotate` - Rotation gate for bitwise operations
- `xor` - XOR gate (pending implementation)
- `lookup` - Lookup table operations (pending implementation)

#### Constraint System Operations
- `enterConstraintSystem` - Constraint generation mode
- `exists` - Witness variable creation

### 2. Edge Cases Test Suite (`src/test/vk-edge-cases.test.ts`)
Tests specific constraint patterns:

- Empty circuits
- Constraint reduction scenarios
- Boolean conversion patterns
- Field boundary values
- Witness generation patterns
- Range check patterns
- Hash function variations
- EC operation edge cases
- Complex gadget usage

### 3. Debug Scripts

#### `run-vk-tests.mjs`
Main test runner that:
1. Builds the project
2. Runs all VK tests
3. Generates detailed markdown report
4. Creates JSON summary

#### `debug-vk-generation.mjs`
Debugging tool that:
1. Compares constraint systems between backends
2. Identifies VK generation issues
3. Saves constraint system JSON for analysis

## Critical Issue Identified

**All Sparky programs generate the SAME verification key!**

This indicates a fundamental issue where Sparky's constraint system is not being properly passed to the VK generation logic (Pickles).

## Running the Tests

```bash
# Run the comprehensive test suite
./run-vk-tests.mjs

# Run edge case tests
./jest src/test/vk-edge-cases.test.ts

# Debug VK generation
./debug-vk-generation.mjs

# Run existing VK comparison
./vk-investigation-simple.mjs
```

## Expected Outputs

1. **VK-COMPATIBILITY-REPORT.md** - Detailed markdown report
2. **vk-test-summary.json** - JSON summary of results
3. **vk-comprehensive-test-results.json** - Detailed test results
4. **debug-snarky-cs.json** - Snarky constraint system
5. **debug-sparky-cs.json** - Sparky constraint system

## Next Steps

1. **Fix the Sparky → Pickles interface**: The constraint system from Sparky needs to be properly transmitted to Pickles for VK generation.

2. **Verify constraint system format**: Ensure Sparky generates constraint systems in the exact format expected by Pickles.

3. **Test individual gate types**: Once basic VK generation works, verify each gate type produces identical constraints.

4. **Performance comparison**: After achieving VK parity, benchmark performance differences.

## Success Criteria

- All test cases pass with identical VKs between Snarky and Sparky
- No performance regression > 2x for any operation
- Full API compatibility maintained