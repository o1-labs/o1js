#!/usr/bin/env bash
set -Eeuo pipefail

# shared ux library
source "$(dirname "${BASH_SOURCE[0]}")/../lib/ux.sh"

# logging setup
setup_script "${BASH_SOURCE[0]}" "Development build"

# main steps
bold "Building development version"

info "Compiling TypeScript with test configuration..."
npx tsc -p tsconfig.test.json
ok "TypeScript compilation complete"

info "Copying artifacts to dist..."
mkdir -p dist/node/bindings/compiled/node_bindings/
cp -r src/bindings/compiled/node_bindings/* dist/node/bindings/compiled/node_bindings/
cp src/bindings.d.ts dist/node/
ok "Artifacts copied"

success "Development build complete"