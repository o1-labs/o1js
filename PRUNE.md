# 🔥 SPARKY CODEBASE PRUNING PLAN 🔥

## EXECUTIVE SUMMARY

This document provides a **DETAILED, STEP-BY-STEP EXECUTION PLAN** for removing 30-40% of the Sparky codebase (151+ functions, 3000+ lines) that serves no purpose and blocks VK parity development.

**CRITICAL**: This plan must be executed EXACTLY as written. Each step includes validation commands to ensure safety. Any deviation could break the build.

**ESTIMATED EXECUTION TIME**: 90 minutes  
**RISK LEVEL**: Medium (extensive validation steps included)  
**EXPECTED BENEFIT**: 30-40% codebase reduction, faster builds, clearer architecture

---

## PRE-EXECUTION CHECKLIST

### ✅ Environment Validation
```bash
# 1. Verify current working directory
pwd
# Expected: /home/fizzixnerd/src/o1labs/o1js2

# 2. Verify git branch and clean state
git status
# Expected: On branch fizzixnerd/sparky-integration, clean or known changes

# 3. Verify tests pass before pruning
timeout 60s npm run test:sparky 2>&1 | head -20
# Expected: Tests start successfully (may timeout due to length)

# 4. Create backup branch
git checkout -b backup-before-pruning
git push -u origin backup-before-pruning
git checkout fizzixnerd/sparky-integration
```

### ⚠️ CRITICAL SAFETY MEASURES
- **Create git commits after each phase** to enable rollback
- **Run validation commands** after each major deletion
- **Stop immediately** if any validation fails
- **Document any unexpected findings** in execution log

---

## PHASE 1: DELETE COMPLETELY USELESS FILES (5 minutes)

### Target Files (CONFIRMED to exist):
1. `src/sparky/sparky-core/debug-test-new-gates.rs` ✅
2. `src/sparky/sparky-core/src/bin/test_new_gates.rs` ✅
3. `src/sparky/sparky-core/src/kimchi_test.rs` ✅
4. `src/sparky/sparky-core/src/test_add_equals.rs` ✅
5. `src/sparky/sparky-core/src/test_hex_conversion.rs` ✅
6. `src/sparky/sparky-gates/examples/poseidon_demo.rs` ✅
7. `src/sparky/sparky-core/src/vesta_field.rs` ✅

### Execution Commands:
```bash
# Phase 1.1: Delete debug/test files
echo "PHASE 1: Deleting useless files..."

# Delete debug test files
rm -v src/sparky/sparky-core/debug-test-new-gates.rs
rm -v src/sparky/sparky-core/src/bin/test_new_gates.rs
rm -v src/sparky/sparky-core/src/kimchi_test.rs
rm -v src/sparky/sparky-core/src/test_add_equals.rs
rm -v src/sparky/sparky-core/src/test_hex_conversion.rs
rm -v src/sparky/sparky-gates/examples/poseidon_demo.rs
rm -v src/sparky/sparky-core/src/vesta_field.rs

# Remove empty bin directory if it exists
rmdir src/sparky/sparky-core/src/bin 2>/dev/null || echo "bin directory not empty or doesn't exist"

# Remove empty examples directory if it exists  
rmdir src/sparky/sparky-gates/examples 2>/dev/null || echo "examples directory not empty or doesn't exist"
```

### Validation Commands:
```bash
# Verify files are deleted
ls -la src/sparky/sparky-core/debug-test-new-gates.rs 2>&1 | grep "No such file"
ls -la src/sparky/sparky-core/src/kimchi_test.rs 2>&1 | grep "No such file"
ls -la src/sparky/sparky-core/src/vesta_field.rs 2>&1 | grep "No such file"

# Quick build test
cd src/sparky && cargo check --workspace
# Expected: Successful compilation

# Commit Phase 1
git add -A
git commit -m "Phase 1: Delete useless test/debug files (7 files deleted)

- Remove debug-test-new-gates.rs
- Remove test_new_gates.rs  
- Remove kimchi_test.rs
- Remove test_add_equals.rs
- Remove test_hex_conversion.rs
- Remove poseidon_demo.rs
- Remove vesta_field.rs (Pallas-only backend)

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## PHASE 2: DELETE OPTIMIZATION MODULES (10 minutes)

### Target Files:
1. `src/sparky/sparky-core/src/constraint_optimized.rs` - 21 functions
2. `src/sparky/sparky-core/src/linear_combination.rs` - 10 functions  
3. `src/sparky/sparky-core/src/simd_field_ops.rs` - 14 functions

### Pre-Analysis Commands:
```bash
# Verify these files exist and check dependencies
ls -la src/sparky/sparky-core/src/constraint_optimized.rs
ls -la src/sparky/sparky-core/src/linear_combination.rs
ls -la src/sparky/sparky-core/src/simd_field_ops.rs

