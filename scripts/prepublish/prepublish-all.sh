#!/usr/bin/env bash
set -Eeuo pipefail

# shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/ux.sh"

# paths
ROOT_DIR="$(get_repo_root)"

# setup
setup_script "${BASH_SOURCE[0]}" "Combined prepublish"

cd "$ROOT_DIR"

# steps
bold "Running prepublish tasks"

info "Running web prepublish..."
run_cmd npm run prepublish:web
ok "Web prepublish finished"

info "Running node prepublish..."
run_cmd npm run prepublish:node
ok "Node prepublish finished"

success "Prepublish tasks complete"
