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

info "Setting up Mina configuration files..."
run_cmd dune b "${MINA_PATH}"/src/config.mlh
run_cmd cp "${MINA_PATH}"/src/config.mlh "src"
run_cmd cp -r "${MINA_PATH}"/src/config "src/config"
ok "Mina config files copied"

npm run build:wasm:node
npm run build:jsoo:node
npm run build:native:node

info "Building transaction layout TypeScript definitions..."
run_cmd dune b src/bindings/mina-transaction/gen/v1/js-layout.ts \
  src/bindings/mina-transaction/gen/v2/js-layout.ts \
  src/bindings/crypto/constants.ts
ok "TypeScript definitions built"

info "Formatting generated transaction layout definitions..."
run_cmd npx prettier --write \
  src/bindings/crypto/constants.ts \
  src/bindings/mina-transaction/gen/**/*.ts
ok "TypeScript definitions formatted"

info "Cleaning up Mina config files..."
run_cmd rm -rf "src/config"
run_cmd rm "src/config.mlh"
ok "Config files cleaned up"

success "Node bindings artifacts build complete"
