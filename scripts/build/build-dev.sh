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
node src/build/copy-to-dist.js
ok "Artifacts copied"

success "Development build complete"