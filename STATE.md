# STATE: wasm-bindgen → napi-rs wasm migration

**Branch:** `florian/wasm-napi` · **Last updated:** 2026-07-02 · Companion docs:
`PLAN.md` (design + implementation report), `AGENT_LOG.md` (gotchas learned
during the migration).

## Summary

The wasm backend of o1js is no longer wasm-bindgen (`kimchi_wasm`). It is now
the `wasm32-wasip1-threads` build of the **`kimchi-napi`** crate — the same
napi-rs crate that powers the native (`.node`) backend — loaded through
generated `@napi-rs/wasm-runtime` loaders. Native and wasm are two build
targets of one crate, sharing one TS conversion layer
(`src/bindings/crypto/native/`) and one JSOO FFI stub protocol
(`globalThis.__o1js_kimchi_ffi`, installed by the o1js backend loaders before
the compiled OCaml artifact is evaluated).

Deleted: `worker-spec.js` pointer marshalling, `worker-helpers.js`,
`fix-wasm-bindings-node.js`, the `WebAssembly.Memory` Proxy hack, the
`wbg_rayon` worker bootstrapping, and the wasm-bindgen TS conversion layer
(`conversion-{core,proof,oracles,verifier-index}.ts`, `srs.ts`).

Changes span three repos (all committed locally, none pushed):

- **o1js** — loaders, conversion-layer collapse, build scripts, type
  retargeting, docs.
- **`src/mina` submodule** — JSOO `kimchi_ffi` stubs, napi config
  (`kimchi_bindings/js/native/package.json`), `header-d.ts`, `build-wasm.sh`.
- **`proof-systems` sub-submodule** — wasm cfg arms in
  `kimchi-napi/src/build_info.rs`, removed vestigial nightly-feature attrs in
  `o1-utils`/`poly-commitment`, dropped unused `kimchi_wasm` dep.

## Status by platform

### Node — implemented and validated

- `kimchi-napi` builds for `wasm32-wasip1-threads` on **stable Rust 1.92** via
  `napi build` (never raw cargo — it needs `EMNAPI_LINK_DIR` set by the CLI).
- Verified empirically in this environment: module loads, rayon spawns real
  worker threads (`RAYON_NUM_THREADS` honored via WASI env), `withThreadPool`
  works, and **native vs wasm backends produce byte-identical results**
  (circuit digest, poseidon block cipher, SRS points).
- `tsc` clean; `build:wasm:node` / `build:dev` pipeline runs end-to-end;
  `gate-vector-napi.unit-test` passes against both backends.

### Web — implemented (Option A), NOT yet validated

`web-backend.js` loads the generated `kimchi_napi.wasi-browser.js` on the main
thread; `build-web.js` pre-bundles the loader (resolving
`@napi-rs/wasm-runtime`) and ships the `.wasm` + worker file next to the
bundle. Untested: rebuilding `o1js_web.bc.js` requires the OCaml toolchain and
there is no browser here. Run `npm run test:e2e` after CI rebuilds bindings.

**The web threading constraint:** browser main threads cannot block
(`memory.atomic.wait32` traps), and JSOO calls the FFI synchronously from the
main thread. Options, as discussed in PLAN.md §3 Phase 2:

- **Option A (current):** instantiate the napi-wasm module on the main thread.
  Correct but rayon-parallel sections cannot fan out — web proving is
  effectively single-threaded. Simplest possible architecture; benchmark
  before accepting.
- **Option B (designed, not built):** host the napi-wasm instance in one
  dedicated Web Worker (blocking allowed there → full rayon parallelism) and
  proxy `kimchi_ffi` calls from the main thread via an explicit object-handle
  table + SharedArrayBuffer spin-wait. Same shape as the old `worker-spec.js`
  machinery, but against our own stable handle registry instead of
  wasm-bindgen pointer internals. Recommended follow-up if Option A benchmarks
  poorly (likely for large circuits).
- **Option C (out of scope):** move the whole proving pipeline (JSOO included)
  into a worker — cleanest long-term, but changes o1js's public initialization
  story.

## Blocking next steps (CI)

1. **Rebuild JSOO artifacts** (`npm run build:jsoo` / `build:bindings-remote`).
   Previously compiled `o1js_node.bc.cjs`/`o1js_web.bc.js` artifacts reference
   the removed `kimchi_wasm.cjs` and are incompatible with this branch.
2. Full jest + vk/perf-regression suites for `O1JS_BACKEND=wasm|native`;
   re-dump wasm perf baselines (napi-wasm ≠ wasm-bindgen perf profile).
3. Web e2e (playwright) against Option A; benchmark web proving.

## Open items / risks

- **iOS memory ceiling:** the generated browser loader hardcodes shared memory
  max 4 GiB (napi config); the old backend used 1 GiB on iOS. May need
  post-processing or a config split.
- **o1-labs napi-rs fork** (`o1-labs/napi-rs@023d1d4f`, v3.3.0): review delta
  vs upstream before web rollout; upstream has ongoing wasm-runtime fixes.
- **Deleted test coverage:** `bindings.unit-test.ts` (TS-vs-Rust equivalence
  for bigint256/field/projective arithmetic) had wasm-bindgen-only reference
  functions; could be restored by exposing them from kimchi-napi behind a
  test-only feature.
- **Upstream cleanup (later):** retire the `kimchi_wasm` crate and its
  `node_js/`/`web/` dune packaging in the mina repo once no consumer remains.
