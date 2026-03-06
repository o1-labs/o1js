# Memory64 (wasm64) Support for o1js

This document describes all changes, workarounds, and upstream bugs encountered while
adding WebAssembly Memory64 support to o1js. Memory64 extends WebAssembly to use 64-bit
memory addresses, breaking the 4 GiB linear memory limit of wasm32.

**Branch:** `florian/memory-64`
**Status:** Node.js build compiles and loads; proving pipeline progresses past compile
but worker threading requires a Rust std library patch (see below).

---

## Table of Contents

1. [Build Pipeline Changes](#1-build-pipeline-changes)
2. [Upstream Bugs & Patches](#2-upstream-bugs--patches)
3. [JS Glue Post-Processing (fix-wasm-bindings-node.js)](#3-js-glue-post-processing)
4. [o1js Code Changes](#4-o1js-code-changes)
5. [Platform Support](#5-platform-support)
6. [Upstream Contribution Opportunities](#6-upstream-contribution-opportunities)

---

## 1. Build Pipeline Changes

### 1.1 wasm-pack (audreyt's fork)

**Repo:** `https://github.com/audreyt/wasm-pack` (PR [#1553](https://github.com/drager/wasm-pack/pull/1553))

wasm-pack hardcodes `wasm32-unknown-unknown` as the compilation target. The fork threads
the target triple through so we can pass `wasm64-unknown-unknown`.

- Installed via `cargo install --git` with Rust 1.89.0+ (edition 2024 deps).
- `--mode force` is required to skip `step_check_for_wasm_target` (wasm64 is tier 3,
  not installable via `rustup target add`).
- The target is passed via `--target wasm64-unknown-unknown` after `--` in wasm-pack's
  extra_options, where wasm-pack extracts it as `target_triple`.

### 1.2 wasm-bindgen (audreyt's fork)

**Repo:** `https://github.com/audreyt/wasm-bindgen` (PR [#5004](https://github.com/wasm-bindgen/wasm-bindgen/pull/5004))
**Version:** v0.2.113

Adds `wasm64-unknown-unknown` support with auto-detected 64-bit pointer/length handling
in generated JS glue code. Pinned via `[patch.crates-io]` in the workspace `Cargo.toml`
for all wasm-bindgen sub-crates (`wasm-bindgen`, `js-sys`, `wasm-bindgen-macro`,
`wasm-bindgen-macro-support`, `wasm-bindgen-backend`, `wasm-bindgen-shared`,
`wasm-bindgen-test`).

**Requires two additional patches** applied at build time by xtask (see §2.1, §2.2).

### 1.3 Rust Toolchain

- **Nightly:** `2024-09-05` (from Makefile)
- **Target:** `wasm64-unknown-unknown` (tier 3, requires `-Z build-std=panic_abort,std`)
- **RUSTFLAGS:** `-C target-feature=+atomics,+bulk-memory,+mutable-globals`
  (same as wasm32, but without `--max-memory` cap)
- **Std library patches required** (see §2.5)

### 1.4 xtask Rewrite

`src/mina/src/lib/crypto/proof-systems/xtask/src/main.rs` was significantly rewritten:

- Clones audreyt's wasm-bindgen (shallow, main branch)
- Patches `threads/mod.rs` for memory64 support (see §2.1)
- Clones walrus, patches import serialization (see §2.2)
- Adds `[patch.crates-io]` for walrus in wasm-bindgen's Cargo.toml
- Builds wasm-bindgen-cli from patched source with `cargo install --path crates/cli`
- Installs to wasm-pack's cache directory

---

## 2. Upstream Bugs & Patches

### 2.1 wasm-bindgen: Threads Transform Hardcoded for i32

**Affects:** `wasm-bindgen-cli` (crates/cli-support/src/wit/threads.rs)
**Patch:** `src/mina/src/lib/crypto/proof-systems/patches/wasm-bindgen-threads-mod.rs`

The threads transform (which instruments the wasm binary for shared-memory threading)
is entirely hardcoded for 32-bit addresses. In memory64, `__heap_base` is an `i64` global,
TLS offsets are 64-bit, and stack pointers are 64-bit.

**Key changes in the patch:**

- Helper functions: `push_addr()`, `push_usize()`, `addr_ty()`, `addr_add()`,
  `addr_zero_value()`, `addr_value()` that emit i32 or i64 instructions based on a
  `memory64: bool` flag.
- `addr_to_bool()` — converts i64 to i32 for WebAssembly `if` and `select` instructions,
  which always require i32 conditions even in memory64.
- `allocate_static_data()` — handles both I32 and I64 `__heap_base` globals.
- `Tls` struct fields changed from `u32` to `u64`.
- `Stack` struct fields changed from `i32` to `i64`.
- `inject_start`, `inject_destroy`, `with_temp_stack` all use memory64-conditional types.

**Upstream:** Should be contributed to [wasm-bindgen/wasm-bindgen](https://github.com/wasm-bindgen/wasm-bindgen) (or audreyt's fork).

### 2.2 walrus 0.25.1: Imported Memory memory64 Flag Hardcoded to false

**Affects:** `walrus` (used by wasm-bindgen-cli for wasm transformation)
**File:** `crates/walrus-core/src/emit/imports.rs`, line ~323

When serializing imported memories, walrus hardcodes `memory64: false` and
`page_size_log2: 0` regardless of the actual memory definition. This strips the
memory64 flag from the output wasm binary.

**Fix:** String replacement in xtask:
```
memory64: false  →  memory64: mem.memory64
page_size_log2: 0  →  page_size_log2: mem.page_size_log2
```

**Upstream:** Should be filed as a bug on [rustwasm/walrus](https://github.com/rustwasm/walrus)
(the library used by wasm-bindgen for wasm binary transformations).

### 2.3 LLVM/lld: Corrupted table64 Element Segment Offsets

**Affects:** LLVM/lld when targeting wasm64 with table64
**Fix:** `src/build/fix-wasm64-table-offset.js` (post-processing script)

When compiling for `wasm64-unknown-unknown` with table64, LLVM/lld generates incorrect
element segment offsets. The `i64.const` value is corrupted — e.g., `4294967297`
(0x100000001) instead of `1`. The upper 32 bits appear to be garbage.

The script reads the wasm binary, finds element segments with `i64.const` offsets,
and rewrites the LEB128 value in-place to the correct offset (lower 32 bits).

**Upstream:** Should be reported to LLVM (llvm-project) as a bug in lld's wasm64/table64
element segment emission.

### 2.4 wasm-bindgen: Multiple JS Glue Bugs for memory64

These are all bugs in audreyt's wasm-bindgen fork where the generated JS code doesn't
fully account for BigInt (i64) values. Fixed via `src/build/fix-wasm-bindings-node.js`
post-processing (see §3 for details).

| Bug | Description | Upstream Target |
|-----|-------------|-----------------|
| `_free` second arg is `0n`/`1n` | Second parameter is `u32` (i32), not `usize`. Should be `0`/`1`, not `0n`/`1n`. | audreyt/wasm-bindgen |
| FinalizationRegistry conflict | wasm-bindgen 0.2.113 adds its own FinalizationRegistry; conflicts with o1js's existing `free_finalization_registry` in util.js, causing double-frees. | audreyt/wasm-bindgen (optional flag to disable) |
| Borrow tracking on `.free()` | `.free()` passes `0` (check borrows) but existing code calls `.free()` during GC when borrows may be active. Old 0.2.89 had no borrow check. | audreyt/wasm-bindgen (or o1js adaptation) |
| Null pointer check `=== 0` | Returns `0n` (BigInt) for null pointers, but checks `ret === 0` (strict equality). `0n === 0` is `false`. | audreyt/wasm-bindgen |
| `WebAssembly.Memory` missing `address: "i64"` | Generated Memory constructor omits the `address` option needed for memory64. | audreyt/wasm-bindgen |
| `__wbindgen_start` BigInt param | `thread_stack_size` is undefined when not set; can't convert to BigInt. | audreyt/wasm-bindgen |
| Return type mismatch | Functions returning `isize`/`usize` produce BigInt, but `@returns {number}` functions should return Number. Missing `Number()` conversion. | audreyt/wasm-bindgen |

### 2.5 Rust std Library: Missing wasm64 in Threading cfg Guards

**Affects:** Rust nightly std library (at least through 2024-09-05)
**Files:**
- `library/std/src/sys/sync/once/mod.rs`
- `library/std/src/sys/sync/thread_parking/mod.rs`

Both files select their implementation based on:
```rust
all(target_arch = "wasm32", target_feature = "atomics")
```

This only matches `wasm32`, not `wasm64`. For `wasm64-unknown-unknown` with atomics
enabled, the `no_threads` / `unsupported` fallback is selected, which panics when
called from worker threads.

**Fix:** Change to:
```rust
all(any(target_arch = "wasm32", target_arch = "wasm64"), target_feature = "atomics")
```

Note: The underlying futex implementation (`futex.rs`) already handles both wasm32 and
wasm64 correctly — only the module selection is wrong.

**Upstream:** Should be reported and fixed in the Rust repository (rust-lang/rust).
The fix is two one-line changes.

---

## 3. JS Glue Post-Processing

`src/build/fix-wasm-bindings-node.js` applies 8 fixes to the generated `plonk_wasm.cjs`:

| Fix | What it does |
|-----|-------------|
| **1** | Replaces old-style `imports['env'] = require('env')` with shared Memory64-aware `WebAssembly.Memory` setup for main/worker threads |
| **2** | Patches inline `new WebAssembly.Memory(...)` to add `address: "i64"` and BigInt for `initial`/`maximum` |
| **3** | Wraps `__wbindgen_start(thread_stack_size)` to convert undefined → `0n` |
| **4** | Converts `_free(BigInt(ptr), Nn)` → `_free(BigInt(ptr), N)` (second param is i32, not i64) |
| **5** | Disables wasm-bindgen's built-in FinalizationRegistries (replaced with no-ops) to avoid conflict with util.js's `free_finalization_registry` |
| **6** | Changes `.free()` calls from borrow-checked (`0`) to force-free (`1`) to match old 0.2.89 behavior |
| **7** | Changes `ret === 0 ? undefined` to `ret == 0 ? undefined` (loose equality handles both `0` and `0n`) |
| **8** | Adds `Number()` conversion to functions annotated `@returns {number}`, `@returns {GateType}`, or `@returns {bigint}` (struct field getters) that do bare `return ret;`. Only applies at indent ≤ 8 (exported functions and class methods), skipping import callbacks. |

`src/build/fix-wasm64-table-offset.js` fixes LLVM's corrupted element segment offsets
in the wasm binary (see §2.3).

---

## 4. o1js Code Changes

### 4.1 Rust Code

| File | Change |
|------|--------|
| `plonk-wasm/src/wasm_vector.rs` | `Abi = u32` → `Abi = usize` (wasm-bindgen uses usize for pointer-width portability) |
| Various kimchi/utils files | Widened `cfg(not(target_arch = "wasm32"))` to `cfg(not(any(target_arch = "wasm32", target_arch = "wasm64")))` |
| `Cargo.toml` (workspace) | Added `[patch.crates-io]` for all wasm-bindgen sub-crates pointing to audreyt's fork |
| `xtask/Cargo.toml` | Updated wasm-pack dependency |

### 4.2 TypeScript/JavaScript Code

| File | Change |
|------|--------|
| `src/bindings/crypto/bindings/conversion-core.ts` | `mapToUint32Array` now produces `BigUint64Array` with BigInt values; `mapFromUintArray` accepts `BigUint64Array` and converts elements to Number; return types updated |
| `src/bindings/crypto/bindings/conversion-core.ts` | `Constructor<T>` changed from `new (...args) => T` to `{ prototype: T }` (wasm-bindgen 0.2.113 generates private constructors) |
| `src/bindings/crypto/bindings/conversion-proof.ts` | Return types updated from `Uint32Array` to `BigUint64Array` |
| `src/bindings/js/node/node-backend.js` | Workers initialize wasm with `initSync({ module, memory })` before calling `wbg_rayon_start_worker`; `workerData` now includes `module` and `memory`; `builder.numThreads()` wrapped with `Number()` |
| `scripts/build/wasm/build-node.sh` | Added `fix-wasm64-table-offset.js` step before CJS conversion |

---

## 5. Platform Support

| Platform | Memory64 Support | Notes |
|----------|-----------------|-------|
| Chrome 133+ | Yes | Stable |
| Firefox 134+ | Yes | Stable |
| Safari | **No** | Not supported at all |
| Node.js v24+ (V8 13.6+) | Yes | Native support, no experimental flag needed |
| Node.js v22 | Experimental | Requires `--experimental-wasm-memory64` |

**Performance note:** Memory64 may introduce a ~10-100% slowdown due to bounds checks
that wasm32 can elide via virtual memory tricks (engine-dependent). Only use if >4 GiB
memory is actually needed.

---

## 6. Upstream Contribution Opportunities

These are the patches/workarounds that should ideally be upstreamed to eliminate the
need for build-time patching:

### High Priority (Blocking)

| # | Project | Issue | Fix |
|---|---------|-------|-----|
| 1 | **rust-lang/rust** | `std::sync::Once` and `thread_parking` don't support wasm64+atomics | Add `target_arch = "wasm64"` to cfg guards in `sys/sync/once/mod.rs` and `sys/sync/thread_parking/mod.rs` |
| 2 | **rustwasm/walrus** | Imported memory serialization hardcodes `memory64: false` | Use `memory64: mem.memory64` in `imports.rs` emit |
| 3 | **audreyt/wasm-bindgen** | Threads transform doesn't support memory64 | Port our `patches/wasm-bindgen-threads-mod.rs` changes |

### Medium Priority (JS Glue Quality)

| # | Project | Issue | Fix |
|---|---------|-------|-----|
| 4 | **audreyt/wasm-bindgen** | `_free` second arg emitted as BigInt literal (`0n`/`1n`) | Should be regular number (`0`/`1`) since it's u32 |
| 5 | **audreyt/wasm-bindgen** | Null pointer check uses `=== 0` | Should use `== 0` or `=== 0n` for memory64 |
| 6 | **audreyt/wasm-bindgen** | Functions returning `isize`/`usize` don't convert to Number | Add `Number()` for `@returns {number}` annotated functions |
| 7 | **audreyt/wasm-bindgen** | `WebAssembly.Memory` constructor missing `address: "i64"` | Generate memory64-aware Memory constructor |
| 8 | **audreyt/wasm-bindgen** | `__wbindgen_start` doesn't handle undefined `thread_stack_size` | Default to `0n` when undefined |

### Low Priority (LLVM)

| # | Project | Issue | Fix |
|---|---------|-------|-----|
| 9 | **llvm-project** | table64 element segment offsets corrupted in lld | Fix i64.const emission for element segment offsets |

### o1js-Specific (No Upstream)

These changes are specific to o1js and don't need upstreaming:

- `conversion-core.ts`: `Uint32Array` → `BigUint64Array` for pointer arrays
- `node-backend.js`: Worker thread wasm initialization with shared module/memory
- `wasm_vector.rs`: `Abi = u32` → `Abi = usize`
- cfg guard widening in proof-systems code
