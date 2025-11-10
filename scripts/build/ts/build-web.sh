#!/usr/bin/env bash
set -Eeuo pipefail

# Description:
#   Builds the o1js project for Web (browser) usage. This script:
#     - Cleans the existing `dist/web` directory to ensure a fresh build output.
#     - Runs the web build process via `src/build/build-web.js`, generating the
#       browser-compatible bundle and associated artifacts.
#
# Usage:
#   npm run build:web


# logging lib
source ./scripts/lib/ux.sh
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