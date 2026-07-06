# AGENT_LOG.md — o1js

> **Append-only context log.** This file is institutional memory for the o1js
> codebase. Every entry records something an agent or human learned the hard
> way. New agents: read this before you start. It will save you from repeating
> mistakes. After your session: append what you learned. Future agents depend on
> it.

---

## Protocol: How to Use This File

### Reading

- **Before starting any task**, scan entries relevant to your work area.
- Filter by `category` — YAML frontmatter is structured for this.
- Pay special attention to entries with `severity: critical` or
  `severity: high`.
- Entries are chronological (newest at bottom). For recurring themes, search by
  category rather than reading linearly.

### Writing

**When to append an entry:**

You MUST append an entry when any of the following occur during your session:

- **Bug discovered**: You find a bug, surprising behavior, or silent failure
  mode
- **Footgun encountered**: Something that looks correct but isn't, or an
  easy-to-make mistake
- **Failed approach**: You tried something reasonable that didn't work —
  document WHY it failed
- **Dead end investigated**: You went down a path that turned out to be
  unproductive — save the next agent the trip
- **Architecture insight**: You learned something non-obvious about how the
  system fits together
- **Resolution pattern**: You found a fix or workaround for a known class of
  problems
- **Environment/tooling issue**: Build system, dependency, or platform-specific
  gotcha
- **Regression pattern**: A change in one area broke something in another —
  document the coupling

**How to append:**

1. Add a new entry at the **bottom** of this file (before the `<!-- END LOG -->`
   marker)
2. Use the exact template below
3. Never modify or delete existing entries (append-only)
4. Keep entries self-contained — a reader should understand the entry without
   reading others
5. Be specific: include file paths, error messages, and code snippets where
   relevant
6. Commit the updated log alongside your code changes

### Entry Template

```markdown
---
date: YYYY-MM-DD
agent: <agent-name-or-model>
session: <brief-task-description>
category: <see categories below>
severity: <critical|high|medium|low|info>
tags: [<free-form>, <tags>, <for-search>]
---

### <concise-title>

**Context:** What were you trying to do?

**What happened:** What went wrong, or what did you discover?

**Root cause:** Why did this happen? (If known)

**Resolution/Workaround:** How did you fix it, or how should it be handled?

**Key takeaway:** One-sentence lesson for future agents.

**Relevant files:** `path/to/file.ts`, `path/to/other.rs`
```

### Categories

| Category             | Use when...                                                |
| -------------------- | ---------------------------------------------------------- |
| `rust-wasm-boundary` | Issues crossing the Rust↔WASM↔TypeScript boundary        |
| `native-ffi`         | Neon/napi-rs native binding issues                         |
| `circuit-model`      | Compile-time vs prove-time behavior, constraint generation |
| `provable-types`     | Type system surprises, serialization, Struct issues        |
| `proof-system`       | Kimchi, Pickles, recursion, proving/verification           |
| `build-system`       | Build, compilation, bundling, dependency issues            |
| `testing`            | Test infrastructure, flaky tests, test patterns            |
| `performance`        | Proving time, compilation time, memory usage               |
| `api-design`         | Public API footguns, naming, developer experience          |
| `concurrency`        | Threading, Rayon, async, worker issues                     |
| `cryptography`       | Curve operations, hashing, signature edge cases            |
| `state-management`   | zkApp on-chain state, preconditions, transactions          |
| `architecture`       | System design insights, coupling, module boundaries        |
| `dead-end`           | Approaches that were tried and abandoned                   |
| `environment`        | Node version, OS-specific, browser compat issues           |
| `documentation`      | Misleading docs, undocumented behavior                     |

### Severity Guide

| Severity   | Meaning                                                                               |
| ---------- | ------------------------------------------------------------------------------------- |
| `critical` | Will cause incorrect proofs, data loss, or silent failures. Must be addressed.        |
| `high`     | Significant time wasted or subtle bugs. Important to know before working in the area. |
| `medium`   | Good to know. Will save 30+ minutes of investigation.                                 |
| `low`      | Minor quality-of-life insight.                                                        |
| `info`     | Architectural context. Not a problem, but useful for understanding.                   |

---

## Log Entries

<!-- Entries below. Newest at bottom. Do not modify existing entries. -->

---

date: 2025-01-01 agent: human session: initial-log-creation category:
documentation severity: info tags: [meta, seed-entry]

---

### Seed entry — Why this file exists

**Context:** Establishing the AGENT_LOG.md pattern for the o1js repository.

**What happened:** Across multiple debugging sessions (both human and
AI-assisted), we repeatedly re-investigated the same classes of problems —
particularly around the Rust/WASM boundary, Rayon thread panics, and circuit
model subtleties. Each session started from zero context.

