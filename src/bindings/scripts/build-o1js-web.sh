#!/usr/bin/env bash

set -e

MINA_PATH="src/mina"
DUNE_PATH="src/bindings/ocaml/jsoo_exports"
BUILD_PATH="_build/default/$DUNE_PATH"
KIMCHI_BINDINGS="$MINA_PATH/src/lib/crypto/kimchi_bindings"
WEB_BINDINGS="src/bindings/compiled/web_bindings"

dune b "${DUNE_PATH}"/o1js_web.bc.js
cp _build/default/"${KIMCHI_BINDINGS}"/js/web/plonk_wasm* "${WEB_BINDINGS}"/
cp "${BUILD_PATH}"/o1js_web*.js "${WEB_BINDINGS}"/

# better error messages
# `s` is the jsoo representation of the error message string, and `s.c` is the actual JS string
sed -i 's/function failwith(s){throw \[0,Failure,s\]/function failwith(s){throw globalThis.Error(s.c)/' "${WEB_BINDINGS}"/o1js_web.bc.js
sed -i 's/function invalid_arg(s){throw \[0,Invalid_argument,s\]/function invalid_arg(s){throw globalThis.Error(s.c)/' "${WEB_BINDINGS}"/o1js_web.bc.js
sed -i 's/return \[0,Exn,t\]/return globalThis.Error(t.c)/' "${WEB_BINDINGS}"/o1js_web.bc.js
sed -i 's/function raise(t){throw caml_call1(to_exn$0,t)}/function raise(t){throw Error(t?.[1]?.c ?? "some error")}/' "${WEB_BINDINGS}"/o1js_web.bc.js

pushd "${WEB_BINDINGS}"
  wasm-opt --detect-features --enable-mutable-globals -O4 plonk_wasm_bg.wasm -o plonk_wasm_bg.wasm.opt
  mv plonk_wasm_bg.wasm.opt plonk_wasm_bg.wasm
popd

npm run build:web
