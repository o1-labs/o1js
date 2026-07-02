#!/usr/bin/env bash
set -Eeuo pipefail

# Description:
#   Builds the wasm32-wasip1-threads target of the kimchi-napi crate — the same
#   crate that powers the native (.node) backend — using the napi-rs CLI. The
#   resulting artifacts (wasm binary + generated Node/browser loaders backed by
#   @napi-rs/wasm-runtime) are shared by the node and web wasm build scripts.
#
# Requirements:
#   - Rust toolchain with the `wasm32-wasip1-threads` target installed
#   - node_modules installed (uses @napi-rs/cli and emnapi)
#
# Usage:
#   invoked by ./scripts/build/wasm/build-node.sh and ./build-web.sh

source ./scripts/lib/ux.sh

setup_script "kimchi-napi-wasm-build" "kimchi-napi wasm build"

MINA_PATH=./src/mina
NATIVE_PATH=$MINA_PATH/src/lib/crypto/kimchi_bindings/js/native
PROOF_SYSTEMS_PATH=$MINA_PATH/src/lib/crypto/proof-systems
NAPI=$(pwd)/node_modules/.bin/napi
ARTIFACTS_PATH=$NATIVE_PATH/artifacts-wasm

info "building kimchi-napi for wasm32-wasip1-threads..."

(
  cd $NATIVE_PATH
  run_cmd "$NAPI" build \
    --manifest-path ../../../proof-systems/Cargo.toml \
    --package kimchi-napi \
    --target wasm32-wasip1-threads \
    --release \
    --platform \
    --output-dir ./artifacts-wasm
)

info "fixing generated type definitions..."

# The napi-rs type-def generator emits setters with optional parameters, which
# is invalid TypeScript (TS1051). Rewrite them to required parameters (the
# `| undefined | null` in the type already conveys optionality).
node -e '
  let fs = require("fs");
  let path = process.argv[1];
  let src = fs.readFileSync(path, "utf8");
  src = src.replace(/(set [A-Za-z_][A-Za-z0-9_]*\([A-Za-z_][A-Za-z0-9_]*)\?:/g, "$1:");
  fs.writeFileSync(path, src);
' $ARTIFACTS_PATH/index.d.ts

success "kimchi-napi wasm build success!"
