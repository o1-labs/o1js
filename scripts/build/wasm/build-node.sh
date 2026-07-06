#!/usr/bin/env bash
set -Eeuo pipefail

# Description:
#   Builds the Kimchi WebAssembly bindings for Node.js. This script:
#     - Builds the wasm32-wasip1-threads target of the kimchi-napi crate (the
#       same crate that powers the native backend) via the napi-rs CLI.
#     - Copies the wasm binary, the generated Node loader (`kimchi_napi.wasi.cjs`,
#       backed by @napi-rs/wasm-runtime) and its worker file into
#       `src/bindings/compiled/node_bindings/`.
#     - Installs the generated type definitions as `kimchi_napi.wasi.d.cts`.
#
# Usage:
#   npm run build:wasm:node

source ./scripts/lib/ux.sh

setup_script "wasm-node-build" "wasm node build"

MINA_PATH=./src/mina
ARTIFACTS_PATH=$MINA_PATH/src/lib/crypto/kimchi_bindings/js/native/artifacts-wasm
BINDINGS_PATH=./src/bindings/compiled/node_bindings/

./scripts/build/wasm/build-kimchi-napi-wasm.sh

mkdir -p $BINDINGS_PATH

info "copying artifacts into the right place..."

# note: the debug wasm is intentionally not copied — the generated loader
# prefers it over the release binary when both are present
cp $ARTIFACTS_PATH/kimchi_napi.wasm32-wasi.wasm $BINDINGS_PATH/
cp $ARTIFACTS_PATH/kimchi_napi.wasi.cjs $BINDINGS_PATH/
cp $ARTIFACTS_PATH/wasi-worker.mjs $BINDINGS_PATH/
cp $ARTIFACTS_PATH/index.d.ts $BINDINGS_PATH/kimchi_napi.wasi.d.cts

info "hardening generated loader against silent thread death..."

# a rayon worker thread that dies (wasm trap) or never starts (racy thread
# bootstrap) deadlocks the process silently: the parent's event loop is
# blocked inside the synchronous wasm call, so worker 'error'/'exit' events
# and forwarded stderr are never delivered, and rayon waits forever for the
# missing thread (all threads end up parked in Atomics.wait). three fixes:
#
# 1. waitThreadStart: block each spawn (allowed on node) until the thread has
#    actually started — a thread that cannot start becomes a loud EAGAIN
#    instead of a phantom tid.
# 2/3. 'error' and 'exit' handlers that crash the process with a stack trace
#    (fs.writeSync bypasses the blocked event loop). rayon threads live for
#    the process lifetime, so any worker death while the process runs is
#    fatal anyway — a crash beats an undebuggable hang.
node -e '
  let fs = require("fs");
  let path = process.argv[1];
  let src = fs.readFileSync(path, "utf8");

  let reuseAnchor = "  reuseWorker: true,";
  if (!src.includes(reuseAnchor)) throw Error("waitThreadStart anchor not found in " + path);
  src = src.replace(reuseAnchor, reuseAnchor + "\n  waitThreadStart: 10000,");

  let workerDied = (event) => `    worker.on("${event}", (e) => {
      try {
        require("fs").writeSync(
          2,
          "[o1js] fatal: wasm worker thread ${event === "exit" ? "exited" : "crashed"} (this would deadlock rayon):\\n" +
            (e && (e.stack || e.message || e)) + "\\n"
        );
      } catch (_) {}
      process.exit(70);
    });
`;
  let anchor = "    worker.onmessage = ({ data }) => {";
  if (!src.includes(anchor)) throw Error("loader hardening anchor not found in " + path);
  src = src.replace(anchor, workerDied("error") + workerDied("exit") + anchor);
  fs.writeFileSync(path, src);
' $BINDINGS_PATH/kimchi_napi.wasi.cjs

# the parent-side handlers above only fire when the main thread is between
# wasm calls — during proving it is blocked inside one, events queue forever.
# worker_threads share the OS pid, so the WORKER can break the deadlock
# itself: log the trap with a synchronous write (bypasses all event loops)
# and abort the whole process.
cat >> $BINDINGS_PATH/wasi-worker.mjs <<'WORKER_HARDENING'

// o1js hardening: a wasm trap on this thread would otherwise deadlock rayon
// silently — the parent cannot observe worker death while it is blocked
// inside a synchronous wasm call. abort the whole process (worker_threads
// share the pid) so the failure is loud and carries a stack trace.
process.on('uncaughtException', (e) => {
  try {
    fs.writeSync(
      2,
      '[o1js] fatal: wasm worker thread crashed (this would deadlock rayon):\n' +
        (e && (e.stack || e.message || e)) + '\n'
    );
  } catch (_) {}
  process.kill(process.pid, 'SIGABRT');
});

// TEMP CI diagnosis (remove): synchronous stderr breadcrumb, gated on env —
// shows in the CI job log even when everything else is wedged.
if (process.env.O1JS_CI_DIAG) {
  try { fs.writeSync(2, '[o1js-diag] wasi worker module evaluated\n'); } catch (_) {}
}
WORKER_HARDENING

# TEMP CI diagnosis (remove): breadcrumbs around loader evaluation and thread
# spawning, gated on O1JS_CI_DIAG. a hung CI test's log then shows the last
# startup stage reached before the per-test timeout kills it.
node -e '
  let fs = require("fs");
  let path = process.argv[1];
  let src = fs.readFileSync(path, "utf8");
  let diag = (msg) => `;(process.env.O1JS_CI_DIAG && (() => { try { require("fs").writeSync(2, "[o1js-diag] ${msg}\\n"); } catch (_) {} })());\n`;
  let spawnAnchor = "const worker = new Worker(";
  if (!src.includes(spawnAnchor)) throw Error("diag spawn anchor not found in " + path);
  src = src.replace(spawnAnchor, diag("spawning wasi worker thread") + spawnAnchor);
  let memAnchor = "const __sharedMemory = new WebAssembly.Memory({";
  if (!src.includes(memAnchor)) throw Error("diag memory anchor not found in " + path);
  src = src.replace(memAnchor, diag("creating shared wasm memory (4GiB max)") + memAnchor);
  let instAnchor = "const { instance: __napiInstance";
  if (!src.includes(instAnchor)) throw Error("diag instantiate anchor not found in " + path);
  src = src.replace(instAnchor, diag("memory ok, instantiating napi module") + instAnchor);
  src += "\n" + diag("node loader evaluated");
  fs.writeFileSync(path, src);
' $BINDINGS_PATH/kimchi_napi.wasi.cjs

success "WASM node build success!"
