#!/usr/bin/env bash

set -e

MINA_PATH="src/mina"
DUNE_PATH="src/bindings/ocaml/jsoo_exports"
BUILD_PATH="_build/default/$DUNE_PATH"
DIR_PATH=$(dirname "$0")
KIMCHI_BINDINGS="$MINA_PATH/src/lib/crypto/kimchi_bindings"
NODE_BINDINGS="src/bindings/compiled/node_bindings"
WEB_BINDINGS="src/bindings/compiled/web_bindings"

# 1. node build

"${DIR_PATH}"/build-o1js-node-artifacts.sh
cp src/bindings/compiled/_node_bindings/plonk_wasm.d.cts "${NODE_BINDINGS}"/plonk_wasm.d.cts
node src/build/copy-to-dist.js

chmod -R 777 "${NODE_BINDINGS}"

BINDINGS_PATH=dist/node/bindings/compiled/_node_bindings
cp "${BINDINGS_PATH}"/o1js_node.bc.cjs "${NODE_BINDINGS}"/o1js_node.bc.cjs
cp "${BINDINGS_PATH}"/o1js_node.bc.map "${NODE_BINDINGS}"/o1js_node.bc.map
cp "${BINDINGS_PATH}"/plonk_wasm* "${NODE_BINDINGS}"/

sed -i 's/plonk_wasm.js/plonk_wasm.cjs/' "${NODE_BINDINGS}"/o1js_node.bc.cjs

if [ -z "${JUST_BINDINGS}" ]
then
  npm run build
fi

# 2. web build

# Normally these variables are not defined
# But the nix build uses them
if [ -z "${PREBUILT_KIMCHI_BINDINGS_JS_WEB}" ] || [ -z "${PREBUILT_KIMCHI_BINDINGS_JS_NODE_JS}" ]
then
  cp "$BUILD_PATH/o1js_node.bc.map" "_build/o1js_node.bc.map"
  dune b "${DUNE_PATH}"/o1js_web.bc.js
  cp "_build/o1js_node.bc.map" "$BUILD_PATH/o1js_node.bc.map"

  cp _build/default/"${KIMCHI_BINDINGS}"/js/web/plonk_wasm* "${WEB_BINDINGS}"/
  cp "${BUILD_PATH}"/o1js_web*.js "${WEB_BINDINGS}"/
  chmod -R 666 "${WEB_BINDINGS}"/*
else
  mkdir -p "${WEB_BINDINGS}"
  cp "${PREBUILT_KIMCHI_BINDINGS_JS_WEB}"/*.js \
     "${PREBUILT_KIMCHI_BINDINGS_JS_WEB}"/*.ts \
     "${PREBUILT_KIMCHI_BINDINGS_JS_WEB}"/*.wasm \
     """${WEB_BINDINGS}"
  mkdir -p "${NODE_BINDINGS}"
  cp "${PREBUILT_KIMCHI_BINDINGS_JS_NODE_JS}"/*.js \
     "${PREBUILT_KIMCHI_BINDINGS_JS_NODE_JS}"/*.ts \
     "${PREBUILT_KIMCHI_BINDINGS_JS_NODE_JS}"/*.wasm \
     "${NODE_BINDINGS}"
  rm "${NODE_BINDINGS}"/plonk_wasm.js \
     "${NODE_BINDINGS}"/plonk_wasm.d.ts
  dune b "${DUNE_PATH}"/o1js_web.bc.js
  cp "${BUILD_PATH}"/o1js_web*.js "${WEB_BINDINGS}"/
fi

# better error messages
# `s` is the jsoo representation of the error message string, and `s.c` is the actual JS string
sed -i 's/function failwith(s){throw \[0,Failure,s\]/function failwith(s){throw globalThis.Error(s.c)/' "${WEB_BINDINGS}"/o1js_web.bc.js
sed -i 's/function invalid_arg(s){throw \[0,Invalid_argument,s\]/function invalid_arg(s){throw globalThis.Error(s.c)/' "${WEB_BINDINGS}"/o1js_web.bc.js
sed -i 's/return \[0,Exn,t\]/return globalThis.Error(t.c)/' "${WEB_BINDINGS}"/o1js_web.bc.js
sed -i 's/function raise(t){throw caml_call1(to_exn$0,t)}/function raise(t){throw Error(t?.[1]?.c ?? "Unknown error thrown by raise")}/' "${WEB_BINDINGS}"/o1js_web.bc.js

# optimize wasm / minify JS (we don't do this with jsoo to not break the error message fix above)
pushd "${WEB_BINDINGS}"
  wasm-opt --detect-features --enable-mutable-globals -O4 plonk_wasm_bg.wasm -o plonk_wasm_bg.wasm.opt
  mv plonk_wasm_bg.wasm.opt plonk_wasm_bg.wasm
  npx esbuild --minify --log-level=error o1js_web.bc.js > o1js_web.bc.min.js
  mv o1js_web.bc.min.js o1js_web.bc.js
popd

if [ -z "${JUST_BINDINGS}" ]
then
  npm run build:web
fi