**Root cause:** No persistent, structured record of past investigations. Git
commit messages capture _what_ changed but not _why an approach was tried and
failed_, or _what was learned about the system's behavior_.

**Resolution/Workaround:** This file. Agents and humans should append entries
whenever they learn something non-obvious. The log is append-only to preserve
the full reasoning history, including dead ends and failed approaches.

**Key takeaway:** The most valuable context is often "we tried X and it didn't
work because Y" — commit messages never capture this.

**Relevant files:** `AGENT.md`, `AGENT_LOG.md`

---

date: 2025-01-01 agent: human session: initial-log-creation category:
rust-wasm-boundary severity: critical tags: [rayon, wasm, thread-panic,
recurring]

---

### Rayon worker thread panics in WASM are unrecoverable

**Context:** The Rust proof system backend (Kimchi) uses Rayon for parallel
computation. When compiled to WASM, threading behaves fundamentally differently
than in native environments.

**What happened:** Panics inside Rayon worker threads in WASM environments
produce cryptic, unrecoverable errors. The panic cannot be caught at the
WASM↔JS boundary, and the entire WASM instance becomes corrupted. This has been
hit multiple times across different debugging sessions.

**Root cause:** WASM's threading model (SharedArrayBuffer + Web Workers) doesn't
support the panic unwinding that Rayon expects. When a Rayon worker panics, the
thread is terminated but the thread pool's shared state becomes inconsistent.
Subsequent calls into the WASM module may hang or produce garbage.

**Resolution/Workaround:** Multiple remediation paths have been analyzed:

1. Catch panics at the FFI boundary using `std::panic::catch_unwind` before they
   reach Rayon workers
2. Use `panic = "abort"` in WASM builds (prevents unwinding but kills the
   instance)
3. Validate inputs on the Rust side before they reach parallel code paths
4. The native prover (Neon FFI) does not have this issue — panics can be caught
   at the napi-rs boundary

**Key takeaway:** Any Rust change that could introduce a new panic path in
parallelized code MUST be tested in WASM, not just native. A passing native test
does not guarantee WASM safety.

**Relevant files:** `src/bindings/compiled/`, `src/bindings/native/`

---

date: 2026-07-02 agent: claude-fable-5 session: wasm-bindgen→napi-rs-wasm-migration
category: rust-wasm-boundary severity: high tags: [napi-rs, wasm,
wasm32-wasip1-threads, migration, build-system]

---

### napi-rs CLI only emits wasi JS loaders when the napi config declares a wasi target

**Context:** Migrating the wasm backend from wasm-bindgen (`kimchi_wasm`) to the
napi-rs `kimchi-napi` crate compiled for `wasm32-wasip1-threads`.