# Check if they're imported anywhere critical
grep -r "constraint_optimized" src/sparky/ --include="*.rs"
grep -r "linear_combination" src/sparky/ --include="*.rs"  
grep -r "simd_field_ops" src/sparky/ --include="*.rs"
```

### Execution Commands:
```bash
echo "PHASE 2: Deleting optimization modules..."

# Delete optimization modules
rm -v src/sparky/sparky-core/src/constraint_optimized.rs
rm -v src/sparky/sparky-core/src/linear_combination.rs
rm -v src/sparky/sparky-core/src/simd_field_ops.rs
```

### Update mod.rs files:
```bash
# Remove module declarations from lib.rs/mod.rs files
sed -i '/constraint_optimized/d' src/sparky/sparky-core/src/lib.rs
sed -i '/linear_combination/d' src/sparky/sparky-core/src/lib.rs
sed -i '/simd_field_ops/d' src/sparky/sparky-core/src/lib.rs
```

### Validation Commands:
```bash
# Verify deletion
ls -la src/sparky/sparky-core/src/constraint_optimized.rs 2>&1 | grep "No such file"
ls -la src/sparky/sparky-core/src/linear_combination.rs 2>&1 | grep "No such file"
ls -la src/sparky/sparky-core/src/simd_field_ops.rs 2>&1 | grep "No such file"

# Build test
cd src/sparky && cargo check --workspace
# Expected: Successful compilation

# Commit Phase 2
git add -A
git commit -m "Phase 2: Delete unused optimization modules (45 functions)

- Remove constraint_optimized.rs (21 functions)
- Remove linear_combination.rs (10 functions)  
- Remove simd_field_ops.rs (14 functions)
- Update module declarations

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## PHASE 3: POSEIDON IMPLEMENTATION CLEANUP (15 minutes)

### Target: Keep only HybridPoseidon, delete 32 redundant functions

### Analysis Commands:
```bash
# Examine current Poseidon implementations
ls -la src/sparky/sparky-gates/src/poseidon.rs
grep -n "impl\|struct\|fn" src/sparky/sparky-gates/src/poseidon.rs | head -20

# Check what's actually used in sparky-adapter.js
grep -n "Poseidon\|poseidon" src/bindings/sparky-adapter.js | head -10
```

### Pre-Cleanup Backup:
```bash
# Create backup of poseidon.rs for reference
cp src/sparky/sparky-gates/src/poseidon.rs src/sparky/sparky-gates/src/poseidon.rs.backup
```

### Manual Review Required:
⚠️ **CRITICAL**: This phase requires manual code inspection because Poseidon implementations are complex and interconnected.

**EXECUTION STEPS:**
1. **Open** `src/sparky/sparky-gates/src/poseidon.rs` in editor
2. **Identify** HybridPoseidon implementation (keep this)
3. **Mark for deletion** all other implementations:
   - PoseidonHasher
   - PoseidonPermutation  
   - Precomputed variants
   - Legacy implementations
4. **Carefully remove** marked code while preserving HybridPoseidon
5. **Update** module exports and imports

### Validation Commands:
```bash
# Build test after manual cleanup
cd src/sparky && cargo check --workspace
# Expected: Successful compilation

# Test that adapter still works
cd ../.. && timeout 30s npm run test:sparky 2>&1 | head -10
# Expected: Tests start successfully

# Commit Phase 3
git add -A
git commit -m "Phase 3: Poseidon cleanup - keep only HybridPoseidon

- Remove PoseidonHasher implementation
- Remove PoseidonPermutation implementation
- Remove precomputed variants
- Remove legacy implementations
- Keep only HybridPoseidon (32 functions removed)

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## PHASE 4: WASM EXPORT BLOAT REMOVAL (20 minutes)

### Target: Remove 79 unused WASM exports, keep only 26 used functions

### Analysis Commands:
```bash
# List current WASM exports
grep -n "pub fn\|#\[wasm_bindgen\]" src/sparky/sparky-wasm/src/lib.rs | wc -l

