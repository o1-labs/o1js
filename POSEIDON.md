# POSEIDON DELETION PLAN
## Complete Removal of All Poseidon Code from Sparky

**Objective**: Delete ALL Poseidon-related code in Sparky to start fresh with a clean raw_gate-only implementation.

---

## 🔥 PHASE 1: COMPLETE FILE DELETIONS

### Files to DELETE entirely:
```
src/sparky/sparky-gates/src/poseidon.rs                              # Main implementation (330+ lines)
src/sparky/sparky-gates/examples/poseidon_demo.rs                    # Demo file
src/sparky/sparky-examples/examples/poseidon_benchmark.rs            # Benchmark
src/sparky/verify_poseidon_o1js.js                                   # o1js compatibility
src/sparky/tests/src/o1js_compatibility_test.rs                      # Poseidon tests  
src/sparky/tests/tests/verify_our_hash.rs                            # Hash verification
```

---

## 🔥 PHASE 2: CODE SECTION REMOVALS

### `sparky-wasm/src/lib.rs`
**DELETE these sections:**
- Lines 296-304: Poseidon module getter
- Lines 300-301: `poseidon()` method  
- Lines 305-350: `poseidon_update()` method
- Lines 351-380: `poseidon_hash_to_group()` method
- Lines 400-415: All Gates Poseidon functions
- Lines 859-970: **ENTIRE** `SnarkyPoseidonCompat` struct and impl

### `sparky-wasm/src/bindings.rs`  
**DELETE these sections:**
- Lines 266-443: **ENTIRE** `Poseidon` struct and implementation
  - `poseidon_update()`
  - `hash_to_group()`
  - `poseidon_hash2()`
  - `poseidon_hash_array()`
  - ALL batch operations: `batch_poseidon_hash2()`, `batch_poseidon_hash_arrays()`, `batch_poseidon_hash2_typed()`

### `sparky-wasm/src/gates.rs`
**DELETE these sections:**
- Line 5: `use sparky_gates::poseidon::{HybridPoseidon};`
- Lines 49-65: `poseidon_hash2_impl()` function
- Lines 66-90: `poseidon_hash_array_impl()` function

### `sparky-wasm/src/js_types.rs`
**DELETE these sections:**
- Lines 225-267: **ENTIRE** `PoseidonState` struct and implementation
- Lines 586-589: `create_poseidon_state_js()` function

### `sparky-wasm/src/conversion.rs`
**DELETE these sections:**
- Lines 682-700: `poseidon_state_to_js()` and `js_to_poseidon_state()`

### `sparky-wasm/src/error_utils.rs`
**DELETE these sections:**
- Lines 43-46: `poseidon_error()` function
- Lines 73, 101-102: `map_poseidon_error()` trait methods  
- Lines 218-220: `poseidon_error!` macro

---

## 🔥 PHASE 3: CORE SPARKY MODIFICATIONS

### `sparky-gates/src/lib.rs`
**DELETE these sections:**
- Line 6: `pub mod poseidon;`
- Lines 37-42: `poseidon()` function (Gates API)

### `sparky-core/src/gates/raw_gate.rs`
**DELETE these sections:**
- Line 22: `Poseidon = 2` enum variant from `KimchiGateType`
- Line 47: Poseidon enum conversion 
- Line 73: Poseidon display formatting
- Line 138: Poseidon gate routing in match statement
- Lines 245-300: **ENTIRE** `poseidon_gate_impl()` function
- Lines 634, 705-715: `poseidon_gate_explicit()` function

### `sparky-core/src/constraint.rs`
**MODIFY these sections:**
- Line 20: Remove "Poseidon" from comment example

---

## 🔥 PHASE 4: TEST FILE CLEANUP

### `tests/src/integration_tests.rs`
**DELETE these sections:**
- Line 10: `poseidon::PoseidonHasher` import
- Lines 15-40: `test_poseidon_ec_integration()` function
- Lines 64, 88, 103, 138: All PoseidonHasher usage in tests
- Line 113: Poseidon constraint count assertion

### `tests/tests/verify_kimchi_hash.rs`
**DELETE these sections:**
- Line 3: `FULL_ROUNDS` import  
- Line 6: FULL_ROUNDS usage

---

## 🔥 PHASE 5: EXAMPLE FILE CLEANUP

