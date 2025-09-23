#!/usr/bin/env bash
set -Eeuo pipefail

# shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/ux.sh"

# paths
ROOT_DIR="$(get_repo_root)"

# setup
setup_script "${BASH_SOURCE[0]}" "Web prepublish"

cd "$ROOT_DIR"

# steps
bold "Preparing web artifacts for publishing"

info "Ensuring bindings are available..."
run_cmd npm run check:bindings
ok "Bindings ready"

info "Building production web bundle..."
run_cmd env NODE_ENV=production node src/build/build-web.js
ok "Production web bundle built"

success "Web prepublish complete"