**What happened:** `napi build --target wasm32-wasip1-threads` produced only the
`.wasm` binary and `index.d.ts` — no `kimchi_napi.wasi.cjs`, browser loader, or
worker files. Also, raw `cargo check --target wasm32-wasip1-threads` fails with
`EMNAPI_LINK_DIR must be set` (napi-build's wasi branch) — the env var is set by
the napi CLI, so always build through `napi build`, not raw cargo.

**Root cause:** The CLI's `writeWasiBinding` only runs when the napi config
(`package.json` → `napi.targets`) includes a wasi target, and `--platform` must
be passed. Without `napi.packageName`, the generated loader falls back to
requiring the literal package `undefined-wasm32-wasi`.

**Resolution/Workaround:** In
`src/mina/src/lib/crypto/kimchi_bindings/js/native/package.json`, set `name`,
`napi.packageName`, and `napi.targets` (including `wasm32-wasip1-threads`), and
build with `napi build --platform`. Memory limits are configured via
`napi.wasm.initialMemory/maximumMemory` (in 64KiB pages).

**Key takeaway:** For napi-rs wasm builds, the JS loaders are driven by the napi
config, not by the build target alone — declare the wasi target in
`napi.targets` and pass `--platform`.

**Relevant files:**
`src/mina/src/lib/crypto/kimchi_bindings/js/native/package.json`,
`scripts/build/wasm/build-kimchi-napi-wasm.sh`

---

date: 2026-07-02 agent: claude-fable-5 session: wasm-bindgen→napi-rs-wasm-migration
category: build-system severity: medium tags: [rust, stable, cfg_attr,
nightly-feature, wasm32]

---

### Stale `#![cfg_attr(target_arch = "wasm32", feature(...))]` breaks stable wasm builds

**Context:** First `wasm32-wasip1-threads` build of the proof-systems workspace
on stable Rust 1.92.

**What happened:** `o1-utils` and `poly-commitment` failed with E0554
(`#![feature]` may not be used on the stable release channel). Both had
`#![cfg_attr(target_arch = "wasm32", feature(unsigned_is_multiple_of))]` — added
when wasm builds required nightly; the feature has been stable since Rust 1.87.

**Root cause:** The old wasm-bindgen pipeline built wasm32 on nightly, so the
cfg_attr was harmless. `wasm32-wasip1-threads` is a tier-2 target with prebuilt
std, so stable works — and then the vestigial feature attribute becomes a hard
error (only under `target_arch = "wasm32"`, so native CI never saw it).

**Resolution/Workaround:** Deleted the cfg_attr lines (proof-systems submodule).

**Key takeaway:** cfg_attr'd nightly features hide from native CI and only
explode when someone builds that target on stable — grep for
`cfg_attr(target_arch = "wasm32", feature` when moving wasm builds to stable.

**Relevant files:** `src/mina/src/lib/crypto/proof-systems/utils/src/lib.rs`,
`src/mina/src/lib/crypto/proof-systems/poly-commitment/src/lib.rs`

---

date: 2026-07-02 agent: claude-fable-5 session: wasm-bindgen→napi-rs-wasm-migration
category: native-ffi severity: medium tags: [napi-rs, type-defs, typescript,
header-d.ts]

---

### napi-rs type-def generation is not valid TS out of the box

**Context:** Making the generated `kimchi-napi` `index.d.ts` the canonical type
source for the TS conversion layer (replacing the wasm-bindgen `.d.ts`).

**What happened:** Three classes of problems: (1) setters generated with
optional parameters (`set x(v?: T)`) are invalid TS (TS1051); (2) many alias
names used in signatures (`NapiVector`, `NapiPastaFp`, `NapiPlonkVerifierIndex`,
…) are never declared; (3) `#[napi(object)]` types generate `interface`s (plain
JS objects at runtime) while `#[napi]` structs generate classes — TS code that
did `new napi.WasmFpDomain(...)`-style access typechecked against the old
wasm-bindgen typings but was `undefined` at runtime (it was never called, only
passed around).

**Resolution/Workaround:** (1) post-process the d.ts in
`build-kimchi-napi-wasm.sh` (regex-drop the `?`); (2) declare the missing
aliases in `header-d.ts` (which napi injects into the generated file);
(3) removed the vestigial "classes" plumbing for object-types from
`napi-conversion-verifier-index.ts` / `napi-wrappers.ts`.

**Key takeaway:** Treat generated napi type-defs as a build input needing a fix
pass, and know the `#[napi(object)]` (plain object) vs `#[napi]` class (has
constructor) distinction — only the latter exist as runtime exports.

**Relevant files:**
`src/mina/src/lib/crypto/kimchi_bindings/js/native/header-d.ts`,
`scripts/build/wasm/build-kimchi-napi-wasm.sh`,
`src/bindings/crypto/native/napi-wrappers.ts`

---

date: 2026-07-02 agent: claude-fable-5 session: wasm-bindgen→napi-rs-wasm-migration
category: concurrency severity: high tags: [rayon, wasi-threads, browser,
main-thread, atomics]

---

### Browser main threads cannot block — napi-wasm threading needs a worker host for parallel web proving

**Context:** Replacing the wasm-bindgen web backend (worker-hosted wasm +
`worker-spec.js` pointer marshalling) with the napi-rs `wasm32-wasip1-threads`
build.

**What happened:** On Node, the napi-wasm build runs rayon-parallel code fine on
the main thread (Node allows blocking; verified `caml_fp_srs_create_parallel`
spawns worker_threads and returns correctly, and `RAYON_NUM_THREADS` is honored
via the WASI env). In browsers, the main thread cannot execute
`memory.atomic.wait32`, so rayon join points called synchronously from the main
thread will trap once a multi-threaded pool exists.

**Root cause:** JS embedder rule ([[CanBlock]] = false on the main thread); this
is the same constraint the old wasm-bindgen backend solved by hosting the whole
wasm instance in a dedicated worker and spin-waiting via `wait_until_non_zero`.

**Resolution/Workaround:** Web backend (Option A, this migration) instantiates
the napi-wasm module on the main thread; parallelism on web is limited until
Option B (worker-hosted module + explicit handle-table RPC, designed in PLAN.md)
lands. Node is unaffected.

**Key takeaway:** Sync FFI + rayon + browser main thread is fundamentally
impossible without a worker host — plan web parallelism as a separate,
deliberate step, and always benchmark web proving before/after backend changes.

**Relevant files:** `src/bindings/js/web/web-backend.js`, `PLAN.md`

<!-- END LOG -->
