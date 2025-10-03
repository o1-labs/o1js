#!/usr/bin/env bash
set -Eeuo pipefail

# shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$ROOT_DIR/scripts/lib/ux.sh"

# paths
KIMCHI_BINDINGS=src/lib/crypto/kimchi_bindings # path to kimchi bindings in the mina repo
BINDINGS_PATH=src/bindings/compiled/_node_bindings/ # output path for node bindings

# setup
setup_script "${BASH_SOURCE[0]}" "Node artifacts build"

export DUNE_USE_DEFAULT_LINKER="y"

bold "Building bindings artifacts"

info "Checking dependencies..."
if [ ! -d node_modules ]; then
    info "Installing npm dependencies..."
    run_cmd npm i
    ok "Dependencies installed"
else
    ok "Dependencies already installed"
fi

info "moving into Mina context..."
run_cmd pushd src/mina

info "Building Kimchi bindings for Node.js..."
run_cmd dune b "${KIMCHI_BINDINGS}"/js/node_js
ok "Kimchi bindings built"

info "Building JSOO artifacts for o1js"
run_cmd dune b src/lib/o1js_bindings
ok "JSOO artifacts built"

info "Done in Mina, leaving..."
run_cmd popd

info "Building transaction layout TypeScript definitions..."
run_cmd node src/build/js-layout-to-types.mjs
run_cmd node src/build/js-layout-to-types-v2.mjs ./src/mina/src/lib/o1js_bindings/artifacts/jsLayout.json
run_cmd cp src/mina/src/lib/o1js_bindings/artifacts/constants.ts src/bindings/crypto/constants.ts
ok "TypeScript definitions built"


info "Setting up TypeScript declaration files..."
run_cmd mkdir -p src/bindings/compiled/node_bindings
echo '// this file exists to prevent TS from type-checking `o1js_node.bc.cjs`' \
  > src/bindings/compiled/node_bindings/o1js_node.bc.d.cts
ok "TypeScript declarations set up"

info "Preparing bindings output directory..."
run_cmd mkdir -p "${BINDINGS_PATH}"
run_cmd chmod -R 777 "${BINDINGS_PATH}"
ok "Output directory prepared"

info "Copying WASM bindings..."
run_cmd cp src/mina/_build/default/"${KIMCHI_BINDINGS}"/js/node_js/plonk_wasm* "${BINDINGS_PATH}"
run_cmd mv -f "${BINDINGS_PATH}"/plonk_wasm.js "${BINDINGS_PATH}"/plonk_wasm.cjs
run_cmd mv -f "${BINDINGS_PATH}"/plonk_wasm.d.ts "${BINDINGS_PATH}"/plonk_wasm.d.cts
ok "WASM bindings copied and renamed"

info "Copying Node.js bindings..."
run_cmd cp src/mina/src/lib/o1js_bindings/artifacts/o1js_node*.js "${BINDINGS_PATH}"
run_cmd cp src/bindings/compiled/node_bindings/o1js_node.bc.d.cts "${BINDINGS_PATH}"/
run_cmd mv -f "${BINDINGS_PATH}"/o1js_node.bc.js "${BINDINGS_PATH}"/o1js_node.bc.cjs
ok "Node.js bindings copied"

info "Updating WASM references in bindings..."
run_cmd sed -i 's/plonk_wasm.js/plonk_wasm.cjs/' "${BINDINGS_PATH}"/o1js_node.bc.cjs
ok "WASM references updated"

info "Fixing JavaScript bindings for better error handling..."
# TODO: find a less hacky way to make adjustments to jsoo compiler output
# `s` is the jsoo representation of the error message string, and `s.c` is the actual JS string
run_cmd sed -i 's/function failwith(s){throw \[0,Failure,s\]/function failwith(s){throw globalThis.Error(s.c)/' "${BINDINGS_PATH}"/o1js_node.bc.cjs
run_cmd sed -i 's/function invalid_arg(s){throw \[0,Invalid_argument,s\]/function invalid_arg(s){throw globalThis.Error(s.c)/' "${BINDINGS_PATH}"/o1js_node.bc.cjs
run_cmd sed -i 's/return \[0,Exn,t\]/return globalThis.Error(t.c)/' "${BINDINGS_PATH}"/o1js_node.bc.cjs
# TODO: this doesn't cover all cases, maybe should rewrite to_exn instead
run_cmd sed -i 's/function raise(t){throw caml_call1(to_exn$0,t)}/function raise(t){throw Error(t?.[1]?.c ?? "Unknown error thrown by raise")}/' "${BINDINGS_PATH}"/o1js_node.bc.cjs
ok "JavaScript bindings fixed"

info "Setting final permissions..."
run_cmd chmod 777 "${BINDINGS_PATH}"/*
ok "Permissions set"

info "Fixing WASM bindings for Node.js..."
run_cmd node "src/build/fix-wasm-bindings-node.js" "${BINDINGS_PATH}"/plonk_wasm.cjs
ok "WASM bindings fixed"

info "Copying final artifacts to node_bindings directory..."
run_cmd cp -R "${BINDINGS_PATH}"/* "src/bindings/compiled/node_bindings"/
ok "Final artifacts copied"

success "Node bindings artifacts build complete"
