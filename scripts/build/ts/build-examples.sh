#!/usr/bin/env bash
set -Eeuo pipefail

# logging lib
source ./scripts/lib/ux.sh
setup_script "${BASH_SOURCE[0]}" "Examples build"

# main steps
bold "Building examples"

info "Running main build first..."
npm run build
ok "Main build complete"

info "Cleaning previous examples build..."
rimraf ./dist/examples
ok "Examples directory cleaned"

info "Compiling examples..."
npx tsc -p tsconfig.examples.json
ok "Examples compilation complete"

info "Compiling benchmarks..."
npx tsc -p benchmark/tsconfig.json
ok "Benchmarks compilation complete"

success "Examples build complete"