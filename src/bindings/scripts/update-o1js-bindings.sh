#!/usr/bin/env bash
set -Eeuo pipefail

# shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$ROOT_DIR/scripts/lib/ux.sh"

# setup
setup_script "${BASH_SOURCE[0]}" "Update bindings"

# environment variables
JUST_BINDINGS="${JUST_BINDINGS:-}"

# steps
bold "Updating o1js bindings (node + Web)"

bold "Phase 1: Building node bindings"

info "Building node artifacts..."
run_cmd "${SCRIPT_DIR}"/build-o1js-node-artifacts.sh
ok "node artifacts built"

info "Copying build artifacts to dist..."
mkdir -p dist/node/bindings/compiled/node_bindings/
cp -r src/bindings/compiled/node_bindings/* dist/node/bindings/compiled/node_bindings/
cp src/bindings.d.ts dist/node/
ok "Build artifacts copied"

if [ -z "${JUST_BINDINGS}" ]; then
    info "Running main build..."
    run_cmd npm run build
    ok "Main build complete"
else
    info "Skipping main build (JUST_BINDINGS set)"
fi

bold "Phase 2: Building web bindings"

npm run build:wasm:web
npm run build:jsoo:web

bold "Phase 3: Building final project"

if [ -z "${JUST_BINDINGS}" ]; then
    info "Running web build..."
    run_cmd npm run build:web
    ok "web build complete"
else
    info "Skipping web build (JUST_BINDINGS set)"
fi

success "Bindings update complete (node + web)"
