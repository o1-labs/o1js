# VK Compatibility Test Suite for Snarky/Sparky

**Date**: July 1, 2025  
**Status**: Planning Phase  
**Critical**: VK compatibility is blocking release

## Executive Summary

This document outlines a comprehensive test suite for verifying Verification Key (VK) compatibility between the Snarky (OCaml) and Sparky (Rust/WASM) backends. The test suite will cover every WASM API entry point to ensure identical constraint generation and VK output.

## Test Strategy

### 1. API Coverage
Test every function exposed in the Sparky adapter to ensure:
- Identical constraint generation
- Same VK output
- Matching constraint counts
- Equivalent gate structures

### 2. Test Methodology
For each API function:
1. Create minimal test circuit using the function
2. Compile with both Snarky and Sparky
3. Compare VKs byte-by-byte
4. Analyze constraint differences if VKs don't match
5. Generate detailed error reports

### 3. Success Criteria
- All VKs must match exactly between backends
- Constraint counts must be identical
- Gate types and parameters must align
- Performance degradation < 2x

## API Function Inventory

Based on analysis of `src/bindings/sparky-adapter.js`, here are all the WASM API functions that need testing:

### Run Module APIs
1. **inProver()** - Check prover mode status
2. **asProver(f)** - Execute function in prover mode
3. **inProverBlock()** - Check if in prover block
4. **setEvalConstraints(value)** - Set constraint evaluation mode
5. **enterConstraintSystem()** - Enter constraint generation mode
6. **enterGenerateWitness()** - Enter witness generation mode
7. **enterAsProver(size)** - Enter prover mode with allocation

### Field Operations
8. **field.fromNumber(x)** - Create field from number
9. **field.random()** - Generate random field element
10. **field.readVar(x)** - Read field variable value
11. **field.assertEqual(x, y)** - Assert field equality
12. **field.assertMul(x, y, z)** - Assert multiplication
13. **field.assertSquare(x, y)** - Assert squaring
14. **field.assertBoolean(x)** - Assert boolean constraint
15. **field.truncateToBits16(lengthDiv16, x)** - Truncate to 16-bit chunks
16. **field.add(x, y)** - Field addition
17. **field.mul(x, y)** - Field multiplication
18. **field.sub(x, y)** - Field subtraction
19. **field.div(x, y)** - Field division
20. **field.negate(x)** - Field negation
21. **field.inv(x)** - Field inversion
22. **field.square(x)** - Field squaring
23. **field.sqrt(x)** - Field square root
24. **field.equal(x, y)** - Field equality check
25. **field.toConstant(x)** - Convert to constant

### Boolean Operations
26. **bool.and(x, y)** - Boolean AND
27. **bool.or(x, y)** - Boolean OR
28. **bool.not(x)** - Boolean NOT
29. **bool.assertEqual(x, y)** - Assert boolean equality

### Gate Operations
30. **gates.zero(in1, in2, out)** - Zero gate
31. **gates.generic(sl, l, sr, r, so, o, sm, sc)** - Generic arithmetic gate
32. **gates.poseidon(state)** - Poseidon hash gate
33. **gates.ecAdd(p1, p2, p3, inf, same_x, slope, inf_z, x21_inv)** - EC addition
34. **gates.ecScale(state)** - Variable-base EC scalar multiplication
35. **gates.ecEndoscale(state, xs, ys, nAcc)** - Endomorphism scalar multiplication
36. **gates.ecEndoscalar(state)** - Endomorphism scalar processing
37. **gates.rangeCheck(state)** - 64-bit range check
38. **gates.rangeCheck0(x)** - Check value equals 0
39. **gates.rangeCheck1(...)** - Complex multi-variable range check
40. **gates.foreignFieldAdd(...)** - Foreign field addition
41. **gates.foreignFieldMul(...)** - Foreign field multiplication
42. **gates.lookup(sorted, original, table)** - Lookup table (NOT IMPLEMENTED)
43. **gates.xor(in1, in2, out, bits)** - XOR gate (NOT IMPLEMENTED)
44. **gates.rotate(...)** - Rotate gate
45. **gates.raw(kind, values, coefficients)** - Raw gate interface

### Constraint System APIs
46. **constraintSystem.rows(system)** - Get row count
47. **constraintSystem.digest(system)** - Get system digest
48. **constraintSystem.toJson(system)** - Export to JSON

