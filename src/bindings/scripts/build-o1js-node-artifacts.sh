#!/usr/bin/env bash

set -e

MINA_PATH=src/mina
DUNE_PATH=src/bindings/ocaml/jsoo_exports
BUILD_PATH=_build/default/"${DUNE_PATH}"
KIMCHI_BINDINGS="${MINA_PATH}"/src/lib/crypto/kimchi_bindings

[ -d node_modules ] || npm i

export DUNE_USE_DEFAULT_LINKER="y"

if [ -f "${BUILD_PATH}"/o1js_node.bc.js ]; then
  echo "found o1js_node.bc.js"
  if [ -f "${BUILD_PATH}"/o1js_node.bc.map ]; then
    echo "found o1js_node.bc.map, saving at a tmp location because dune will delete it"
    cp "${BUILD_PATH}"/o1js_node.bc.map _build/o1js_node.bc.map ;
  else
    echo "did not find o1js_node.bc.map, deleting o1js_node.bc.js to force calling jsoo again"
    rm -f "${BUILD_PATH}"/o1js_node.bc.js
  fi
fi

# Copy mina config files, that is necessary for o1js to build
dune b "${MINA_PATH}"/src/config.mlh && \
cp "${MINA_PATH}"/src/config.mlh "src" \
&& cp -r "${MINA_PATH}"/src/config "src/config" || exit 1

dune b "${KIMCHI_BINDINGS}"/js/node_js \
&& dune b "${DUNE_PATH}"/o1js_node.bc.js || exit 1

# update if new source map was built
if [ -f "${BUILD_PATH}"/o1js_node.bc.map ]; then
  echo "new source map created";
  cp "${BUILD_PATH}"/o1js_node.bc.map _build/o1js_node.bc.map;
fi

dune b src/bindings/mina-transaction/gen/v1/js-layout.ts \
  src/bindings/mina-transaction/gen/v2/js-layout.ts \
  src/bindings/crypto/constants.ts \
  src/bindings/crypto/test-vectors/poseidon-kimchi.ts \
|| exit 1

# Cleanup mina config files
rm -rf "src/config" \
&& rm "src/config.mlh" || exit 1

BINDINGS_PATH=src/bindings/compiled/_node_bindings/
mkdir -p "${BINDINGS_PATH}"
chmod -R 777 "${BINDINGS_PATH}"
cp _build/default/"${KIMCHI_BINDINGS}"/js/node_js/plonk_wasm* "${BINDINGS_PATH}"
mv -f "${BINDINGS_PATH}"/plonk_wasm.js "${BINDINGS_PATH}"/plonk_wasm.cjs
mv -f "${BINDINGS_PATH}"/plonk_wasm.d.ts "${BINDINGS_PATH}"/plonk_wasm.d.cts
cp "${BUILD_PATH}"/o1js_node*.js "${BINDINGS_PATH}"
cp src/bindings/compiled/node_bindings/o1js_node.bc.d.cts "${BINDINGS_PATH}"/
cp "_build/o1js_node.bc.map" "${BINDINGS_PATH}"/o1js_node.bc.map
mv -f "${BINDINGS_PATH}"/o1js_node.bc.js "${BINDINGS_PATH}"/o1js_node.bc.cjs
sed -i 's/plonk_wasm.js/plonk_wasm.cjs/' "${BINDINGS_PATH}"/o1js_node.bc.cjs

# cleanup tmp source map
cp _build/o1js_node.bc.map "${BUILD_PATH}"/o1js_node.bc.map
rm -f _build/o1js_node.bc.map

# better error messages
# TODO: find a less hacky way to make adjustments to jsoo compiler output
# `s` is the jsoo representation of the error message string, and `s.c` is the actual JS string
sed -i 's/function failwith(s){throw \[0,Failure,s\]/function failwith(s){throw globalThis.Error(s.c)/' "${BINDINGS_PATH}"/o1js_node.bc.cjs
sed -i 's/function invalid_arg(s){throw \[0,Invalid_argument,s\]/function invalid_arg(s){throw globalThis.Error(s.c)/' "${BINDINGS_PATH}"/o1js_node.bc.cjs
sed -i 's/return \[0,Exn,t\]/return globalThis.Error(t.c)/' "${BINDINGS_PATH}"/o1js_node.bc.cjs
# TODO: this doesn't cover all cases, maybe should rewrite to_exn instead
sed -i 's/function raise(t){throw caml_call1(to_exn$0,t)}/function raise(t){throw Error(t?.[1]?.c ?? "Unknown error thrown by raise")}/' "${BINDINGS_PATH}"/o1js_node.bc.cjs

chmod 777 "${BINDINGS_PATH}"/*
node "src/build/fix-wasm-bindings-node.js" "${BINDINGS_PATH}"/plonk_wasm.cjs
