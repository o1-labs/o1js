#!/usr/bin/env bash
set -Eeuo pipefail

# Description:
#   Builds the o1js TypeScript project for development. This script:
#     - Compiles the TypeScript source files and outputs the compiled JavaScript to the `dist/` directory.
#     - Copies prebuilt Node bindings from `src/bindings/compiled/node_bindings/`
#       into `dist/node/bindings/compiled/node_bindings/`.
#     - Copies the top-level TypeScript declaration file (`src/bindings.d.ts`)
#       to `dist/node/` for type support.
#
# Notes:
#   - Expects node bindings to be prebuilt(compiled by earlier build steps).
#
# Usage:
#   npm run build:dev


# shared ux library
source ./scripts/lib/ux.sh

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