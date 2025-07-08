# WASM Fork Analysis
Created: 2025-01-08 02:28:00 UTC
Last Modified: 2025-01-08 02:28:00 UTC

## Can We Fork WASM?

Short answer: **No, not in the traditional Unix fork() sense.**

## Why Fork Doesn't Work for WASM

### 1. WASM Runs in a VM
- WASM isn't a process - it's bytecode running in a VM
- The VM is embedded in the JavaScript engine
- No OS-level process to fork

### 2. Memory Model
```
Node.js Process
├── V8 JavaScript Engine
│   ├── JavaScript Heap
│   └── WASM Linear Memory (SharedArrayBuffer)
└── Native Code (libuv, etc.)
```

Fork would need to duplicate:
- Entire Node.js process
- V8 state
- All JavaScript objects
- WASM linear memory

### 3. What Actually Happens

```javascript
// This doesn't "fork" WASM:
const child = fork('script.js');

// It creates a whole new Node.js process
// Must reload everything from scratch
```

## Closest Alternatives

### 1. Snapshot & Restore (Theoretical)
```javascript
// IF this existed (it doesn't):
const snapshot = wasm.createMemorySnapshot();
const newWasm = wasm.restoreFromSnapshot(snapshot);
```

Problems:
- No WASM memory snapshot API
- Would need to snapshot all state (not just memory)
- Rayon threads, OCaml runtime, etc.

### 2. Manual State Serialization
```javascript
// What we proposed in the proxy pattern:
const state = {
  srs: serializeSRS(wasm),
  circuits: serializeCircuits(wasm),
  // ... everything else
};

const newWasm = createFreshWasm();
restoreState(newWasm, state);
```

This is basically "manual forking" - expensive but possible.

### 3. Worker Threads with Shared Memory
```javascript
// Current architecture:
const memory = new SharedArrayBuffer(1024 * 1024 * 1024);
new Worker('worker.js', { workerData: { memory } });
```

All workers share the same WASM memory - can't fork it.

### 4. Separate Processes
```javascript
// True process isolation:
const child = spawn('node', ['prove.js', '--input', data]);
```

Each process loads its own WASM - clean but high overhead.

## What About WebAssembly System Interface (WASI)?

WASI aims to give WASM more OS-like capabilities, but:
- Still no fork() support
- Not implemented in browsers
- Limited Node.js support
- Wouldn't help with memory leaks

## Why Fork Would Be Ideal

If we could fork WASM like Unix processes:

```c
// Hypothetical WASM fork
wasm_pid = wasm_fork();
if (wasm_pid == 0) {
  // Child: Generate proof with current state
  let proof = generate_proof();
  send_to_parent(proof);
  wasm_exit(0); // Clean memory!
} else {
  // Parent: Continue with clean memory
  let proof = receive_from_child();
}
```

Benefits:
- Copy-on-write memory efficiency
- Child death = automatic cleanup
- Parent unaffected by child leaks

## Reality Check

The closest we can get is the proxy pattern:

| Approach | Memory Overhead | Setup Time | Complexity |
|----------|----------------|------------|------------|
| Unix fork() | ~0 (COW) | ~1ms | Simple |
| WASM Proxy | 2x during swap | 30-60s | Complex |
| Process spawn | 1x per process | 100-500ms | Medium |
| Worker isolation | Nx workers | 50-200ms | Medium |

## Conclusion

True WASM forking isn't possible because:
1. WASM runs inside a VM, not as an OS process
2. No snapshot/restore API for WASM memory
3. SharedArrayBuffer can't be forked
4. Would need to fork entire JavaScript runtime

The proxy pattern with state replay is the closest we can get to "forking" WASM while staying in-process. For true isolation, we'd need separate OS processes, but that has significant overhead.

## Alternative Idea: Memory Segments

One unexplored option - use multiple WASM memories:

```javascript
// WASM can have multiple memories (in theory)
const memory1 = new WebAssembly.Memory({ initial: 256 });
const memory2 = new WebAssembly.Memory({ initial: 256 });

// Switch between them?
```

But:
- Multi-memory is not well supported
- Would require major Rust/kimchi changes  
- Still can't "fork" existing memory

The proxy pattern remains our best option.