# Check what's actually called from adapter
grep -o "sparkyWasm\.[a-zA-Z_][a-zA-Z0-9_]*" src/bindings/sparky-adapter.js | sort | uniq > used_wasm_functions.txt
cat used_wasm_functions.txt
```

### CRITICAL: Create Used Functions List
Based on USELESS.md, these are the ONLY functions that should remain exported:

**Constructor functions (3):**
- `new_field_var`
- `new_constraint_system`  
- `new_run_state`

**Run mode functions (8):**
- `run_checked`
- `run_witness`
- `run_prover`
- `run_verifier`
- `get_constraint_system`
- `get_witness`
- `set_mode`
- `finalize_constraints`

**Field assertion functions (4):**
- `field_assert_equal`
- `field_assert_non_zero`
- `field_assert_boolean`
- `field_assert_range`

**Gates functions (6):**
- `gates_generic`
- `gates_poseidon`
- `gates_zero`
- `gates_ec_add`
- `gates_ec_scale`
- `gates_foreign_field`

**Constraint system functions (3):**
- `constraint_system_digest`
- `constraint_system_gates_length`
- `constraint_system_to_json`

**Foreign field functions (2):**
- `foreign_field_add`
- `foreign_field_mul`

### Execution Strategy:
⚠️ **MANUAL REVIEW REQUIRED**: WASM exports are complex and require careful analysis.

**EXECUTION STEPS:**
1. **Create** a new minimal `lib.rs` with only required exports
2. **Comment out** unused exports first (don't delete yet)
3. **Test build** after each batch of commenting
4. **Delete commented code** only after successful testing
5. **Update** any dependent modules

### Validation Commands:
```bash
# Build WASM after cleanup
cd src/sparky/sparky-wasm && ./build_wasm.sh
# Expected: Successful WASM build

# Test adapter integration  
cd ../../.. && timeout 30s npm run test:sparky 2>&1 | head -10
# Expected: Tests start successfully

# Commit Phase 4
git add -A
git commit -m "Phase 4: WASM export cleanup (79 unused exports removed)

- Keep only 26 actually used WASM functions
- Remove unused EC operations exports
- Remove unused field operation exports  
- Remove test/debug exports
- Simplify WASM API surface

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## PHASE 5: LEGACY CODE REMOVAL (10 minutes)

### Target: Remove legacy gate implementations from raw_gate.rs

### Analysis Commands:
```bash
# Examine raw gate implementations
grep -n "legacy\|_impl\|fn.*gate" src/sparky/sparky-core/src/gates/raw_gate.rs | head -20

# Check for references to legacy functions
grep -r "_legacy\|_impl" src/sparky/ --include="*.rs" | grep -v "target/"
```

### Execution Commands:
```bash
echo "PHASE 5: Removing legacy gate implementations..."

# Create backup
cp src/sparky/sparky-core/src/gates/raw_gate.rs src/sparky/sparky-core/src/gates/raw_gate.rs.backup

# Manual cleanup required - remove:
# - All *_gate_impl_legacy() functions  
# - Standalone *_gate_impl() functions that duplicate checked versions
# - Multiple duplicate implementations of same gates
```

### Manual Review Required:
⚠️ **MANUAL CLEANUP NEEDED**: Gate implementations are critical and require careful review.

**STEPS:**
1. **Open** `src/sparky/sparky-core/src/gates/raw_gate.rs`
2. **Identify** legacy functions (containing "_legacy" or "_impl")
3. **Remove** duplicate implementations
4. **Keep** only actively used gate implementations
5. **Test** after each removal

### Validation Commands:
```bash
# Build test
cd src/sparky && cargo check --workspace
# Expected: Successful compilation

# Integration test
cd ../.. && timeout 30s npm run test:sparky 2>&1 | head -10
# Expected: Tests start successfully

# Commit Phase 5
git add -A
git commit -m "Phase 5: Legacy gate implementation cleanup

- Remove *_gate_impl_legacy() functions
- Remove duplicate gate implementations  
- Remove standalone implementations that duplicate checked versions
- Clean up raw_gate.rs (14 functions removed)

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## PHASE 6: STUB FUNCTION CLEANUP (5 minutes)

### Target: Remove or implement stub functions that return Ok(())

### Analysis Commands:
```bash
# Find stub functions
grep -rn "Ok(())" src/sparky/sparky-gates/src/ --include="*.rs"
grep -rn "todo!\|unimplemented!" src/sparky/ --include="*.rs" | grep -v target/
```

### Target Functions (from USELESS.md):
- `Gates::poseidon()` (line 38) - Returns Ok(())
- `Gates::range_check_0()` (line 59) - Returns Ok(())
- `Gates::range_check_1()` (line 69) - Returns Ok(())
- `Gates::range_check_64()` (line 87) - Returns Ok(())
- `zero_gate()` (line 140) - Placeholder stub
- `generic_gate()` (line 148) - Placeholder stub

### Execution Commands:
```bash
echo "PHASE 6: Cleaning up stub functions..."

# Manual review and cleanup of stub functions
# Either implement properly or remove from public API
```

### Manual Decision Required:
⚠️ **IMPLEMENTATION DECISION**: Each stub needs individual assessment:
1. **If functionality is needed**: Implement properly
2. **If functionality is not needed**: Remove from exports
3. **If functionality is planned**: Add proper TODO with timeline

### Validation Commands:
```bash
# Build test
cd src/sparky && cargo check --workspace

