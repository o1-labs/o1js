# AGENT.md — o1js

> Context file for AI agents working on this codebase. Read this first. Read
> `AGENT_LOG.md` second — it contains hard-won lessons from previous agent
> sessions.

## Project Overview

**o1js** is the TypeScript SDK for writing zero-knowledge (ZK) applications on
Mina Protocol. It lets developers write ZK circuits, smart contracts (zkApps),
and cryptographic programs in TypeScript that compile down to constraint systems
and are proven/verified using the underlying proof system.

- **Language:** TypeScript (source), Rust (backend compiled to WASM)
- **Package:** `o1js` on npm (~15K monthly downloads)
- **License:** Apache-2.0
- **Repository structure:** TypeScript source with Rust backend pulled in via
  **git submodules** (see below)

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Developer API                   │
│         (TypeScript — src/)                      │
│   Provable types, zkApp, Circuit, Gadgets, ...   │
├─────────────────────────────────────────────────┤
│              Compilation Layer                   │
│   SnarkyJS bindings → constraint system builder  │
├─────────────────────────────────────────────────┤
│            Proof System Backend                  │
│   Kimchi (Rust) — PLONK-based proof system       │
│   Pickles — recursive proof composition (IVC)    │
│   Pasta curves (Pallas / Vesta cycle)            │
├─────────────────────────────────────────────────┤
│              Runtime Target                      │
│   WASM (browser/Node via wasm-bindgen)           │
└─────────────────────────────────────────────────┘
```

### Key subsystems

- **Provable types** (`Field`, `Bool`, `UInt64`, `Struct`, `CircuitString`,
  ...): The type system that maps TypeScript values to circuit witnesses and
  constraints. Every value inside a ZK circuit must be a provable type.
- **zkApp (SmartContract)**: On-chain smart contract model. Methods decorated
  with `@method` are compiled into proof-generating circuits. State is stored as
  on-chain fields.
- **Gadgets**: Low-level circuit building blocks (range checks, bitwise ops,
  foreign field arithmetic, ECDSA, SHA-256, etc.).
- **Kimchi**: The Rust-based PLONK proof system that generates and verifies
  proofs. Accessed via WASM bindings.
- **Pickles**: Recursive proof composition layer. Enables IVC (incrementally
  verifiable computation) — proofs that verify other proofs.
- **Pasta curves**: Pallas and Vesta, a curve cycle that enables efficient
  recursive proof composition without a trusted setup.

### Submodules

o1js pulls in its Rust backend and bindings via **git submodules**. This is
critical to understand before making changes:

- The `src/bindings/` directory (or similar) contains submodule references to
  the OCaml/Rust proof system repos.
- After cloning, you must initialize submodules:
  `git submodule update --init --recursive`
- **Submodule pointer drift** is a common source of CI failures — if the parent
  repo pins a submodule commit that has since been force-pushed or rebased,
  builds will break. Always verify submodule status after pulling.
- Changes to the Rust/OCaml backend happen in the upstream repos. To update:
  advance the submodule pointer, rebuild WASM artifacts, and test.

> ⚠️ Run `git submodule status` to check for mismatches if you see unexpected
> build failures.

### WASM boundary

The Rust backend is compiled to WASM via `wasm-bindgen` for use in both browser
and Node.js environments. This boundary is a major source of subtle bugs — see
`AGENT_LOG.md` for historical context on panics, threading issues, and memory
problems.

## Essential Commands

```bash
# Install dependencies
npm install

# Initialize submodules (required after fresh clone)
git submodule update --init --recursive

# Build the project
npm run build

# Run all tests
npm run test

# Run a specific test file
npx jest <path-to-test>

# Type checking
npm run typecheck

# Linting
npm run lint

