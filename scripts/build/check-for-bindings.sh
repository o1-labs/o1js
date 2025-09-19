#!/usr/bin/env bash
set -Eeuo pipefail

# shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/ux.sh"

ROOT_DIR="$(get_repo_root)"
BINDINGS_DIR="$ROOT_DIR/src/bindings/compiled"
setup_script "${BASH_SOURCE[0]}" "Bindings check"

cd "$ROOT_DIR"

# steps
bold "Checking for compiled bindings"

if [ -d "$BINDINGS_DIR" ]; then
  ok "Bindings already present"
else
  warn "Bindings directory missing"
  info "Downloading bindings..."
  run_cmd npm run build:bindings-download
  ok "Bindings downloaded"
fi

success "Bindings check complete"
