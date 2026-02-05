#!/usr/bin/env bash

set -Eeuo pipefail

source ./scripts/lib/ux.sh

setup_script "wasm-web-build" "wasm web build"

if ! command -v wasm-opt >/dev/null 2>&1; then
  error "wasm-opt is required for web bindings optimization"
  exit 1
fi

MINA_PATH=./src/mina
KIMCHI_PATH=$MINA_PATH/src/lib/crypto/kimchi_bindings/js/web/
BUILT_PATH=./_build/default/$KIMCHI_PATH
BINDINGS_PATH=./src/bindings/compiled/web_bindings/

mkdir -p $BINDINGS_PATH


info "building Kimchi bindings for web..."

TARGETS=(\
  kimchi_wasm_bg.wasm \
  kimchi_wasm_bg.wasm.d.ts \
  kimchi_wasm.js \
  kimchi_wasm.d.ts\
)
dune build ${TARGETS[@]/#/$KIMCHI_PATH/}

info "copying artifacts into the right place..."

for target in "${TARGETS[@]}"; do
  cp $BUILT_PATH/$target $BINDINGS_PATH/$target
done

info "optimizing wasm with wasm-opt..."
run_cmd wasm-opt \
  --detect-features \
  --enable-mutable-globals \
  -O4 \
  -o $BINDINGS_PATH/kimchi_wasm_bg.wasm.opt \
  $BINDINGS_PATH/kimchi_wasm_bg.wasm
run_cmd mv $BINDINGS_PATH/kimchi_wasm_bg.wasm.opt $BINDINGS_PATH/kimchi_wasm_bg.wasm

ok "wasm optimized"

chmod 660 ${TARGETS[@]/#/$BINDINGS_PATH/}

success "WASM web build success!"