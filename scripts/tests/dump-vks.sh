#!/usr/bin/env bash
set -Eeuo pipefail

# shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/ux.sh"

# paths
ROOT_DIR="$(get_repo_root)"

# setup
setup_script "${BASH_SOURCE[0]}" "VK dump"

cd "$ROOT_DIR"

# steps
bold "Dumping verification keys"

info "Building project before dumping VKs..."
run_cmd npm run build
ok "Build finished"

info "Running VK regression dump..."
run_cmd ./run tests/vk-regression/vk-regression.ts --bundle --dump
ok "Verification keys dumped"

success "VK dump complete"
