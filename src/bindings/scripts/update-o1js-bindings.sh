#!/usr/bin/env bash
set -Eeuo pipefail

# shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$ROOT_DIR/scripts/lib/ux.sh"

# paths
BUILD_PATH="src/mina/src/lib/o1js_bindings/artifacts"
KIMCHI_BINDINGS="src/lib/crypto/kimchi_bindings"
NODE_BINDINGS="src/bindings/compiled/node_bindings"
WEB_BINDINGS="src/bindings/compiled/web_bindings"

# setup
setup_script "${BASH_SOURCE[0]}" "Update bindings"

# environment variables
JUST_BINDINGS="${JUST_BINDINGS:-}"
PREBUILT_KIMCHI_BINDINGS_JS_WEB="${PREBUILT_KIMCHI_BINDINGS_JS_WEB:-}"
PREBUILT_KIMCHI_BINDINGS_JS_NODE_JS="${PREBUILT_KIMCHI_BINDINGS_JS_NODE_JS:-}"

# steps
bold "Updating o1js bindings (node + Web)"

info "Preparing output directories..."
run_cmd mkdir -p "${NODE_BINDINGS}" "${WEB_BINDINGS}"
ok "Output directories prepared"

bold "Phase 1: Building node bindings"

info "Building node artifacts..."
run_cmd "${SCRIPT_DIR}"/build-o1js-node-artifacts.sh
ok "node artifacts built"

info "Copying additional node bindings files..."
run_cmd cp src/bindings/compiled/_node_bindings/plonk_wasm.d.cts "${NODE_BINDINGS}"/plonk_wasm.d.cts
ok "Additional bindings files copied"

info "Copying build artifacts to dist..."
run_cmd node src/build/copy-to-dist.js
ok "Build artifacts copied"

info "Setting node bindings permissions..."
run_cmd chmod -R 777 "${NODE_BINDINGS}"
ok "Permissions set"

info "Copying final node bindings from dist..."
BINDINGS_PATH=dist/node/bindings/compiled/_node_bindings
run_cmd cp "${BINDINGS_PATH}"/o1js_node.bc.cjs "${NODE_BINDINGS}"/o1js_node.bc.cjs
if [ -f "${BINDINGS_PATH}"/o1js_node.bc.map ]; then
    run_cmd cp "${BINDINGS_PATH}"/o1js_node.bc.map "${NODE_BINDINGS}"/o1js_node.bc.map
    info "Source map copied"
else
    warn "No source map found in dist, skipping"
fi
run_cmd cp "${BINDINGS_PATH}"/plonk_wasm* "${NODE_BINDINGS}"/
ok "Final node bindings copied"

info "Updating WASM references in node bindings..."
run_cmd sed -i 's/plonk_wasm.js/plonk_wasm.cjs/' "${NODE_BINDINGS}"/o1js_node.bc.cjs
ok "WASM references updated"

if [ -z "${JUST_BINDINGS}" ]; then
    info "Running main build..."
    run_cmd npm run build
    ok "Main build complete"
else
    info "Skipping main build (JUST_BINDINGS set)"
fi

bold "Phase 2: Building web bindings"

