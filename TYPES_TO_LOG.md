# TYPES_TO_LOG.md - WASM Allocatable Types for Memory Leak Investigation

**Created**: 2025-08-11 UTC  
**Last Modified**: 2025-08-11 UTC

## Critical Types (Most Likely Leaking)

### 1. WasmFpSrs / WasmFqSrs
- **Location**: `src/srs.rs:28`
- **Size**: 50-200MB
- **Contains**: `Arc<SRS<$G>>` with massive G1/G2 points arrays
- **Drop impl**: NO
- **Notes**: Uses manual pointer management, lagrange basis accumulation
- **Priority**: CRITICAL - matches our leak size

### 2. WasmPastaFpPlonkIndex / WasmPastaFqPlonkIndex  
- **Location**: `src/pasta_fp_plonk_index.rs:34` / `pasta_fq_plonk_index.rs`
- **Size**: 10-50MB
- **Contains**: `Box<ProverIndex<...>>` with constraint system
- **Drop impl**: NO
- **Priority**: CRITICAL - created per proof

### 3. WasmFpProverProof / WasmFqProverProof
- **Location**: `src/plonk_proof.rs:436`
- **Size**: Several MB
- **Contains**: Complex nested vectors of commitments and evaluations
- **Drop impl**: NO
- **Priority**: HIGH - accumulates per proof

## High Priority Types

### 4. WasmVecVecFp / WasmVecVecFq
- **Location**: `src/wasm_vector.rs:125`
- **Size**: Variable (can be very large)
- **Contains**: `Vec<Vec<T>>` nested vectors
- **Drop impl**: NO
- **Priority**: HIGH - nested heap allocations

### 5. WasmVector<T>
- **Location**: `src/wasm_vector.rs:10`
- **Size**: Variable
- **Contains**: `Vec<T>` 
- **Drop impl**: NO
- **Generic**: Yes - used by many other types
- **Priority**: HIGH - base type for many allocations

### 6. WasmFpGateVector / WasmFqGateVector
- **Location**: `src/gate_vector.rs:39`
- **Size**: Multi-MB (circuit gates)
- **Contains**: `Vec<CircuitGate<F>>`
- **Drop impl**: NO
- **Priority**: HIGH - circuit representation

## Medium Priority Types

### 7. WasmFpPlonkVerifierIndex / WasmFqPlonkVerifierIndex
- **Location**: `src/plonk_verifier_index.rs:571`
- **Size**: Several MB
- **Contains**: Multiple vectors, SRS reference
- **Drop impl**: NO

### 8. WasmFpPolyComm / WasmFqPolyComm
- **Location**: `src/poly_comm.rs:15`
- **Contains**: `WasmVector<$WasmG>` group elements
- **Drop impl**: NO

### 9. WasmFpOpeningProof / WasmFqOpeningProof
- **Location**: `src/plonk_proof.rs:320`
- **Contains**: Two `WasmVector<$WasmG>` 
- **Drop impl**: NO

### 10. WasmPastaFpLookupTable / WasmPastaFqLookupTable
- **Location**: `src/pasta_fp_plonk_index.rs:40`
- **Contains**: `WasmVecVecFp/Fq`
- **Drop impl**: NO

## Additional Types to Monitor

### 11. WasmFpGate / WasmFqGate
- **Location**: `src/gate_vector.rs:44`
- **Contains**: `Vec<$WasmF>` coefficients
- **Drop impl**: NO

### 12. WasmGPallas / WasmGVesta (Group elements)
- **Location**: `src/projective.rs`
- **Size**: Small individually but many allocated
- **Drop impl**: NO

### 13. WasmFpProverCommitments / WasmFqProverCommitments
- **Location**: `src/plonk_proof.rs`
- **Contains**: Multiple `WasmPolyComm` fields
- **Drop impl**: NO

## Key Observations

1. **NO types have Drop implementations** - This is the root cause
2. **Manual pointer management** in SRS without cleanup
3. **Nested vectors** without proper deallocation
4. **Arc usage** without proper reference counting cleanup in WASM boundary
5. **Box allocations** not being freed

## Logging Requirements

For each type, we need to log:
- Allocation: size in bytes, file:line, type name, unique ID
- Drop (if it happens): size, type name, ID
- For vectors: capacity * element_size (not just length)
- For nested structures: recursive size calculation