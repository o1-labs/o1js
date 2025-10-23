#!/usr/bin/env bash
set -Eeuo pipefail

source ./scripts/lib/ux.sh

setup_script "native-node-build" "native node build"

KIMCHI_PATH=./src/mina/src/lib/crypto/kimchi_bindings/js/native
BUILT_PATH=./_build/default/$KIMCHI_PATH
BINDINGS_PATH=./src/bindings/compiled/native

mkdir -p $BINDINGS_PATH

info "building native Kimchi bindings..."

dune build $KIMCHI_PATH

info "copying artifacts into the right place..."

cp $BUILT_PATH/plonk_napi.node $BINDINGS_PATH/plonk_napi.node
chmod 660 $BINDINGS_PATH/plonk_napi.node

success "Native build success!"