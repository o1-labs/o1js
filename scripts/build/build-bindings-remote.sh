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
sleep 5 # wait a bit to make sure the job exists
run_cmd "$(dirname "$0")"/../../src/bindings/scripts/download-bindings.sh
ok "Remote bindings build finished"

info "Running local build after remote bindings..."
run_cmd npm run build
ok "Local build completed"

success "Remote bindings build complete"