### `sparky-examples/examples/integration_example.js`
**DELETE these sections:**
- Lines 24, 50-51, 64-66, 88, 116, 120-121: All Poseidon hash calls

### `sparky-examples/examples/ec_operations_demo.js`
**DELETE these sections:**
- Lines 54-56: Poseidon combination example

---

## 🔥 PHASE 6: GENERATED FILE REGENERATION

### WASM Generated Files (will auto-regenerate after rebuild):
```
src/sparky/sparky-wasm/pkg-web/sparky_wasm.js
src/sparky/sparky-wasm/pkg-web/sparky_wasm_bg.wasm
src/sparky/sparky-wasm/pkg-web/sparky_wasm.d.ts
src/sparky/sparky-wasm/pkg-node/sparky_wasm.js  
src/sparky/sparky-wasm/pkg-node/sparky_wasm_bg.wasm
src/sparky/sparky-wasm/pkg-node/sparky_wasm.d.ts
All other .d.ts files in pkg directories
```

### Manual cleanup needed:
```
src/sparky/sparky-wasm/test-integration.js    # Lines 83-99: Remove Poseidon tests
```

---

## 🔥 PHASE 7: CONFIGURATION CLEANUP

### `sparky-wasm/Cargo.toml`
**DELETE these sections:**
- `poseidon_only = []` feature flag (if present)

---

## 🔥 PHASE 8: DOCUMENTATION CLEANUP

### Major Documentation Files:
```
README.md                              # Remove Poseidon benchmarks & examples
CLAUDE.md                             # Remove Poseidon implementation details  
SPARKY_DEV.md                         # Remove entire Poseidon section
PLAN.md                               # Remove Poseidon entries
TODOs.md                              # Remove Poseidon TODOs
docs/SPARKY_CALLGRAPH_TEXT.md         # Remove Poseidon operations section
```

### Specific Documentation Sections to DELETE:
- **SPARKY_DEV.md**: Lines 56-78, 122, 147, 189-194, 201, 227, 238, 266-267, 335, 346, 352, 357, 368
- **PLAN.md**: Lines 56, 81, 167, 173  
- **TODOs.md**: Lines 32, 36, 81-84, 109-111, 125-126, 162
- **SPARKY_CALLGRAPH_TEXT.md**: Lines 18, 268-271, 448-479

---

## 🔥 PHASE 9: MEMORY PROFILER CLEANUP

### `memory-profiler/src/main.rs`
**DELETE these sections:**
- `profile_poseidon_operations()` method

### `memory-profiler/src/analysis.rs`
**DELETE these sections:**
- `PoseidonHashing` analysis category

---

## 📊 DELETION IMPACT SUMMARY

| Category | Files to Delete | Files to Modify | Lines to Remove |
|----------|----------------|-----------------|-----------------|
| Core Implementation | 6 complete files | 15+ files | 2,000+ lines |
| WASM Bindings | 0 files | 6 files | 800+ lines |
| Tests | 2 complete files | 3 files | 200+ lines |
| Examples | 0 files | 2 files | 50+ lines |
| Documentation | 0 files | 10+ files | 300+ lines |
| **TOTAL** | **8 files** | **35+ files** | **3,350+ lines** |

---

## ⚠️ CRITICAL WARNINGS

1. **This will BREAK the build** until new implementation is added
2. **All existing Poseidon tests will fail** 
3. **o1js integration will break** for Poseidon operations
4. **Generated WASM files** will need regeneration
5. **No rollback possible** without git revert

---

## 🎯 POST-DELETION PLAN

After deletion, implement clean Poseidon with:
1. **ONLY** `KimchiGateType::Poseidon` raw_gate calls
2. **NO** manual R1CS constraint generation  
3. **NO** complex Cvar expressions (Add/Scale)
4. Simple input → raw_gate → output flow
5. Minimal WASM binding surface

---

## 🚀 EXECUTION ORDER

1. **Git commit current state** (safety)
2. Delete complete files (Phase 1)
3. Remove code sections (Phases 2-5) 
4. Clean configuration (Phase 6-7)
5. Update documentation (Phase 8)
6. Clean memory profiler (Phase 9)
7. **Rebuild and verify** all Poseidon code is gone
8. **Implement clean raw_gate-only version**

---

**READY FOR EXECUTION**: All deletion targets identified and organized by impact.
**ESTIMATED TIME**: 30-45 minutes for complete removal.
**RISK LEVEL**: High (will break build until reimplemented).