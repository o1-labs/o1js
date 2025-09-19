#!/usr/bin/env bash
set -Eeuo pipefail

# shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/ux.sh"

# paths
ROOT_DIR="$(get_repo_root)"
DIST_DIR="$ROOT_DIR/dist"
NODE_BINDINGS_DIR="$ROOT_DIR/src/bindings/compiled/_node_bindings"

# setup
setup_script "${BASH_SOURCE[0]}" "Clean build artifacts"

cd "$ROOT_DIR"

# steps
bold "Cleaning build outputs"

if [ -d "$DIST_DIR" ]; then
  info "Removing dist directory..."
  run_cmd rimraf "$DIST_DIR"
  ok "dist directory removed"
else
  warn "dist directory not found, skipping"
fi

if [ -d "$NODE_BINDINGS_DIR" ]; then
  info "Removing node bindings directory..."
  run_cmd rimraf "$NODE_BINDINGS_DIR"
  ok "Node bindings directory removed"
else
  warn "Node bindings directory not found, skipping"
fi

success "Clean complete"
