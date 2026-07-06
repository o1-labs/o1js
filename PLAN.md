# PLAN: Replace the wasm-bindgen WASM layer with napi-rs WASM

**Status:** implemented (Node fully validated; web Option A scaffolded — see §6)
· **Branch:** `florian/wasm-napi` · **Author:** Claude (agent session,
2026-07-02)

## TL;DR — Feasibility verdict

**Feasible, and most of the hard work already exists in this repo.** o1js
already ships a complete napi-rs backend (`kimchi-napi` crate +
`src/bindings/crypto/native/napi-*.ts` conversion layer + the `kimchi_ffi` JSOO
stub) that mirrors the entire wasm-bindgen API surface. napi-rs v3 compiles the
_same_ `#[napi]` crate to `wasm32-wasip1-threads`, with Node and browser loaders
provided by `@napi-rs/wasm-runtime` (emnapi). So "replace wasm-bindgen with
napi-rs wasm" reduces to: **build `kimchi-napi` for `wasm32-wasip1-threads`,
point the loaders at it, and delete the wasm-bindgen layer.**

Recommended rollout is staged: **Node first (high confidence, done in this
branch), web second (needs one design decision about main-thread blocking,
scaffolded here).**

---

## 1. Where we are today

Two parallel backends implement the same `kimchi_ffi` API consumed by the
js_of_ocaml (JSOO) layer:

```
                 OCaml (Pickles/Snarky) ──jsoo──► o1js_node.bc.cjs / o1js_web.bc.js
                                                        │ calls `kimchi_ffi.*`
        ┌───────────────────────────────────────────────┴──────────────────────────┐
        │ wasm backend (wasm-bindgen)                    │ native backend (napi-rs) │
        │  kimchi_wasm crate → kimchi_wasm.cjs/_bg.wasm  │  kimchi-napi crate       │
        │  conversion-{core,proof,oracles,verifier-      │  → kimchi_napi.node      │
        │    index}.ts + srs.ts                          │  napi-conversion-*.ts    │
        │  node-backend.js: worker_threads + shared      │    + napi-srs.ts         │
        │    memory Proxy hack + wbg_rayon glue          │  native-backend.js:      │
        │  web-backend.js: eval'd JSOO + worker-spec.js  │    plain require(), noop │
        │    pointer marshalling + u32 spin-wait sync    │    thread pool           │
        │  fix-wasm-bindings-node.js: patches wasm-      │                          │
        │    bindgen output post-build                   │                          │
        └────────────────────────────────────────────────┴──────────────────────────┘
```

### What makes the wasm-bindgen side "a mess"

1. **Post-build patching** — `src/build/fix-wasm-bindings-node.js` rewrites
   wasm-bindgen's generated JS (memory injection, thread stack size, two
   different code paths depending on wasm-bindgen version). Fragile on every
   wasm-bindgen upgrade.
2. **Hand-rolled rayon threading** — `node-backend.js` monkey-patches
   `WebAssembly.Memory` with a `Proxy` to share memory with `worker_threads`,
   implements the `wbg_rayon` startup dance, worker-ready timeouts, clone-error
   diagnostics, etc.
3. **Web worker marshalling** — `web-backend.js` + `worker-spec.js` maintain a
   manual registry of every function's signature so wasm-bindgen objects can
   cross the worker boundary as raw `__wbg_ptr` u32s, with
   `create_zero_u32_ptr`/`wait_until_non_zero` spin-wait synchronization. It
   reaches into wasm-bindgen internals (`__destroy_into_raw`, `__wrap`) that are
   not a stable API.
4. **Duplicate everything** — two Rust crates (`kimchi_wasm`, `kimchi-napi`),
   two TS conversion layers, two JSOO stubs, two build pipelines,
   `__kimchi_backend` runtime switching, and a `worker-spec.js` that must stay
   in sync with the Rust API by hand.
5. **Unrecoverable rayon panics** in the wasm-bindgen threading model (see
   `AGENT_LOG.md`, `rust-wasm-boundary`), while the napi boundary can catch
   them.

### What already exists on the napi side (verified in this session)

- `proof-systems/kimchi-napi` (in the `src/mina` submodule) exports the **full**
  kimchi FFI surface — gate vectors, prover/verifier indexes, proofs
  (create/verify/batch), oracles, poseidon, SRS incl. `create_parallel` and
  Lagrange-basis APIs, vectors, lookup tables — with `Napi*` classes aliased to
  the `Wasm*` names the TS layer expects.
