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

success "WASM node build success!"
