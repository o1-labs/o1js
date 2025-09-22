#!/usr/bin/env bash
set -Eeuo pipefail

# shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$ROOT_DIR/scripts/lib/ux.sh"

# paths
MINA_PATH=src/mina
DUNE_PATH=src/bindings/ocaml/jsoo_exports # this is the path to where we build the jsoo artifacts from
BUILD_PATH=_build/default/"${DUNE_PATH}" # this is where dune puts the build artifacts
KIMCHI_BINDINGS="${MINA_PATH}"/src/lib/crypto/kimchi_bindings # path to kimchi bindings in the mina repo
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

info "Checking existing build artifacts..."
if [ -f "${BUILD_PATH}"/o1js_node.bc.js ]; then
  info "Found existing o1js_node.bc.js"
  if [ -f "${BUILD_PATH}"/o1js_node.bc.map ]; then
    info "Found o1js_node.bc.map, saving at temp location (dune will delete it)"
    run_cmd cp "${BUILD_PATH}"/o1js_node.bc.map _build/o1js_node.bc.map
    ok "Source map saved"
  else
    warn "Missing o1js_node.bc.map, removing o1js_node.bc.js to force rebuild"
    run_cmd rm -f "${BUILD_PATH}"/o1js_node.bc.js
    ok "Stale artifacts cleaned"
  fi
else
  info "No existing o1js_node.bc.js found, will build from scratch"
fi

info "Setting up Mina configuration files..."
run_cmd dune b "${MINA_PATH}"/src/config.mlh
run_cmd cp "${MINA_PATH}"/src/config.mlh "src"
run_cmd cp -r "${MINA_PATH}"/src/config "src/config"
ok "Mina config files copied"

info "Building Kimchi bindings for Node.js..."
run_cmd dune b "${KIMCHI_BINDINGS}"/js/node_js
ok "Kimchi bindings built"

info "Building JSOO artifacts for o1js"
run_cmd dune b "${DUNE_PATH}"/o1js_node.bc.js
ok "JSOO artifacts built"

info "Checking for updated source map..."
if [ -f "${BUILD_PATH}"/o1js_node.bc.map ]; then
  info "New source map created, saving it"
  run_cmd cp "${BUILD_PATH}"/o1js_node.bc.map _build/o1js_node.bc.map
  ok "Source map updated"
else
  info "No new source map created"
fi

info "Building transaction layout TypeScript definitions..."
run_cmd dune b src/bindings/mina-transaction/gen/v1/js-layout.ts \
  src/bindings/mina-transaction/gen/v2/js-layout.ts \
  src/bindings/crypto/constants.ts
ok "TypeScript definitions built"

info "Cleaning up Mina config files..."
run_cmd rm -rf "src/config"
run_cmd rm "src/config.mlh"
ok "Config files cleaned up"

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
run_cmd cp _build/default/"${KIMCHI_BINDINGS}"/js/node_js/plonk_wasm* "${BINDINGS_PATH}"
run_cmd mv -f "${BINDINGS_PATH}"/plonk_wasm.js "${BINDINGS_PATH}"/plonk_wasm.cjs
run_cmd mv -f "${BINDINGS_PATH}"/plonk_wasm.d.ts "${BINDINGS_PATH}"/plonk_wasm.d.cts
ok "WASM bindings copied and renamed"

info "Copying Node.js bindings..."
run_cmd cp "${BUILD_PATH}"/o1js_node*.js "${BINDINGS_PATH}"
run_cmd cp src/bindings/compiled/node_bindings/o1js_node.bc.d.cts "${BINDINGS_PATH}"/
if [ -f "_build/o1js_node.bc.map" ]; then
    run_cmd cp "_build/o1js_node.bc.map" "${BINDINGS_PATH}"/o1js_node.bc.map
    info "Source map copied"
else
    warn "No source map found at _build/o1js_node.bc.map, skipping"
fi
run_cmd mv -f "${BINDINGS_PATH}"/o1js_node.bc.js "${BINDINGS_PATH}"/o1js_node.bc.cjs
ok "Node.js bindings copied"

info "Updating WASM references in bindings..."
run_cmd sed -i 's/plonk_wasm.js/plonk_wasm.cjs/' "${BINDINGS_PATH}"/o1js_node.bc.cjs
ok "WASM references updated"

info "Cleaning up temporary source map..."
if [ -f "_build/o1js_node.bc.map" ]; then
    run_cmd cp _build/o1js_node.bc.map "${BUILD_PATH}"/o1js_node.bc.map
    run_cmd rm -f _build/o1js_node.bc.map
    ok "Temporary source map cleaned up"
else
    info "No temporary source map to clean up"
fi

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