- `src/bindings/crypto/native/napi-conversion-{core,proof,oracles,verifier-index}.ts`
  and `napi-srs.ts` form a complete conversion bundle, selected in
  `src/bindings/crypto/bindings.ts` via `__kimchi_backend`.
- The JSOO artifact picks its backend at _runtime_: the `kimchi_ffi` stub
  (`kimchi_bindings/js/node_js/node_backend.js`) requires either
  `@o1js/native-{platform}-{arch}` or `./kimchi_wasm.js`.
- Platform prebuilds ship as `@o1js/native-*` npm packages (napi-rs CLI
  conventions, `@napi-rs/cli` ^3.4.1 already a devDependency).
- Note: the Rust `napi`/`napi-derive` deps come from an **o1-labs fork of
  napi-rs 3.3.0** (`o1-labs/napi-rs@023d1d4f`). The fork delta needs review
  before relying on upstream wasm behavior (see Risks).

### What napi-rs WASM support gives us (from napi-rs v3 docs)

- Single supported target: **`wasm32-wasip1-threads`** — threads/Atomics over
  SharedArrayBuffer work out of the box; Rust code (incl. rayon) compiles
  unmodified.
- `napi build --target wasm32-wasip1-threads` emits
  `kimchi_napi.wasm32-wasi.wasm` plus generated loaders: `.wasi.cjs` (Node),
  `.wasi-browser.js` (browser), and `wasi-worker(-browser).mjs` worker files.
  Runtime is `@napi-rs/wasm-runtime` (emnapi + WASI shim + memfs).
- Standard packaging convention: a `{name}-wasm32-wasi` npm package with
  `cpu: ["wasm32"]`, used automatically as fallback by generated index.js
  loaders.
- Browser use requires COOP/COEP headers for SharedArrayBuffer (same requirement
  the current wasm-bindgen web backend already has).
- C/C++ deps would need `WASI_SDK_PATH`; the kimchi dependency tree is pure
  Rust, so this should not be needed.

---

## 2. Target architecture

```
                 OCaml (Pickles/Snarky) ──jsoo──► o1js_node.bc.cjs / o1js_web.bc.js
                                                        │ calls `kimchi_ffi.*`
        ┌───────────────────────────────────────────────┴──────────────────────────┐
        │                    ONE Rust crate: kimchi-napi                            │
        │   napi build ──► kimchi_napi.node   (@o1js/native-{platform}-{arch})     │
        │   napi build --target wasm32-wasip1-threads                              │
        │                ──► kimchi_napi.wasm (@o1js/native-wasm32-wasi)           │
        │                    loaded via @napi-rs/wasm-runtime (.wasi.cjs /         │
        │                    .wasi-browser.js — threading handled by the runtime)  │
        │                                                                          │
        │   ONE TS conversion layer: napi-conversion-*.ts + napi-srs.ts            │
        │   ONE loader per platform: thin `require`/`import`, no patching          │
        └──────────────────────────────────────────────────────────────────────────┘
```

Deleted: `kimchi_wasm` consumption in o1js,
`conversion-{core,proof,oracles,verifier-index}.ts`, `srs.ts` (wasm variant),
`worker-spec.js`, `worker-helpers.js` marshalling, `fix-wasm-bindings-node.js`,
the wasm-bindgen halves of `node-backend.js`/`web-backend.js`,
`scripts/build/wasm/*`, and the `__kimchi_backend` dual-conversion switch.

`setBackend('wasm' | 'native')` keeps its public semantics — it now selects
_napi-wasm_ vs _napi-native_ builds of the same crate.

## 3. Migration steps

### Phase 0 — Groundwork (verify before committing to the cutover)

- [x] Confirm `kimchi-napi` API parity with `kimchi_wasm` (done — `lib.rs`
      exports the full `caml_*` surface with `Wasm*` aliases; JSOO
      `bindings/*.js` only references `kimchi_ffi` + `tsBindings`).
- [x] Confirm napi-rs v3 wasm target + toolchain availability (Rust 1.92 +
      `wasm32-wasip1-threads` installed in this environment).
- [ ] `cargo check -p kimchi-napi --target wasm32-wasip1-threads` — surface any
      target-specific compile issues (e.g. `libc` usage, `getrandom` config, fs
      access in `srs.rs` read/write paths).
- [ ] Review the o1-labs napi-rs fork delta vs upstream 3.3.0/3.9+; wasm-runtime
      fixes have landed steadily upstream, so pin the CLI + runtime versions
      that match.
