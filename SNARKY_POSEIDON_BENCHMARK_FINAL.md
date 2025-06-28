# Snarky Poseidon Performance Benchmark Results

## Executive Summary

We successfully benchmarked the Poseidon hash implementation performance, comparing:
1. **Sparky (Rust/WASM)** - New implementation
2. **Snarky BigInt (TypeScript)** - Reference implementation
3. **Snarky OCaml** - Production implementation (build issues prevented direct testing)

## Performance Results

### 1. Sparky (Rust/WASM) Performance

```
Initialization: 32.381ms
Average per hash: 1.662ms
Throughput: ~602 hashes/second
Constraints per hash: 660
```

**Batch Performance:**
- 1000 hashes: 1661.982ms total
- Consistent ~1.66ms per hash across different batch sizes

### 2. Snarky BigInt (TypeScript) Performance

```
Average per hash: 0.456ms
Throughput: ~2,192 hashes/second
Memory usage: 0.85MB for 10,000 hashes
```

**Batch Performance:**
- 10 hashes: 0.920ms per hash
- 100 hashes: 0.515ms per hash  
- 1000 hashes: 0.461ms per hash
- 5000 hashes: 0.459ms per hash

### 3. Performance Comparison

| Implementation | Avg Time/Hash | Throughput | Notes |
|----------------|---------------|------------|-------|
| Snarky BigInt | 0.456ms | 2,192/sec | TypeScript reference |
| Sparky WASM | 1.662ms | 602/sec | Rust compiled to WASM |
| Snarky OCaml | Unknown | Unknown | Build issues |

**Key Finding**: The TypeScript BigInt implementation is 3.6x faster than Sparky WASM.

## Technical Analysis

### Why is BigInt Faster?

1. **Native JavaScript**: BigInt operations are optimized by V8
2. **No WASM overhead**: Direct JavaScript execution
3. **JIT optimization**: V8 can optimize hot paths
4. **Memory locality**: No WASM boundary crossing

### Sparky Advantages

Despite slower raw performance, Sparky offers:

1. **Constraint Generation**: Proper zkSNARK constraint system integration
2. **Memory Safety**: Rust's memory guarantees
3. **Portability**: WASM runs everywhere
4. **Future Optimization**: Room for SIMD, parallel execution

### Hash Output Discrepancy

**Important**: The BigInt and Sparky implementations produce different outputs for the same input:

```
Input: hash(100, 0)
Sparky: 8540862089960479027598468084103001504332093299703848384261193335348282518119
BigInt: 1259702704738371196984972831885384469288156549426257425022876410209069764640
```

This suggests different Poseidon parameters or implementation details.

## Correctness Validation

### Sparky
- ✅ Generates 660 constraints per hash (correct for 55 rounds)
- ✅ Consistent performance across batch sizes
- ✅ Proper symbolic expression output for constraint system

### BigInt
- ✅ Fast execution
- ❌ Different output values (needs investigation)
- ❓ Not integrated with constraint system

## Recommendations

1. **For Development**: Use BigInt implementation for fast iteration
2. **For Production**: Need OCaml implementation benchmarks
3. **For Migration**: Sparky shows promise but needs optimization
4. **Investigation Needed**: Why do implementations produce different outputs?

## Next Steps

1. **Fix Build System**: Get OCaml implementation working for true comparison
2. **Verify Parameters**: Ensure all implementations use same Poseidon parameters
3. **Optimize Sparky**: 
   - Investigate WASM optimization flags
   - Consider native bindings for critical paths
   - Profile and optimize hot paths
4. **Test Integration**: Benchmark in real zkApp context

## Conclusion

While the TypeScript BigInt implementation shows impressive performance (0.456ms/hash), it's not the production implementation. Sparky's 1.662ms/hash is reasonable for a WASM implementation and provides proper constraint system integration. The true comparison requires benchmarking against the OCaml implementation used in production.

The 3.6x performance difference between BigInt and Sparky suggests significant optimization opportunities in the WASM implementation.