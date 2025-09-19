#!/usr/bin/env bash
set -Eeuo pipefail

# shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/ux.sh"

# paths
ROOT_DIR="$(get_repo_root)"
TEST_REPORT_DIR="$ROOT_DIR/tests/report"
TEST_ARTIFACTS_DIR="$ROOT_DIR/tests/test-artifacts"

# setup
setup_script "${BASH_SOURCE[0]}" "Clean all artifacts"

cd "$ROOT_DIR"

# steps
bold "Performing full cleanup"

info "Running primary clean task..."
run_cmd npm run clean
ok "Primary clean complete"

if [ -d "$TEST_REPORT_DIR" ]; then
  info "Removing test report directory..."
  run_cmd rimraf "$TEST_REPORT_DIR"
  ok "Test report directory removed"
else
  warn "Test report directory not found, skipping"
fi

if [ -d "$TEST_ARTIFACTS_DIR" ]; then
  info "Removing test artifacts directory..."
  run_cmd rimraf "$TEST_ARTIFACTS_DIR"
  ok "Test artifacts directory removed"
else
  warn "Test artifacts directory not found, skipping"
fi

success "Full cleanup complete"