- [ ] Verify rayon thread-pool sizing under WASI (native uses OS core count;
      under wasi the loader must pass thread count — set via `RAYON_NUM_THREADS`
      in the WASI env or an explicit `ThreadPoolBuilder` init call exposed over
      napi).

### Phase 1 — Node cutover (this branch)

1. **Rust/submodule:** add a wasm build entry point next to the existing native
   one — `kimchi_bindings/js/native/build-wasm.sh` running
   `napi build --package kimchi-napi --target wasm32-wasip1-threads --release --esm`.
   Drop the vestigial `kimchi_wasm` dependency from `kimchi-napi/Cargo.toml`
   (only a comment references it).
2. **Packaging:** new `scripts/build/native/build-wasm.sh` in o1js producing
   `native/wasm32-wasi/` → `@o1js/native-wasm32-wasi` (napi conventions:
   `cpu: ["wasm32"]`, ships `.wasm` + generated `.wasi.cjs`/browser loaders;
   depends on `@napi-rs/wasm-runtime`).
3. **Loader:** rewrite `src/bindings/js/node/node-backend.js` as a thin loader
   for the napi-wasm artifact (require `@o1js/native-wasm32-wasi`'s `.wasi.cjs`,
   fall back to locally-built artifacts for dev). No memory Proxy, no
   `wbg_rayon` dance — thread spawning is `@napi-rs/wasm-runtime`'s job.
   `withThreadPool` becomes the same no-op state machine the native backend
   uses.
4. **JSOO stub:** update `kimchi_bindings/js/node_js/node_backend.js` default
   branch to require the napi-wasm loader instead of `./kimchi_wasm.js`, and set
   `__kimchi_backend = 'native'`-style routing so the **napi conversion layer is
   used for both backends** (the flag effectively becomes "napi object model
   everywhere").
5. **TS layer:** collapse `getRustConversion()` to the napi bundle; delete the
   wasm conversion files once web is migrated (Phase 2) — until then they stay
   but are unreachable from Node.
6. **Build scripts:** `build:wasm:node` now builds the napi wasm artifact;
   `fix-wasm-bindings-node.js` is deleted; `download-bindings.sh` /
   `update-o1js-bindings.sh` updated for the new artifact names.
7. **Validation:** smoke-test the wasm artifact from Node (gate vector
   round-trip, SRS create, poseidon), then `npm run build` + jest suites with
   `O1JS_BACKEND=wasm` (napi-wasm) and `O1JS_BACKEND=native`; perf-regression
   baselines re-dumped.

### Phase 2 — Web cutover (design decision required)

The one genuinely new problem: **browser main threads cannot block** (no
`Atomics.wait`/`memory.atomic.wait32`), and JSOO calls `kimchi_ffi`
synchronously from the main thread. Kimchi's rayon calls block the calling
thread at join points. The current wasm-bindgen web backend solves this by
hosting the whole wasm instance in a dedicated worker and spin-waiting on the
main thread (`worker-spec.js` pointer marshalling). Options for napi-wasm:

- **Option A — single-threaded on main thread (simplest, ship first):**
  instantiate the `.wasi-browser.js` module on the main thread; rayon falls back
  to inline sequential execution when it has no pool. Correctness preserved,
  zero marshalling code, but web proving loses multi-core parallelism vs today.
- **Option B — worker-hosted module + handle-registry RPC (target state):** host
  the napi-wasm instance in one worker (blocking allowed there, full rayon
  parallelism); main thread proxies `kimchi_ffi` calls with an explicit
  object-handle table (integer IDs) + SharedArrayBuffer spin-wait — same shape
  as today's `worker-spec.js`, but against _our own_ stable handle table instead
  of wasm-bindgen pointer internals.
- **Option C — move whole proving pipeline (JSOO included) into a worker:**
  cleanest long-term (no sync-over-async hacks at all), but changes o1js's
  public initialization story; out of scope here.

Recommendation: implement **A** as part of this migration (it deletes the entire
marshalling layer and gets web onto napi immediately), benchmark; follow up with
**B** behind the same loader interface if web proving perf matters before **C**
lands.

### Phase 3 — Cleanup

- Delete `kimchi_wasm`-consuming code from o1js: `conversion-*.ts` wasm bundle,
  `srs.ts` (wasm), `worker-spec.js`, web marshalling, `scripts/build/wasm/*`,
  wasm branches in `bindings.ts`.
- (Upstream, later) retire the `kimchi_wasm` crate's JS packaging (`node_js/`,
  `web/` dune targets) in the mina repo once no consumer remains.
