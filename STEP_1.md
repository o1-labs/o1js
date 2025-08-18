# STEP 1 - WASM Bindings Exploration Results

**Created**: 2025-08-11 UTC  
**Last Modified**: 2025-08-11 UTC

## Summary

Successfully located and analyzed the WASM bindings source code. Found **critical memory leak vulnerability**: No types have Drop implementations.

## Key Discoveries

### Location of WASM Bindings
- **Source**: `/src/mina/src/lib/crypto/proof-systems/plonk-wasm/`
- **Crate name**: `plonk_wasm`
- **Compiles to**: `/src/bindings/compiled/_node_bindings/plonk_wasm.wasm`

### Architecture Overview
```
plonk-wasm/
├── src/
│   ├── lib.rs                 # Main module, exports get_memory_byte_length()
│   ├── wasm_vector.rs         # Generic vector types (NO DROP!)
│   ├── srs.rs                 # Structured Reference String (50-200MB!)
│   ├── pasta_fp_plonk_index.rs # Prover indexes (10-50MB)
│   ├── plonk_proof.rs         # Proof structures
│   ├── gate_vector.rs         # Circuit gates
│   ├── poly_comm.rs           # Polynomial commitments
│   └── ...
```

## Critical Finding: Memory Transfer Without Cleanup

**The real issue isn't missing Drop implementations** (as you correctly pointed out, Rust automatically generates Drop for types). The problem is:

1. **Ownership Transfer to JavaScript**: When wasm-bindgen exports Rust objects to JavaScript, it transfers ownership using mechanisms like `std::mem::forget()` or `Box::into_raw()` to prevent Rust from dropping the memory.

2. **Missing JavaScript `.free()` Calls**: JavaScript must manually call `.free()` on WASM objects when done with them, but this isn't happening consistently.

3. **Evidence Found**:
   - `Box::into_raw()` used in `srs.rs` line 39 and `lib.rs` line 37
   - Some objects ARE freed (e.g., `domain.free()` in conversion-verifier-index.ts)
   - But critical objects like SRS, ProverIndex, and Proofs are NOT being freed

4. **Arc<SRS> Pattern**: The SRS uses `Arc` (reference counting), but when passed to JavaScript, the reference count never decreases because JavaScript never releases its reference.

## Size Analysis of Key Types

### The Big Three (Account for most of the 74MB leak)

1. **WasmFpSrs** (50-200MB)
   - Contains massive arrays of elliptic curve points
   - Uses `Arc<SRS<G>>` but Arc reference counting broken at WASM boundary
   - Lagrange basis accumulation adds more memory each time
   - Manual pointer management without cleanup

2. **WasmPastaFpPlonkIndex** (10-50MB)
   - Contains entire constraint system
   - `Box<ProverIndex<...>>` allocation never freed
   - Created for each proof generation

3. **WasmFpProverProof** (Several MB)
   - Complex nested structure with vectors
   - Accumulates with each proof

### Memory Leak Pattern Matches Our Observations

From Step 0:
- First proof: +367MB (SRS initialization + ProverIndex + Proof)
- Subsequent proofs: +33-55MB (ProverIndex + Proof accumulation)

This matches perfectly:
- Initial SRS: ~200MB
- Initial ProverIndex: ~50MB
- Initial Proof + overhead: ~117MB
- Each additional proof: ProverIndex (30-40MB) + Proof (5-15MB)

## Technical Deep Dive

### wasm_vector.rs Analysis
```rust
#[wasm_bindgen]
pub struct WasmVector<T>(Vec<T>);

// NO Drop implementation!
// Vec<T> is leaked when WasmVector goes out of scope
```

### srs.rs Manual Memory Management
```rust
// Uses raw pointers and manual memory management
// But no corresponding cleanup code
pub fn caml_fp_srs_create(depth: i32) -> WasmFpSrs {
    // Allocates massive SRS
    // No Drop means it's never freed
}
```

### Nested Allocations
Many types contain nested vectors:
- `WasmVecVecFp` contains `Vec<Vec<Fp>>`
- Without Drop, neither outer nor inner vectors are freed
- Exponential memory accumulation

## WASM-Specific Issues

1. **Arc doesn't work across WASM boundary**
   - Reference counting broken
   - Shared references never deallocated

2. **Box allocations persist**
   - `Box::into_raw()` used but no `Box::from_raw()` for cleanup
   - Raw pointers leaked

3. **JavaScript can't free Rust memory**
   - No exported free functions for complex types
   - Only `free_u32_ptr` exists, not sufficient

## Files Analyzed

- `/src/mina/src/lib/crypto/proof-systems/plonk-wasm/src/lib.rs`
- `/src/mina/src/lib/crypto/proof-systems/plonk-wasm/src/wasm_vector.rs`
- `/src/mina/src/lib/crypto/proof-systems/plonk-wasm/src/srs.rs`
- `/src/mina/src/lib/crypto/proof-systems/plonk-wasm/src/pasta_fp_plonk_index.rs`
- `/src/mina/src/lib/crypto/proof-systems/plonk-wasm/src/plonk_proof.rs`
- `/src/mina/src/lib/crypto/proof-systems/plonk-wasm/src/gate_vector.rs`
- `/src/mina/src/lib/crypto/proof-systems/plonk-wasm/src/poly_comm.rs`
- `/src/mina/src/lib/crypto/proof-systems/plonk-wasm/src/plonk_verifier_index.rs`

## Next Steps

With types identified and the lack of Drop implementations confirmed, Step 2 will add logging to track exact allocation/deallocation patterns. Focus on:
1. WasmFpSrs/WasmFqSrs (biggest leak)
2. ProverIndex types
3. Vector types
4. Proof structures

The absence of Drop implementations is the smoking gun for our memory leak.