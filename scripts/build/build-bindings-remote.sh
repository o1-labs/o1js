#!/usr/bin/env bash
set -Eeuo pipefail

# shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/ux.sh"

ROOT_DIR="$(get_repo_root)"

setup_script "${BASH_SOURCE[0]}" "Remote bindings build"

# ensure we run from repo root
cd "$ROOT_DIR"

# steps
bold "Building bindings remotely"

info "Running remote bindings build script..."
run_cmd "$ROOT_DIR/src/bindings/scripts/remote-build-bindings.sh"
ok "Remote bindings build finished"

info "Running local build after remote bindings..."
run_cmd npm run build
ok "Local build completed"

success "Remote bindings build complete"
