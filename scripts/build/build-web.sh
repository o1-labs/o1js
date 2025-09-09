#!/usr/bin/env bash
set -Eeuo pipefail

# ---------- shared libraries ----------
source "$(dirname "${BASH_SOURCE[0]}")/../lib/ux.sh"

# ---------- paths ----------
ROOT_DIR="$(get_repo_root)"

# ---------- setup ----------
setup_script "${BASH_SOURCE[0]}" "Web build"

# ---------- steps ----------
bold "Building web distribution"

info "Cleaning previous web build..."
rimraf ./dist/web
ok "Web directory cleaned"

info "Building web bundle..."
node src/build/build-web.js
ok "Web bundle built"

success "Web build complete"