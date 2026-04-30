#!/usr/bin/env bash
set -Eeuo pipefail

# shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/ux.sh"

# paths
ROOT_DIR="$(get_repo_root)"

# setup
setup_script "${BASH_SOURCE[0]}" "VK regression check"

cd "$ROOT_DIR"

# steps
bold "Checking verification keys for regressions"

info "Running regression checks..."

run_backend() {
  local backend="$1"
  info "Backend: $backend"
  run_cmd env O1JS_BACKEND="$backend" VK_TEST=1 ./run ./tests/vk-regression/vk-regression.ts --bundle
  run_cmd env O1JS_BACKEND="$backend" VK_TEST=2 ./run ./tests/vk-regression/vk-regression.ts --bundle
}

case "${O1JS_BACKEND:-both}" in
  wasm|native)
    run_backend "$O1JS_BACKEND"
    ;;
  both|'')
    run_backend wasm
    run_backend native
    ;;
  *)
    error "Invalid O1JS_BACKEND='${O1JS_BACKEND}'. Expected 'wasm', 'native', or unset."
    exit 1
    ;;
esac

ok "Verification keys regression check completed"

success "VK regression check complete"
