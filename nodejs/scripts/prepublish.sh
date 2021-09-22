#!/bin/bash

mkdir -p dist

tsc --module commonjs

cp src/snarky.js ./dist
cp src/node_bindings/plonk_wasm.js ./dist
cp src/node_bindings/plonk_wasm_bg.wasm ./dist
cp src/node_bindings/snarky_js_node.bc.js ./dist

cp src/snarky.d.ts ./dist
