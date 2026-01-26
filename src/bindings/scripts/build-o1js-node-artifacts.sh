#!/usr/bin/env bash
set -Eeuo pipefail

# shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$ROOT_DIR/scripts/lib/ux.sh"

# paths
MINA_PATH=src/mina

# setup
setup_script "${BASH_SOURCE[0]}" "Node artifacts build"

DUNE_USE_DEFAULT_LINKER="y"

bold "Building bindings artifacts"

info "Checking dependencies..."
if [ ! -d node_modules ]; then
    info "Installing npm dependencies..."
    run_cmd npm i
    ok "Dependencies installed"
else
    ok "Dependencies already installed"
fi

npm run build:wasm:node
npm run build:jsoo:node

npm run build:bindings-transaction-layout

success "Node bindings artifacts build complete"
