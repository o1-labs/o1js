#!/usr/bin/env bash
set -Eeuo pipefail

# Description:
#   Builds the Kimchi WebAssembly bindings for Web (browser) usage. This script:
#     - Builds the wasm32-wasip1-threads target of the kimchi-napi crate (the
#       same crate that powers the native backend) via the napi-rs CLI.
#     - Copies the wasm binary, the generated browser loader
#       (`kimchi_napi.wasi-browser.js`, backed by @napi-rs/wasm-runtime) and its
#       worker file into `src/bindings/compiled/web_bindings/`.
#     - Optimizes the WebAssembly binary with `wasm-opt` when available.
#
# Usage:
#   npm run build:wasm:web

source ./scripts/lib/ux.sh

setup_script "wasm-web-build" "wasm web build"

MINA_PATH=./src/mina
ARTIFACTS_PATH=$MINA_PATH/src/lib/crypto/kimchi_bindings/js/native/artifacts-wasm
BINDINGS_PATH=./src/bindings/compiled/web_bindings/

./scripts/build/wasm/build-kimchi-napi-wasm.sh

mkdir -p $BINDINGS_PATH

info "copying artifacts into the right place..."

cp $ARTIFACTS_PATH/kimchi_napi.wasm32-wasi.wasm $BINDINGS_PATH/
cp $ARTIFACTS_PATH/kimchi_napi.wasi-browser.js $BINDINGS_PATH/
cp $ARTIFACTS_PATH/wasi-worker-browser.mjs $BINDINGS_PATH/
cp $ARTIFACTS_PATH/index.d.ts $BINDINGS_PATH/kimchi_napi.wasi-browser.d.ts

if command -v wasm-opt >/dev/null 2>&1; then
  info "optimizing wasm with wasm-opt..."
  run_cmd wasm-opt \
    --detect-features \
    --enable-mutable-globals \
    --enable-threads \
    --enable-bulk-memory \
    -O4 \
    -o $BINDINGS_PATH/kimchi_napi.wasm32-wasi.wasm.opt \
    $BINDINGS_PATH/kimchi_napi.wasm32-wasi.wasm
  run_cmd mv $BINDINGS_PATH/kimchi_napi.wasm32-wasi.wasm.opt $BINDINGS_PATH/kimchi_napi.wasm32-wasi.wasm
  ok "wasm optimized"
else
  warn "wasm-opt not found — skipping wasm optimization"
fi

success "WASM web build success!"