### Circuit APIs
49. **circuit.compile(main, publicInputSize)** - Compile circuit
50. **circuit.prove(main, publicInputSize, publicInput, keypair)** - Generate proof
51. **circuit.verify(publicInput, proof, verificationKey)** - Verify proof

### Foreign Field APIs
52. **foreignField.fromHex(hex)** - Create from hex
53. **foreignField.toBigint(ff)** - Convert to bigint

### Additional APIs
54. **exists(size, compute)** - Create witness variables
55. **state.allocVar(state)** - Allocate variable
56. **state.storeFieldElt(state, x)** - Store field element
57. **state.getVariableValue(state, x)** - Get variable value

## Test Implementation Plan

### Phase 1: Core Field Operations (Priority: CRITICAL)
Test basic field arithmetic that forms the foundation:
- [ ] field.add, sub, mul, div
- [ ] field.assertEqual, assertMul, assertSquare
- [ ] field.assertBoolean
- [ ] Constraint counts for each operation

### Phase 2: Complex Gates (Priority: HIGH)
Test gates that are known to have issues:
- [ ] gates.poseidon - Must generate exactly 660 constraints
- [ ] gates.ecAdd - Full EC addition with all edge cases
- [ ] gates.ecScale - Variable-base scalar multiplication
- [ ] gates.ecEndoscale/ecEndoscalar - GLV endomorphism
- [ ] gates.rangeCheck variants

### Phase 3: Foreign Field Operations (Priority: HIGH)
Test cross-chain compatibility:
- [ ] foreignFieldAdd with various moduli
- [ ] foreignFieldMul with carry propagation
- [ ] Edge cases: overflow, underflow

### Phase 4: Circuit Compilation (Priority: CRITICAL)
Test full circuit compilation pipeline:
- [ ] Simple circuits (0-5 private inputs)
- [ ] Complex circuits with mixed operations
- [ ] VK comparison for each circuit
- [ ] Constraint system JSON comparison

### Phase 5: Edge Cases (Priority: MEDIUM)
- [ ] Empty circuits
- [ ] Circuits with only public inputs
- [ ] Maximum constraint circuits
- [ ] Nested prover blocks

## Test File Structure

```
src/test/vk-compatibility/
├── test-runner.ts              # Main test orchestrator
├── api-tests/
│   ├── field-operations.test.ts
│   ├── boolean-operations.test.ts
│   ├── gate-operations.test.ts
│   ├── foreign-field.test.ts
│   └── circuit-compilation.test.ts
├── reports/
│   └── vk-compatibility-report.html
└── fixtures/
    └── expected-vks.json
```

**Note**: We'll use the existing `src/test/tools/constraint-system-analyzer.ts` for constraint analysis and VK comparison.

## Error Reporting

Each test failure will generate:
1. **VK Diff**: Byte-by-byte comparison
2. **Constraint Analysis**: 
   - Total constraint count difference
   - Gate type distribution
   - Specific gate parameter differences
3. **Reproduction Code**: Minimal example to reproduce
4. **Performance Metrics**: Compilation time comparison

## Implementation Timeline

1. **Day 1**: Implement test runner and basic field operations
2. **Day 2**: Implement complex gate tests (Poseidon, EC operations)
3. **Day 3**: Foreign field and circuit compilation tests
4. **Day 4**: Edge cases and comprehensive reporting
5. **Day 5**: Fix identified issues and re-test

## Known Issues to Test

From DEV.md and BLARG.md:
1. **Constraint Reduction**: Sparky now has reduce_lincom and reduce_to_v
2. **Poseidon**: Must generate exactly 660 constraints
3. **EC Operations**: Recently implemented, need thorough testing
4. **Foreign Fields**: Fully implemented as of June 30, 2025
5. **Lookup/XOR**: Not implemented - tests should verify error handling

## Success Metrics

- 100% API coverage
- 0 VK mismatches for implemented features
- < 2x performance degradation
- Clear error messages for unimplemented features
- Automated CI integration ready

## Next Steps

1. Create test runner infrastructure
2. Implement VK comparison utilities
3. Start with Phase 1 field operation tests
4. Generate first compatibility report
5. Iterate based on findings