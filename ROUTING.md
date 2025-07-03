# Backend Routing Fix Plan

## Problem Analysis

After ultrathinking analysis of the constraint generation differences between Snarky and Sparky, the core issue is **inconsistent backend routing** that causes different constraint representations to reach each backend.

### Symptoms Observed
- Snarky: `x.assertEquals(y)` → 0 constraints (union-find optimization)
- Sparky: `x.assertEquals(y)` → 1 constraint (complex linear combination)
- Debug shows Sparky receives: `Add(Var(0), Scale(-1, Var(1))) = Constant(0)`
- Constraint batching works but is overwhelmed by over-generation

### Root Cause
The routing problem has **3 critical layers**:

1. **Input Transformation Layer**: Different preprocessing before reaching backends
2. **State Isolation Layer**: Backend switching doesn't properly reset state
3. **Constraint Representation Layer**: Backends receive different logical representations

## Critical Routing Fixes (Priority 1)

### 1. Input Transformation Audit
**Problem**: Sparky receives complex expressions where Snarky receives simple calls.

**Fix Strategy**:
```javascript
// Current (broken):
// o1js → [complex preprocessing] → Sparky WASM
// o1js → [different preprocessing] → Snarky OCaml

// Target (fixed):
// o1js → [identical preprocessing] → Backend Router → Snarky/Sparky
```

**Implementation**:
- Audit `src/bindings/sparky-adapter.js` for transformation differences
- Ensure `assert_equal` calls reach both backends identically
- Add transformation logging to verify input consistency

### 2. State Isolation Fix
**Problem**: Backend switching may leak state between Snarky and Sparky.

**Fix Strategy**:
```javascript
function switchBackend(target) {
  // 1. Save current backend state
  // 2. Reset all constraint system state
  // 3. Initialize target backend cleanly
  // 4. Verify isolation
}
```

**Implementation**:
- Add explicit state reset in `switchBackend()`
- Clear constraint systems completely
- Reset variable counters and union-find structures
- Add state isolation verification

### 3. Constraint System Routing
**Problem**: Constraints may route to wrong systems or get double-counted.

**Fix Strategy**:
- Single source of truth for active backend
- Explicit routing verification
- Constraint system isolation

## Architectural Improvements (Priority 2)

### 1. Unified Constraint Interface
**Goal**: Both backends receive identical constraint representations.

**Design**:
```typescript
interface ConstraintCall {
  type: 'assert_equal' | 'assert_r1cs' | 'assert_boolean';
  args: Cvar[];
  metadata: { source: string; line: number };
}
```

**Benefits**:
- Eliminates transformation differences
- Enables precise routing verification
- Allows constraint-level debugging

### 2. Backend Router Layer
**Goal**: Central routing logic with verification.

**Design**:
```javascript
class BackendRouter {
  private activeBackend: 'snarky' | 'sparky';
  private backends: Map<string, Backend>;
  
  route(call: ConstraintCall): void {
    this.verifyBackendState();
    this.backends.get(this.activeBackend).handle(call);
    this.verifyConstraintCount();
  }
}
```

**Benefits**:
- Single point of routing control
- Built-in verification
- Easy debugging and logging

### 3. Constraint Verification Framework
**Goal**: Continuous verification that backends produce identical results.

**Design**:
```javascript
class ConstraintVerifier {
  compareBackends(circuitFn: () => void): ComparisonResult {
    const snarkyResult = this.runWithBackend('snarky', circuitFn);
    const sparkyResult = this.runWithBackend('sparky', circuitFn);
    
    return {
      snarkyConstraints: snarkyResult.constraints.length,
      sparkyConstraints: sparkyResult.constraints.length,
      match: snarkyResult.equals(sparkyResult),
      differences: this.findDifferences(snarkyResult, sparkyResult)
    };
  }
}
```

## Immediate Implementation Plan

### Phase 1: Diagnosis (Day 1)
1. **Add comprehensive logging** to `sparky-adapter.js`
2. **Instrument assert_equal calls** to see exact inputs to each backend
3. **Add constraint system state dumps** before/after backend switches
4. **Create routing verification test** that fails on current system

### Phase 2: Quick Fixes (Day 2)
1. **Fix state isolation** in `switchBackend()`
2. **Ensure identical input transformation** for both backends
3. **Add backend verification** after each switch
4. **Fix constraint counting consistency**

### Phase 3: Verification (Day 3)
1. **Run comprehensive backend comparison tests**
2. **Verify simple equality generates 0 constraints in both backends**
3. **Confirm constraint batching works identically**
4. **Validate VK parity improvements**

## Specific Code Changes Required

### 1. sparky-adapter.js Changes
```javascript
// Add input logging
function routeConstraintCall(type, args) {
  console.log(`Routing ${type} to ${getCurrentBackend()}:`, args);
  
  // Ensure identical transformation
  const normalizedArgs = normalizeConstraintArgs(args);
  
  if (getCurrentBackend() === 'sparky') {
    return routeToSparky(type, normalizedArgs);
  } else {
    return routeToSnarky(type, normalizedArgs);
  }
}
```

### 2. Backend Switch Verification
```javascript
async function switchBackend(target) {
  console.log(`Switching from ${getCurrentBackend()} to ${target}`);
  
  // Reset state completely
  await resetConstraintSystem();
  await initializeBackend(target);
  
  // Verify switch succeeded
  const testResult = await verifyBackendSwitch(target);
  if (!testResult.success) {
    throw new Error(`Backend switch failed: ${testResult.error}`);
  }
}
```

### 3. Constraint System State Reset
```javascript
function resetConstraintSystem() {
  // Clear all backend state
  if (window.sparkyState) {
    window.sparkyState.reset();
  }
  if (window.snarkyState) {
    window.snarkyState.reset();
  }
  
  // Reset global counters
  globalVariableCounter = 0;
  globalConstraintCounter = 0;
}
```

## Success Metrics

### Immediate Success (Week 1)
- [ ] Simple equality `x.assertEquals(y)` generates **0 constraints** in both backends
- [ ] Constraint batching produces **identical gate counts** in both backends
- [ ] Backend switching **never produces state leakage**
- [ ] All existing tests pass with **both backends**

### Medium-term Success (Week 2)
- [ ] VK parity rate improves to **90%+** from current 50%
- [ ] Constraint count differences **eliminated** for simple operations
- [ ] Routing verification tests **pass continuously**
- [ ] Performance remains within **1.5x** of Snarky

### Long-term Success (Month 1)
- [ ] Full VK parity achieved (**100%** for supported operations)
- [ ] Zero constraint generation bugs
- [ ] Robust backend switching with verification
- [ ] Complete routing consistency

## Risk Mitigation

### High Risk: Breaking Existing Functionality
**Mitigation**: Comprehensive test suite running continuously during changes

### Medium Risk: Performance Regression
**Mitigation**: Benchmark all changes, rollback if performance degrades >10%

### Low Risk: Complexity Increase
**Mitigation**: Keep routing layer simple, add complexity only where necessary

## Conclusion

The routing problem is fixable with systematic changes to ensure both backends receive identical inputs and maintain proper state isolation. The key insight is that **consistency at the input level** is more important than optimization at the backend level.

Priority order:
1. **Fix input consistency** (will solve 80% of constraint differences)
2. **Fix state isolation** (will solve backend switching issues)  
3. **Add verification framework** (will prevent regressions)
4. **Optimize constraint generation** (will achieve final VK parity)

This plan addresses the root cause systematically while maintaining backward compatibility and performance.