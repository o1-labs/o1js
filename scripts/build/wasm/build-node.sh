#!/usr/bin/env bash

set -Eeuo pipefail

source ./scripts/lib/ux.sh

setup_script "wasm-node-build" "wasm node build"

MINA_PATH=./src/mina
KIMCHI_PATH=$MINA_PATH/src/lib/crypto/kimchi_bindings/js/node_js/
BUILT_PATH=./_build/default/$KIMCHI_PATH
BINDINGS_PATH=./src/bindings/compiled/node_bindings/

mkdir -p $BINDINGS_PATH

info "building Kimchi bindings for node..."

TARGETS=(\
  kimchi_wasm_bg.wasm \
  kimchi_wasm_bg.wasm.d.ts \
  kimchi_wasm.js \
  kimchi_wasm.d.ts \
)
dune build ${TARGETS[@]/#/$KIMCHI_PATH/}

info "copying artifacts into the right place..."

for target in "${TARGETS[@]}"; do
  cp $BUILT_PATH/$target $BINDINGS_PATH/$target
  chmod 660 $BINDINGS_PATH/$target
done

info "moving some files to CommonJS format..."

mv $BINDINGS_PATH/kimchi_wasm.js $BINDINGS_PATH/kimchi_wasm.cjs
mv $BINDINGS_PATH/kimchi_wasm.d.ts $BINDINGS_PATH/kimchi_wasm.d.cts

info "autofixing wasm bindings for Node.JS..."
run_cmd node src/build/fix-wasm-bindings-node.js $BINDINGS_PATH/kimchi_wasm.cjs

success "WASM node build success!"