info "Checking for prebuilt bindings..."
if [ -z "${PREBUILT_KIMCHI_BINDINGS_JS_WEB}" ] || [ -z "${PREBUILT_KIMCHI_BINDINGS_JS_NODE_JS}" ]; then
    info "No prebuilt bindings found, building from source..."

    info "Building web JavaScript bytecode..."
    run_cmd pushd src/mina
    run_cmd dune b src/lib/o1js_bindings
    run_cmd popd
    ok "web bytecode built"

    info "Copying web WASM bindings..."

    run_cmd cp src/mina/_build/default/"${KIMCHI_BINDINGS}"/js/web/plonk_wasm* "${WEB_BINDINGS}"/
    ok "web WASM bindings copied"
    
    info "Copying web JavaScript bindings..."
    run_cmd cp "${BUILD_PATH}"/o1js_web*.js "${WEB_BINDINGS}"/
    ok "web JavaScript bindings copied"
    
    info "Setting web bindings permissions..."
    run_cmd chmod -R 666 "${WEB_BINDINGS}"/*
    ok "web permissions set"
    
else
    info "Using prebuilt bindings from Nix environment..."
    
    info "Copying prebuilt web bindings..."
    run_cmd mkdir -p "${WEB_BINDINGS}"
    run_cmd cp "${PREBUILT_KIMCHI_BINDINGS_JS_WEB}"/*.js \
               "${PREBUILT_KIMCHI_BINDINGS_JS_WEB}"/*.ts \
               "${PREBUILT_KIMCHI_BINDINGS_JS_WEB}"/*.wasm \
               "${WEB_BINDINGS}"
    ok "Prebuilt web bindings copied"
    
    info "Copying prebuilt node bindings..."
    run_cmd mkdir -p "${NODE_BINDINGS}"
    run_cmd cp "${PREBUILT_KIMCHI_BINDINGS_JS_NODE_JS}"/*.js \
               "${PREBUILT_KIMCHI_BINDINGS_JS_NODE_JS}"/*.ts \
               "${PREBUILT_KIMCHI_BINDINGS_JS_NODE_JS}"/*.wasm \
               "${NODE_BINDINGS}"
    ok "Prebuilt node bindings copied"
    
    info "Cleaning up conflicting files..."
    run_cmd rm "${NODE_BINDINGS}"/plonk_wasm.js \
               "${NODE_BINDINGS}"/plonk_wasm.d.ts
    ok "Conflicting files removed"
    
    info "Building web JavaScript bytecode with prebuilt bindings..."
    run_cmd dune b "${DUNE_PATH}"/o1js_web.bc.js
    run_cmd cp "${BUILD_PATH}"/o1js_web*.js "${WEB_BINDINGS}"/
    ok "web JavaScript built and copied"
fi

bold "Phase 3: Web bindings optimization"

info "Improving error messages in web bindings..."
# Transform OCaml-style exceptions to JavaScript Error objects
run_cmd sed -i 's/function failwith(s){throw \[0,Failure,s\]/function failwith(s){throw globalThis.Error(s.c)/' "${WEB_BINDINGS}"/o1js_web.bc.js
run_cmd sed -i 's/function invalid_arg(s){throw \[0,Invalid_argument,s\]/function invalid_arg(s){throw globalThis.Error(s.c)/' "${WEB_BINDINGS}"/o1js_web.bc.js
run_cmd sed -i 's/return \[0,Exn,t\]/return globalThis.Error(t.c)/' "${WEB_BINDINGS}"/o1js_web.bc.js
run_cmd sed -i 's/function raise(t){throw caml_call1(to_exn$0,t)}/function raise(t){throw Error(t?.[1]?.c ?? "Unknown error thrown by raise")}/' "${WEB_BINDINGS}"/o1js_web.bc.js
ok "Error messages improved"

info "Optimizing WASM and minifying JavaScript..."
# Change to web bindings directory for optimization
run_cmd pushd "${WEB_BINDINGS}"

if ! command -v wasm-opt >/dev/null 2>&1; then
    error "wasm-opt is required for web bindings optimization"
    exit 1
fi

info "Optimizing WASM with wasm-opt..."
run_cmd wasm-opt --detect-features --enable-mutable-globals -O4 plonk_wasm_bg.wasm -o plonk_wasm_bg.wasm.opt
run_cmd mv plonk_wasm_bg.wasm.opt plonk_wasm_bg.wasm
ok "WASM optimized"

info "Minifying JavaScript with esbuild..."
run_cmd npx esbuild --minify --log-level=error o1js_web.bc.js > o1js_web.bc.min.js
run_cmd mv o1js_web.bc.min.js o1js_web.bc.js
ok "JavaScript minified"

run_cmd popd
ok "Optimization complete"


bold "Phase 4: Building final project"

if [ -z "${JUST_BINDINGS}" ]; then
    info "Running web build..."
    run_cmd npm run build:web
    ok "web build complete"
else
    info "Skipping web build (JUST_BINDINGS set)"
fi

success "Bindings update complete (node + web)"
