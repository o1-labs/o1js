#!/usr/bin/env bash
set -Eeuo pipefail

# logging lib
source "$(dirname "${BASH_SOURCE[0]}")/../lib/ux.sh"
setup_script "${BASH_SOURCE[0]}" "Web build"

# main steps
bold "Building web distribution"

info "Cleaning previous web build..."
run_cmd rimraf ./dist/web
ok "Web directory cleaned"

info "Building web bundle..."
run_cmd node src/build/build-web.js
ok "Web bundle built"

success "Web build complete"