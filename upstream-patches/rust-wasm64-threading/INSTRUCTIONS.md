# Fix: Add wasm64 support to std::sync::Once and thread_parking cfg guards

## Problem

Rust's standard library selects threading primitive implementations based on `cfg` guards
that only check for `target_arch = "wasm32"`, not `wasm64`. When compiling for
`wasm64-unknown-unknown` with atomics enabled (`-C target-feature=+atomics`), the
`no_threads` / `unsupported` fallback implementations are selected instead of the
futex-based ones. These fallbacks panic when called from worker threads, making
multithreaded wasm64 programs crash at runtime.

The underlying futex implementation (`futex.rs`) already handles both wasm32 and wasm64
correctly — only the module selection cfg guards are wrong.

### Symptoms

When running a wasm64 module with shared memory and worker threads (e.g. via
wasm-bindgen + rayon), worker threads crash with:

```
RuntimeError: unreachable
    at std::sys::sync::once::no_threads::Once::call
    at std::sync::once::Once::call_once
```

This happens because `no_threads::Once::call` contains `unreachable!()` — it assumes
threading is impossible, but wasm64 with atomics does support threads.

### How to reproduce

1. Compile any Rust project targeting `wasm64-unknown-unknown` with:
   ```
   RUSTFLAGS="-C target-feature=+atomics,+bulk-memory,+mutable-globals"
   cargo build --target wasm64-unknown-unknown -Z build-std=panic_abort,std
   ```
2. Use the compiled wasm module with shared memory and spawn worker threads
   (e.g. via wasm-bindgen's thread support or wasm-bindgen-rayon)
3. Any worker thread calling `std::sync::Once` or `thread::park` will panic

## The fix

Two files need one-line changes each.

### File 1: `library/std/src/sys/sync/once/mod.rs`

Find:
```rust
all(target_arch = "wasm32", target_feature = "atomics"),
```

Replace with:
```rust
all(any(target_arch = "wasm32", target_arch = "wasm64"), target_feature = "atomics"),
```

### File 2: `library/std/src/sys/sync/thread_parking/mod.rs`

Find:
```rust
all(target_arch = "wasm32", target_feature = "atomics"),
```

Replace with:
```rust
all(any(target_arch = "wasm32", target_arch = "wasm64"), target_feature = "atomics"),
```

That's it. Two lines changed.

## Important context for the PR

### Why `any(wasm32, wasm64)` instead of `cfg(wasm)`

There was a previous attempt to add a unified `cfg(wasm)` that would match both wasm32
and wasm64 (issue #83879, PR #80525). It was reverted (PR #83981) because it was
insta-stable and conflicted with users already using `--cfg wasm` for their own purposes.
The correct approach for now is the explicit `any(target_arch = "wasm32", target_arch = "wasm64")`.

### The futex implementation already works

The file `library/std/src/sys/sync/futex/wasm32.rs` (or similar) handles both wasm32 and
wasm64 via `memory.atomic.wait32` / `memory.atomic.notify` intrinsics that work identically
on both architectures. The bug is purely in the cfg-guard module selection, not in the
actual implementation.

### wasm64 is tier 3

`wasm64-unknown-unknown` is a tier 3 target, so there's no CI testing for it. This fix
has been manually verified by building and running a multithreaded wasm64 application
(o1js proof system with wasm-bindgen + rayon worker threads) using
`-Z build-std=panic_abort,std`. Worker threads that previously crashed with
`unreachable` now work correctly.

### Note on `cfg_select!` vs `cfg_if!`

Recent upstream Rust has migrated these files from `cfg_if::cfg_if!` to the built-in
`cfg_select!` macro. The syntax is slightly different:

**Old (`cfg_if!`):**
```rust
cfg_if::cfg_if! {
    if #[cfg(any(
        all(target_arch = "wasm32", target_feature = "atomics"),
        ...
    ))] {
        mod futex;
    }
}
```

**New (`cfg_select!`):**
```rust
cfg_select! {
    any(
        all(target_arch = "wasm32", target_feature = "atomics"),
        ...
    ) => {
        mod futex;
    }
}
```

Make sure you're editing the current version of the files (which use `cfg_select!`).

## Suggested PR title

```
std: add wasm64 to sync::Once and thread_parking atomics cfg guards
```

## Suggested PR description

```markdown
When targeting `wasm64-unknown-unknown` with atomics enabled, `std::sync::Once` falls
through to the `no_threads` implementation and `thread_parking` falls through to
`unsupported`, because the cfg guards only check for `target_arch = "wasm32"`.

This causes worker threads to panic with `unreachable` when calling `Once::call_once`
or `thread::park`.

The underlying futex implementations already handle both wasm32 and wasm64 correctly.
This PR adds `target_arch = "wasm64"` to the two cfg guards so that wasm64+atomics
selects the futex-based implementations, matching wasm32+atomics behavior.

Tested manually with a multithreaded wasm64 application (proof system using
wasm-bindgen + rayon) compiled with `-Z build-std=panic_abort,std` and
`-C target-feature=+atomics,+bulk-memory,+mutable-globals`.

Related: #83879 (cfg(wasm) was proposed but reverted; this is the targeted fix)
Related: #77839 (WebAssembly atomics tracking issue)
```

## Steps to submit

```bash
# 1. Fork and clone
gh repo fork rust-lang/rust --clone
cd rust

# 2. Create branch
git checkout -b fix-wasm64-sync-cfg

# 3. Make the two edits (described above)
# Edit library/std/src/sys/sync/once/mod.rs
# Edit library/std/src/sys/sync/thread_parking/mod.rs

# 4. Commit
git add library/std/src/sys/sync/once/mod.rs library/std/src/sys/sync/thread_parking/mod.rs
git commit -m "std: add wasm64 to sync::Once and thread_parking atomics cfg guards

When targeting wasm64-unknown-unknown with atomics, the no_threads/unsupported
fallbacks were incorrectly selected because the cfg guards only checked for
wasm32. The futex implementations already support both architectures.

Related: #83879, #77839"

# 5. Push and create PR
git push origin fix-wasm64-sync-cfg
gh pr create --repo rust-lang/rust \
  --title "std: add wasm64 to sync::Once and thread_parking atomics cfg guards" \
  --body-file pr-description.md
```

## References

- `cfg(wasm)` issue: https://github.com/rust-lang/rust/issues/83879
- WebAssembly atomics tracking: https://github.com/rust-lang/rust/issues/77839
- Discovered while adding Memory64 support to o1js (https://github.com/o1-labs/o1js)
