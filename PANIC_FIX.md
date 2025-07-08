# Fix Plan: WASM Module Reloading for Memory Management
Created: 2025-01-08 01:23:00 UTC
Last Modified: 2025-01-08 01:23:00 UTC

## Critical Realization

The current implementation **does not actually prevent WASM memory panics** because:

1. We only recycle the Rayon thread pool (worker threads)
2. The WASM module instance with its linear memory remains the same
3. Memory leaks in WASM linear memory will still cause panics when approaching limits

## The Real Problem

```javascript
// This is a singleton that never changes:
const wasm = wasm_;  // src/bindings/js/node/node-backend.js

// Even after "recycling", all workers use the same WASM instance
// with the same exhausted linear memory!
```

WASM linear memory:
- Grows but never shrinks
- Has hard limits (1GB iOS, 4GB desktop)
- When exhausted, ANY allocation causes immediate panic
- Cannot be garbage collected or freed

## What Actually Needs to Happen

### Option A: Full WASM Module Reload (Complex but Complete)

1. **Detect memory approaching critical**
2. **Block new operations**
3. **Save critical state** (if any needs to persist)
4. **Terminate all workers**
5. **Unload current WASM module**
6. **Load fresh WASM module instance**
7. **Reinitialize all bindings**
8. **Restore critical state**
9. **Create new workers with new WASM**
10. **Resume operations**

### Option B: Worker-Level WASM Isolation (Fundamental Redesign)

1. Each worker loads its own WASM instance
2. Workers don't share memory
3. Can reload individual workers without affecting others
4. But loses shared memory benefits

### Option C: Pre-emptive Operation Limits (Workaround)

1. Track operations that consume memory
2. Force restart after N operations
3. Schedule maintenance windows
4. Not a real fix but prevents reaching limits

## Deep Dive: Current Architecture

### 1. WASM Loading Flow

```
node-backend.js:
  import wasm_ from 'plonk_wasm.cjs'
  const wasm = wasm_  // Singleton!
  
  initThreadPool():
    wasm.initThreadPool()  // Uses existing wasm
    
  Workers:
    All reference the same wasm instance
```

### 2. What's in WASM Memory

Need to investigate what state is stored:
- Compiled circuits
- SRS (Structured Reference String)
- Prover/verifier keys  
- Intermediate computation results
- Memory leak accumulation

### 3. State Preservation Requirements

Critical question: What MUST survive a WASM reload?
- Compiled circuits? (Expensive to recompile)
- Proving keys? (Can be regenerated)
- SRS? (Large, expensive to reload)

## Investigation Results

### What's Actually in WASM Memory

Based on code analysis, WASM memory contains:

1. **SRS (Structured Reference String)** - `src/bindings/crypto/bindings/srs.ts`
   - Large cryptographic setup (can be >100MB)
   - Cached globally in `srsStore[f][size]`
   - Can be serialized/deserialized from cache
   - Expensive to recreate

2. **Compiled Circuits** - Created by `Pickles.compile()`
   - Prover keys (large, cached to disk if possible)
   - Verification keys
   - Gates and constraint systems
   - Tagged with unique identifiers

3. **Rayon Thread Pool State**
   - `static mut THREAD_POOL: Option<rayon::ThreadPool>`
   - Worker thread contexts
   - Shared work queues

4. **OCaml/WASM Bridge State**
   - js_of_ocaml runtime
   - Bindings between OCaml (Pickles) and WASM (plonk)

### Memory Lifecycle

1. **Initialization**:
   ```javascript
   // web-backend.js
   await init(undefined, memory);  // Loads WASM with SharedArrayBuffer
   new Function(o1jsWebSrc)();     // Loads js_of_ocaml runtime
   ```

2. **Compilation** (`ZkProgram.compile()`):
   - Creates SRS if not cached
   - Runs `Pickles.compile()` → stores circuits in WASM
   - Caches prover keys to disk if possible
   - **Memory is allocated but never freed**

3. **Proving** (each proof):
   - Allocates witness data
   - Intermediate computations
   - **Some memory is leaked each time**

### Phase 2: Identify Shared State

1. **Find all global WASM state**
   - Static variables in Rust
   - Cached computations
   - Shared data structures

2. **Determine reload impact**
   - What breaks if we reload
   - What needs to be preserved
   - Performance implications

### Phase 3: Design State Preservation

1. **Serialization strategy**
   - What can be serialized to JS
   - What must stay in WASM
   - Format and size considerations

2. **Critical path analysis**
   - Minimum state for continuity
   - Acceptable recomputation cost
   - User-visible impact

## Implementation Strategy (Option A - Full Reload)

### Step 1: Create WASM Module Manager

