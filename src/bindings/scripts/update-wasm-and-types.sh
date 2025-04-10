#!/usr/bin/env bash

# this script updates the wasm artifacts used for node,
# as well as auto-generated wasm types checked into git

set -e

MINA_PATH="src/mina"
KIMCHI_BINDINGS="$MINA_PATH/src/lib/crypto/kimchi_bindings"
_NODE_BINDINGS="src/bindings/compiled/_node_bindings"
NODE_BINDINGS="src/bindings/compiled/node_bindings"

export DUNE_USE_DEFAULT_LINKER="y"

# change to mina directory
dune b "${KIMCHI_BINDINGS}"/js/node_js

chmod 777 "${_NODE_BINDINGS}"/*

cp _build/default/"${KIMCHI_BINDINGS}"/js/node_js/plonk_wasm* "$_NODE_BINDINGS"/
mv -f "${_NODE_BINDINGS}"/plonk_wasm.js "${_NODE_BINDINGS}"/plonk_wasm.cjs
mv -f "${_NODE_BINDINGS}"/plonk_wasm.d.ts "${_NODE_BINDINGS}"/plonk_wasm.d.cts

chmod 777 "${_NODE_BINDINGS}"/*
node src/build/fix-wasm-bindings-node.js "${_NODE_BINDINGS}"/plonk_wasm.cjs

cp "${_NODE_BINDINGS}"/plonk_wasm.d.cts "${NODE_BINDINGS}"/
