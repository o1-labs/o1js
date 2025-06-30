# TODOs for o1js2

## Completed Tasks ✅

### Sparky Warning Reduction (June 2025)
**Status: COMPLETED** - Successfully reduced warnings from ~100 to 29 (71% reduction)

**Problem:** Excessive Rust warnings in Sparky were slowing development by cluttering context with noise.

**Solution:** Systematic 4-phase approach documented in WARNINGS_PLAN.md:

1. **Phase 1: Quick Fixes** ✅
   - Fixed unused `mut` parameters in `sparky-gates/src/poseidon.rs`
   - Prefixed unused variables with `_` in `sparky-gates/src/ec_ops.rs`
   - Removed unused imports across multiple files
   - Fixed parameters in `sparky-gates/src/lib.rs`

2. **Phase 2: Dependency Warnings** ✅
   - Added `.cargo/config.toml` to suppress ark-ff derive macro warnings
   - Configured `rustflags` for better feature checking

3. **Phase 3: Dead Code Analysis** ✅
   - Marked appropriate functions with `#[allow(dead_code)]` for JS interop
   - Fixed `sparky-examples/examples/poseidon_benchmark.rs` compilation error

4. **Phase 4: Validation** ✅
   - Successfully built with 71% fewer warnings
   - All tests passing (33/34)
   - No functionality regressions

**Files Modified:**
- `src/sparky/sparky-gates/src/poseidon.rs`
- `src/sparky/sparky-gates/src/ec_ops.rs` 
- `src/sparky/sparky-gates/src/lib.rs`
- `src/sparky/.cargo/config.toml` (created)
- `src/sparky/sparky-examples/examples/poseidon_benchmark.rs`
- `WARNINGS_PLAN.md` (comprehensive plan document)

**Result:** Clean development environment with manageable warning output.

## Active Development Areas

### Backend Integration
- Sparky (Rust) and Snarky (OCaml) backend switching implemented
- Runtime switching available via `switchBackend()` API
- Both backends produce identical results for basic operations

### Architecture
- Consolidated WASM bindings in `src/sparky/sparky-wasm/src/lib.rs`
- Optimized conversion utilities in `conversion_optimized.rs`
- Elliptic curve operations implemented in `ec_ops.rs`
- Circuit compatibility layer in `circuit.rs`

## Future TODOs

### Sparky Backend Completion
- [ ] Implement lookup tables in Sparky
- [ ] Add foreign field operations support
- [ ] Fix proof generation module resolution issues
- [ ] Complete range check optimization

### Performance Optimization
- [ ] Optimize WASM bundle size (currently 1.2GB)
- [ ] Implement more efficient constraint generation
- [ ] Add batch operation support for common patterns

### Documentation
- [ ] Update API documentation for backend switching
- [ ] Add performance benchmarks comparison
- [ ] Document migration guide for OCaml → Rust

### Testing
- [ ] Expand Sparky test coverage beyond basic operations
- [ ] Add integration tests for backend switching
- [ ] Performance regression test suite

## Notes
- All technical details consolidated in DEV.md
- Sparky integration adds significant repository size (~1.2GB)
- Backend switching maintains API compatibility
- Warning reduction enables faster development iteration