# Build WASM bindings (requires Rust toolchain)
npm run build:wasm
```

> **Note:** Some commands may differ — check `package.json` scripts for the
> authoritative list.

## Key Concepts for Agents

### Circuit model

Code inside `@method` or `Provable.witness()` runs in two modes:

1. **Compile time**: Builds the constraint system (the circuit). No real values
   — only symbolic variables.
2. **Prove time**: Executes with real witness values and generates a proof.

This dual execution model is the #1 source of confusion. Code that works in
"normal" TypeScript may fail or behave unexpectedly inside circuits because:

- You cannot use standard `if/else` on provable values (use `Provable.if()`)
- You cannot use JS arrays dynamically (use `Provable.switch()` or
  `Provable.witness()`)
- All branches of conditional logic are always executed (constraint generation
  is not lazy)
- Side effects during compilation will run but won't run again during proving

### Provable type system

Every value in a circuit must be composed of `Field` elements. The `Provable<T>`
interface defines how types are serialized to/from fields and how they
participate in constraints.

Custom types: Use `Struct({...})` to define composite provable types. Do not try
to make plain JS objects provable.

### Recursion and proof composition

`ZkProgram` is the core API for defining provable programs. Programs can verify
proofs of other programs (recursion). This relies on Pickles and the Pasta curve
cycle.

## Common Pitfalls

1. **Modifying Rust code (Kimchi/bindings) without rebuilding WASM**: Changes in
   the Rust layer require rebuilding the compiled WASM artifacts. TypeScript
   tests will silently use stale bindings otherwise.

2. **Rayon thread panics in WASM**: The Rust backend uses Rayon for parallelism.
   In WASM environments, thread panics can be unrecoverable and produce cryptic
   errors. This is an ongoing area of work — see AGENT_LOG.md.

3. **Field arithmetic is modular**: `Field` operations wrap around the Pasta
   field modulus. This is not JavaScript number arithmetic. Comparisons,
   divisions, and range checks have circuit-specific implementations.

4. **Proof compilation is expensive**: `SmartContract.compile()` and
   `ZkProgram.compile()` are slow (often 30s+). Cache compilation results when
   running tests iteratively.

5. **State mutation in zkApps**: On-chain state can only be read and written via
   `this.state.get()` / `this.state.set()` inside `@method`. The precondition
   system ensures state consistency but has specific ordering requirements.

6. **BigInt vs Number**: ZK values internally use `BigInt`. Mixing `number` and
   `BigInt` causes subtle bugs. Always use `BigInt` literals (e.g., `1n`) when
   working with field elements directly.

## File Organization Hints

<!-- UPDATE THESE PATHS if they drift from reality -->

| Area                  | Path                                    | Notes                                |
| --------------------- | --------------------------------------- | ------------------------------------ |
| Core provable types   | `src/lib/provable/`                     | Field, Bool, Struct, etc.            |
| zkApp / SmartContract | `src/lib/mina/`                         | Contract, state, transactions        |
| Gadgets               | `src/lib/gadgets/`                      | Low-level circuit primitives         |
| Proof system API      | `src/lib/proof-system/`                 | ZkProgram, provers, verifiers        |
| Cryptography          | `src/lib/crypto/`                       | Curves, hashing, signatures          |
| Bindings / WASM       | `src/bindings/`                         | Submodules + compiled WASM artifacts |
| Tests                 | `src/tests/` and co-located `*.test.ts` | Mix of unit and integration          |

> ⚠️ These paths reflect the expected structure. If they don't match, explore
> the actual repo layout before making assumptions.

## Working with This Repo as an Agent

1. **Always read `AGENT_LOG.md` before starting work**, especially the entries
   tagged with categories relevant to your task. Filter by `category` in the
   YAML frontmatter.

2. **Before modifying Rust/WASM code**, check `git submodule status` and search
   the log for entries with `category: rust-wasm-boundary` or
   `category: build-system`. Previous agents have repeatedly hit the same
   issues.

3. **When you discover something non-obvious** — a footgun, a failed approach, a
   surprising behavior, an architectural insight — **append an entry to
   `AGENT_LOG.md`** following the protocol defined in that file. This is not
   optional. Future agents and humans depend on this institutional memory.

4. **Verify your understanding** of the circuit model before writing provable
   code. The dual-execution model (compile vs prove) is subtle and most bugs
   stem from misunderstanding it.

5. **Run tests before and after changes.** The test suite is the ground truth.
   If a test fails in a way you don't understand, check the log before
   investigating from scratch.

## Related Resources

- [o1js documentation](https://docs.minaprotocol.com/zkapps/o1js)
- [Mina Protocol](https://minaprotocol.com)
- [Kimchi (proof system)](https://github.com/o1-labs/proof-systems)
- [AGENT_LOG.md](./AGENT_LOG.md) — **Read this. It will save you hours.**
