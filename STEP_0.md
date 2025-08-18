# STEP 0 - Memory Leak Benchmark Results

**Created**: 2025-08-11 UTC  
**Last Modified**: 2025-08-11 UTC

## Summary

Successfully created a benchmark that demonstrates a significant WASM linear memory leak in o1js during proof generation.

## Key Findings

### Memory Leak Characteristics
- **Initial WASM Memory**: 36.06 MB (after compilation)
- **Final WASM Memory**: 775.75 MB (after 10 proofs)
- **Total Growth**: 739.69 MB
- **Average Leak Per Proof**: ~74 MB
- **Memory Increase Factor**: 21.51x

### Leak Pattern
- First proof has largest increase: +366.63 MB (likely includes initial allocations)
- Subsequent proofs leak 33-55 MB each
- Consistent linear growth pattern
- JavaScript GC does not affect WASM linear memory (as expected)

### Performance Impact
- At current leak rate, WASM memory would exhaust after ~54 proofs
- This makes recursive proving and long-running proving services impossible

## Technical Implementation

### Accessing WASM Memory
- Used `get_memory_byte_length()` function exported by the plonk_wasm module
- Critical: Must import from `dist/node/bindings/compiled/_node_bindings/plonk_wasm.cjs` (the built version)
- Not from `src/bindings/compiled/_node_bindings/plonk_wasm.cjs` (source version)

### Benchmark Design
- Simple zkProgram that adds two Field elements with one constraint
- 10 iterations of proof generation
- Force GC between iterations (no effect on WASM memory)
- Tracks memory before/after each proof

## Files Created
- `memory-benchmark.ts` - Main benchmark script
- `run-with-gc` - Shell script to run Node with --expose-gc flag
- `test-wasm-memory.js` - Test script to verify WASM memory access

## Verification

The memory leak is real and significant:
- WASM linear memory grows monotonically
- No recovery even with explicit GC
- Consistent reproducible pattern

## Next Steps

With the memory leak confirmed and quantified, we can proceed to Step 1 to explore the WASM bindings and identify allocatable types that may be leaking.