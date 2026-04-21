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

<!-- END LOG -->
