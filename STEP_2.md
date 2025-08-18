# STEP 2 - Implementing Allocation/Deallocation Logging

**Created**: 2025-08-11 UTC  
**Last Modified**: 2025-08-11 UTC

## Summary

Successfully added allocation and deallocation logging to critical WASM types responsible for the memory leak.

## Implementation Details

### 1. Created Memory Tracking Module
- **File**: `src/memory_tracker.rs`
- Thread-safe ID generation using AtomicU64
- Logging functions that output to JavaScript console
- Size estimation helpers for vectors and nested vectors

### 2. Modified Critical Types

#### WasmVector<T> (Base type for many allocations)
- **File**: `src/wasm_vector.rs`
- Added `id` field to track unique allocation
- Logs allocation on creation (From, FromIterator, Default, FromWasmAbi)
- Logs deallocation in Drop impl
- Size estimation: `capacity * size_of::<T>()`

#### WasmVecVecFp / WasmVecVecFq (Nested vectors)
- **File**: `src/wasm_vector.rs`
- Added tracking for nested vector allocations
- Properly estimates both outer and inner vector sizes
- Drop implementation logs deallocation

#### WasmFpSrs / WasmFqSrs (Largest allocations, 50-200MB)
- **File**: `src/srs.rs`
- Added ID tracking to SRS structures
- Estimates size based on number of group elements
- Logs allocation when created or cloned
- Drop implementation tracks deallocation

#### WasmPastaFpPlonkIndex (Prover Index, 10-50MB)
- **File**: `src/pasta_fp_plonk_index.rs`
- Added ID tracking to prover index
- Conservative 50MB size estimate
- Tracks creation in `caml_pasta_fp_plonk_index_create` and `decode`
- Drop implementation logs deallocation

#### WasmPastaFpLookupTable
- **File**: `src/pasta_fp_plonk_index.rs`
- Added tracking for lookup table allocations
- Size based on nested vector data

## Log Format

All logs use the format:
```
@ALLOCATE <type> <size_bytes> <file>:<line> <unique_id>
@DROP <type> <size_bytes> <unique_id>
```

Example output:
```
@ALLOCATE WasmFpSrs 209715200 src/srs.rs:42 1
@ALLOCATE WasmPastaFpPlonkIndex 52428800 src/pasta_fp_plonk_index.rs:179 2
@DROP WasmPastaFpPlonkIndex 52428800 2
```

## Key Challenges Resolved

1. **Struct field changes**: Updated all references from tuple structs to named fields
2. **Size estimation**: Used conservative estimates for complex types
3. **Thread safety**: Used AtomicU64 for ID generation
4. **JavaScript integration**: Used existing console_log function

## Testing Required

The instrumented code needs to be:
1. Compiled with `npm run build:update-bindings` 
2. Tested with the memory benchmark from Step 0
3. Logs parsed to identify which allocations lack corresponding deallocations

## Next Steps

Step 3: Parse the allocation/deallocation logs to identify leaks by finding allocations without matching drops.