#!/usr/bin/env bash
set -Eeuo pipefail

# shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/ux.sh"

# paths
ROOT_DIR="$(get_repo_root)"
DIST_WEB_DIR="$ROOT_DIR/dist/web"
DIST_EXAMPLES_DIR="$ROOT_DIR/dist/examples"
PLAIN_HTML_DIR="$ROOT_DIR/src/examples/plain-html"
HTML_ARTIFACTS_GLOB="$ROOT_DIR/tests/artifacts/html/*.html"
JS_ARTIFACTS_GLOB="$ROOT_DIR/tests/artifacts/javascript/*.js"

# setup
setup_script "${BASH_SOURCE[0]}" "E2E server preparation"

cd "$ROOT_DIR"

# steps
bold "Preparing local server assets for E2E tests"

info "Building example applications..."
run_cmd npm run build:examples
ok "Examples built"

if [ -d "$DIST_EXAMPLES_DIR" ]; then
  info "Copying examples into web dist..."
  mkdir -p "$DIST_WEB_DIR"
  run_cmd cp -rf "$DIST_EXAMPLES_DIR" "$DIST_WEB_DIR"
  ok "Examples copied"
else
  warn "No built examples found to copy"
fi

info "Running E2E build helper..."
run_cmd node src/build/e2e-tests-build-helper.js
ok "E2E build helper completed"

# collect assets for copy
shopt -s nullglob
HTML_ASSETS=( $HTML_ARTIFACTS_GLOB )
JS_ASSETS=( $JS_ARTIFACTS_GLOB )
shopt -u nullglob

COPY_SOURCES=(
  "$PLAIN_HTML_DIR/index.html"
  "$PLAIN_HTML_DIR/server.js"
  "${HTML_ASSETS[@]}"
  "${JS_ASSETS[@]}"
)

# remove empty entries that can appear when arrays empty
SANITIZED_SOURCES=()
for src in "${COPY_SOURCES[@]}"; do
  if [ -n "$src" ] && [ -e "$src" ]; then
    SANITIZED_SOURCES+=("$src")
  fi
done

if [ "${#SANITIZED_SOURCES[@]}" -gt 0 ]; then
  info "Copying HTML and JavaScript artifacts to web dist..."
  mkdir -p "$DIST_WEB_DIR"
  run_cmd cp -rf "${SANITIZED_SOURCES[@]}" "$DIST_WEB_DIR"
  ok "Artifacts copied"
else
  warn "No HTML or JavaScript artifacts found to copy"
fi

success "E2E server preparation complete"