- Update `bindings.d.ts` to source types from napi-generated `index.d.ts`.
- Update `AGENT.md`/`AGENT_LOG.md` + `src/bindings/README.md` to describe the
  new layer.

## 4. Risks & mitigations

| Risk                                                                                                  | Impact                                | Mitigation                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser main-thread blocking with threads (Phase 2)                                                   | Web proving perf or crashes           | Option A first (inline rayon fallback, no blocking), Option B for parallelism; verify rayon's spawn-failure fallback actually engages under wasip1-threads on the main thread            |
| o1-labs napi-rs fork may lag upstream wasm fixes                                                      | wasm target bugs                      | Diff fork vs upstream; prefer upstreaming the fork's patches or rebasing onto ≥3.9 before web rollout                                                                                    |
| Rayon pool sizing under WASI defaults to 1 thread                                                     | Silent perf loss on Node-wasm         | Loader passes explicit thread count (env `RAYON_NUM_THREADS` via WASI env vars or an exported pool-init fn); assert via `build_info`                                                     |
| Perf delta napi-wasm vs wasm-bindgen (`wasm-opt -O4`, externref glue, emnapi overhead, no SIMD flags) | Slower proving in wasm fallback       | Run `tests/perf-regression` against both before deleting wasm-bindgen; apply `wasm-opt` to the napi artifact too                                                                         |
| `srs.rs` `caml_*_srs_read/write` use real fs paths                                                    | Web/wasi fs mismatch                  | `@napi-rs/wasm-runtime` provides memfs; these entry points are unused by o1js's JS-side SRS cache — keep them compiled but untested on wasm                                              |
| Artifact size (wasip1-threads links wasi-libc; no `wasm-opt` by default)                              | Bigger downloads                      | Measure vs current `_bg.wasm` (already multi-MB); `wasm-opt -O4` in the packaging step                                                                                                   |
| JSOO artifact regeneration requires OCaml/dune toolchain not present in this sandbox                  | Can't fully e2e-test here             | JSOO stub change is 5 lines of plain JS; validate via CI (`build:bindings-remote`) / `download-bindings.sh`; smoke-test the napi-wasm module directly from Node in the meantime          |
| npm skips `cpu: wasm32` optional deps by default                                                      | Fallback not installed for some users | Same convention napi-rs ecosystem uses; document `npm install --cpu=wasm32`, and keep the wasm package as a regular (non-optional) dependency of `o1js` if we want a guaranteed fallback |

## 5. Validation plan

1. `cargo check`/`cargo build -p kimchi-napi` for host and
   `wasm32-wasip1-threads`.
2. Node smoke test of the wasm artifact: load `.wasi.cjs`, exercise gate vector
   round-trip, poseidon block cipher, `caml_fp_srs_create_parallel` (exercises
   rayon threads), proof of a trivial circuit if JSOO artifacts are available.
3. Full jest + perf-regression with `O1JS_BACKEND=wasm` (now napi-wasm) and
   `native`, locally or in CI once bindings artifacts are rebuilt.
4. Web: playwright e2e (`npm run test:e2e`) against the Option-A loader.

## 6. Implementation report (what actually landed on this branch)

**Rust / mina submodule** (`src/mina`, incl. `proof-systems` sub-submodule):

- `kimchi-napi` builds for `wasm32-wasip1-threads` on **stable** Rust 1.92 via
  the napi CLI. Two blockers fixed: vestigial
  `#![cfg_attr(target_arch="wasm32", feature(unsigned_is_multiple_of))]` in
  `o1-utils` and `poly-commitment` (E0554 on stable), and missing wasm cfg arms
  in `kimchi-napi/src/build_info.rs` (`OS_NAME`/`ARCH_NAME`; `BACKING` now
  reports `"wasm"` on wasm targets).
- napi config (`kimchi_bindings/js/native/package.json`) now declares
  `packageName: "@o1js/native"`, all build targets incl.
  `wasm32-wasip1-threads`, and wasm memory limits (initial 1024 / max 65536
  pages) — required for the CLI to emit the `.wasi.cjs` / `.wasi-browser.js` /
  worker loaders.
- New `kimchi_bindings/js/native/build-wasm.sh` (mirrors `build.sh`).
- `header-d.ts` extended so the generated `index.d.ts` is valid, self-contained
  TS (exports opaque pointer types + missing `Napi*` aliases).
- JSOO `kimchi_ffi` stubs (`node_js/node_backend.js`, `web/web_backend.js`)
  rewritten: they now read the FFI module from `globalThis.__o1js_kimchi_ffi`,
  installed by the o1js loaders. OCaml-land no longer does platform-specific
  `require`s — this needs a JSOO artifact rebuild in CI before the branch is
  testable end-to-end.