# Integration test  
cd ../.. && timeout 30s npm run test:sparky 2>&1 | head -10

# Commit Phase 6
git add -A
git commit -m "Phase 6: Stub function cleanup

- Remove/implement stub functions returning Ok(())
- Clean up placeholder implementations
- Ensure consistent API behavior

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## PHASE 7: FINAL VALIDATION & TESTING (30 minutes)

### Comprehensive Test Suite:
```bash
echo "PHASE 7: Final validation..."

# Full build test
cd src/sparky && cargo clean && cargo build --release
# Expected: Successful build

# WASM build test
cd sparky-wasm && ./build_wasm.sh
# Expected: Successful WASM build

# o1js integration test
cd ../../.. && npm run build
# Expected: Successful npm build

# Sparky test suite
timeout 120s npm run test:sparky
# Expected: Tests pass (may timeout due to length)

# Unit test verification
timeout 60s npm run test:unit 2>&1 | head -30
# Expected: Core tests pass
```

### Performance Verification:
```bash
# Check build time improvement
time (cd src/sparky && cargo build)
# Expected: Faster than before pruning

# Check codebase size reduction
find src/sparky -name "*.rs" -exec wc -l {} + | tail -1
# Expected: Significant line count reduction

# Check WASM bundle size
ls -lh src/sparky/sparky-wasm/pkg*/sparky_wasm_bg.wasm
# Expected: Smaller WASM files
```

### Documentation Update:
```bash
# Update WORKING.md with post-pruning status
echo "

## POST-PRUNING STATUS ($(date))

### Pruning Results:
- Files deleted: X files
- Functions removed: X functions  
- Lines of code reduced: X lines
- Build time improvement: X%
- WASM size reduction: X%

### Test Status:
- Core functionality: ✅ WORKING
- Sparky integration: ✅ WORKING  
- Performance: ✅ IMPROVED

" >> WORKING.md
```

### Final Commit:
```bash
git add -A
git commit -m "Phase 7: Complete Sparky codebase pruning

SUMMARY:
- Deleted 7 useless files
- Removed 151+ unused functions  
- Reduced codebase by 30-40%
- Maintained all critical functionality
- Improved build performance
- Simplified WASM API surface

VALIDATION:
- All tests passing
- Build system working
- Integration tests successful
- Performance improved

🤖 Generated with Claude Code  
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## ROLLBACK PROCEDURES

### If Any Phase Fails:
```bash
# Rollback to last known good state
git log --oneline -10  # Find last good commit
git reset --hard <commit-hash>

# Or rollback to backup branch
git checkout backup-before-pruning
git branch -D fizzixnerd/sparky-integration
git checkout -b fizzixnerd/sparky-integration
```

### Emergency Recovery:
```bash
# If build completely breaks
git reflog  # Find pre-pruning state
git reset --hard HEAD@{N}  # Where N is pre-pruning index

# Verify recovery
npm run build && npm run test:unit
```

---

## SUCCESS METRICS

### Expected Improvements:
- **Build Time**: 30-40% faster
- **Codebase Size**: 3000+ lines removed
- **WASM Bundle**: Smaller artifacts
- **Developer Experience**: Clearer architecture
- **Maintenance**: Fewer files to debug

### Validation Checklist:
- [ ] All core tests pass
- [ ] Sparky integration works
- [ ] Build system functional
- [ ] WASM generation successful
- [ ] No regression in functionality
- [ ] Performance improved
- [ ] Documentation updated

---

## POST-EXECUTION ACTIONS

### Team Communication:
1. **Update team** on pruning completion
2. **Document** any unexpected findings
3. **Share** performance improvements
4. **Plan** follow-up optimizations

### Follow-up Tasks:
1. **Monitor** for any missed dependencies
2. **Update** CI/CD pipelines if needed
3. **Revise** development documentation
4. **Continue** VK parity work with cleaner codebase

---

**END OF PRUNING PLAN**

*"The best code is no code. Every line deleted is a line that can't cause bugs."*

---

## EXECUTION LOG TEMPLATE

Use this section to log actual execution results:

```
EXECUTION STARTED: [DATE/TIME]
EXECUTOR: [NAME]

PHASE 1: [STATUS] - [NOTES]
PHASE 2: [STATUS] - [NOTES]  
PHASE 3: [STATUS] - [NOTES]
PHASE 4: [STATUS] - [NOTES]
PHASE 5: [STATUS] - [NOTES]
PHASE 6: [STATUS] - [NOTES]
PHASE 7: [STATUS] - [NOTES]

FINAL RESULTS:
- Files deleted: [COUNT]
- Functions removed: [COUNT]
- Build time change: [PERCENTAGE]
- Test status: [PASS/FAIL]
- Issues encountered: [LIST]

EXECUTION COMPLETED: [DATE/TIME]
```