```typescript
class WasmModuleManager {
  private currentModule: any;
  private moduleGeneration: number = 0;
  
  async reloadModule(): Promise<void> {
    // 1. Save critical state
    const state = await this.saveState();
    
    // 2. Cleanup old module
    await this.cleanup();
    
    // 3. Load fresh module
    this.currentModule = await this.loadFreshModule();
    
    // 4. Restore state
    await this.restoreState(state);
    
    this.moduleGeneration++;
  }
  
  private async saveState(): Promise<SerializedState> {
    // Extract what we need to preserve
  }
  
  private async loadFreshModule(): Promise<WasmModule> {
    // Force fresh load - may need cache busting
    delete require.cache[require.resolve('plonk_wasm.cjs')];
    return require('plonk_wasm.cjs');
  }
}
```

### Step 2: Modify Backend Integration

```typescript
// Instead of const wasm = wasm_
let wasm = wasmManager.getCurrentModule();

// Add module generation tracking
let currentGeneration = wasmManager.getGeneration();

// Check before operations
if (wasmManager.getGeneration() !== currentGeneration) {
  throw new Error('WASM module reloaded during operation');
}
```

### Step 3: Coordinate Reload

```typescript
class PoolHealthCoordinator {
  private async executePoolRecycling(reason: string): Promise<void> {
    // ... existing code ...
    
    if (reason === 'memory_critical') {
      // Don't just recycle pool - reload WASM!
      await this.reloadWasmModule();
    }
  }
  
  private async reloadWasmModule(): Promise<void> {
    // 1. Stop all operations
    await this.blockAllOperations();
    
    // 2. Wait for in-flight to complete
    await this.waitForInFlight();
    
    // 3. Terminate all workers
    await this.terminateAllWorkers();
    
    // 4. Reload WASM module
    await wasmManager.reloadModule();
    
    // 5. Reinitialize workers
    await this.initializeWorkers();
    
    // 6. Resume operations
    this.unblockOperations();
  }
}
```

## Challenges and Risks

### 1. State Loss
- Compiled circuits may be lost
- Proving keys need regeneration
- Performance hit from recompilation

### 2. Operation Interruption
- In-flight proofs may fail
- Need graceful handling
- User-visible delays

### 3. Memory Measurement
- WASM memory not easily measurable from JS
- Need accurate threshold detection
- Platform differences

### 4. Module Caching
- Node.js aggressively caches modules
- Need to ensure fresh instance
- May need dynamic loading

## Alternative Approaches

### 1. Process-Level Restart
- Restart entire Node.js process
- Clean but disruptive
- Loses all state

### 2. Web Worker Style
- Each proof in isolated worker
- Load/unload per operation
- High overhead but safe

### 3. WASM Memory Limits
- Set lower limits proactively
- Fail fast and clean
- Requires app-level retry

## Next Steps

1. **Investigate current WASM state** - What exactly is stored?
2. **Measure reload cost** - How expensive is circuit recompilation?
3. **Prototype module reloading** - Can we actually get a fresh instance?
4. **Design state preservation** - What's the minimum viable state?
5. **Test memory behavior** - Verify fresh module = fresh memory

## Success Criteria

1. WASM linear memory is actually reset on reload
2. Critical state (compiled circuits) can be preserved or quickly restored
3. No panics due to memory exhaustion
4. Acceptable performance impact (<30s delay)
5. Transparent to end users

## Critical Questions to Answer

1. **Can we serialize compiled circuits?** If not, reload is very expensive
2. **Is the SRS in WASM memory?** This is large and static
3. **What causes the memory leak?** Can we fix root cause instead?
4. **How do other WASM apps handle this?** Industry best practices?

## The Core Challenge

Reloading WASM to reset memory is extremely complex because:

### 1. Multi-Layer Architecture
```
JavaScript (o1js API)
    ↓
OCaml (js_of_ocaml - Pickles)
    ↓
WASM (Rust - plonk/kimchi)
    ↓
Rayon Thread Pool
```

### 2. Singleton Design
- `const wasm = wasm_` is used everywhere
- No abstraction layer for swapping instances
- Direct function calls like `wasm.caml_pasta_fp_plonk_prover_create()`

### 3. State Interdependencies
- SRS references are held in JavaScript (`srsStore`)
- Compiled circuits have IDs that reference WASM memory
- Prover functions closure over WASM state

### 4. Performance Impact
- Recompiling circuits: 10-60 seconds per program
- Recreating SRS: Several seconds
- Total recovery time: Could exceed 1 minute

## Recommendation

Given the investigation, **Option A (Full WASM Reload) is not practical** without major architectural changes. The system was not designed for hot-reloading.

Better alternatives:

### Option D: Fix the Root Cause
- Profile and fix the actual memory leaks
- This is the correct long-term solution

### Option E: Process Isolation  
- Run each proof in a separate process
- Clean process exit = clean memory
- Higher overhead but guaranteed safety

### Option F: Batch Processing with Planned Restarts
- Track number of proofs generated
- Plan restart after N proofs
- Notify application to save state
- Graceful restart with state preservation

This is a much harder problem than just recycling threads. We're essentially trying to retrofit hot-reloading into a system designed as a singleton.