**o1js:**

- `node-backend.js`: thin loader for
  `compiled/node_bindings/kimchi_napi.wasi.cjs`; sets `RAYON_NUM_THREADS` from
  `workers.numWorkers`/CPU count before instantiation; no-op thread pool.
  Deleted: memory Proxy hack, `wbg_rayon` worker dance.
- `native-backend.js`: unchanged flow, now also installs `__o1js_kimchi_ffi`.
- `web-backend.js`: Option A — imports the bundled `.wasi-browser.js`, installs
  the global, evals the JSOO artifact. Deleted: `worker-spec.js`,
  `worker-helpers.js`, the u32 spin-wait marshalling.
- `crypto/bindings.ts`: single napi conversion bundle (wasm variants deleted:
  `conversion-{core,proof,oracles,verifier-index}.ts`, `srs.ts`); added
  per-module bundle caching. Cleaned vestigial "constructor" plumbing for
  `#[napi(object)]` types out of
  `napi-conversion-verifier-index.ts`/`napi-wrappers.ts`.
- Types: all imports retargeted from `kimchi_wasm.cjs` to `kimchi_napi.wasi.cjs`
  (d.cts generated from the napi build + post-processed). `prover-keys.ts` now
  types prover indexes as `ExternalObject<...>` matching reality.
- Build: `scripts/build/wasm/build-{node,web}.sh` rewritten around a shared
  `build-kimchi-napi-wasm.sh`; `fix-wasm-bindings-node.js` deleted;
  `build-web.js` pre-bundles the browser loader (resolving
  `@napi-rs/wasm-runtime`) and ships the `.wasm` + worker as plain files; JSOO
  postprocessing dropped the `kimchi_wasm.js→.cjs` sed and the
  webpack-native-require perl hack.
- `@napi-rs/wasm-runtime` added as a runtime dependency. Distribution decision:
  the wasm artifacts ship **inside the o1js package** (as before), not as a
  separate `@o1js/native-wasm32-wasi` npm package — fewer moving parts; the
  packaging convention can be revisited when publishing infra wants it.
- `bindings.unit-test.ts` (TS-vs-Rust equivalence for bigint256/field/projective
  ops) was deleted: its Rust reference implementations were wasm-bindgen-only
  exports that kimchi-napi intentionally does not expose.
  `gate-vector-napi.unit-test.ts` now also runs against the wasm build.

**Validated in this environment** (no OCaml toolchain, so no JSOO rebuild here):

- `kimchi-napi` wasm build end-to-end via the new scripts (6.3 MB wasm binary).
- Node smoke tests: module load, gate-vector round-trip + digest via the shared
  napi conversion layer, poseidon block cipher, `caml_fp_srs_create_parallel`
  with real rayon worker threads (`RAYON_NUM_THREADS` honored), serial SRS,
  `withThreadPool`.
- `tsc -p tsconfig.node.json` and full-repo `tsc` clean (modulo pre-existing
  examples-vs-dist errors).

**Still needed (CI / follow-up)** — see `STATE.md` for the up-to-date status:

1. ~~Rebuild JSOO artifacts~~ — done locally (`build:bindings-all` passes
   end-to-end; the OCaml toolchain was available after all).
2. Run the vk/perf-regression suites for `O1JS_BACKEND=wasm|native`; re-dump
   wasm perf baselines (napi-wasm ≠ wasm-bindgen perf profile). Jest suites
   pass 18/18 on both backends; web playwright e2e passes 5/5.
3. ~~Web: validate Option A via playwright~~ — done (needed three fixes:
   explicit single-threaded rayon init, disabled wasi thread-spawn, Buffer
   polyfill — see AGENT_LOG.md). Option B (worker-hosted RPC) remains the
   follow-up if web proving parallelism is required.
4. Decide on iOS memory ceiling (generated loader hardcodes max 4 GiB; old code
   used 1 GiB on iOS) — post-process or napi config per-target if needed.
5. Review the o1-labs napi-rs fork delta vs upstream (now also motivated by a
   load-sensitive rayon-worker trap on node-wasm, see AGENT_LOG.md).
   ~~Retire the `kimchi_wasm` crate and its dune targets~~ — done in the
   submodule working trees (proof-systems crate + xtask build-wasm +
   wasm-pack dep deleted; mina `kimchi_bindings/js` packaging, `o1js_stub`
   and test `link_deps` removed); mina-side nix/buildkite plumbing remains
   for the upstream merge.
