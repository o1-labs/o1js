#!/usr/bin/env bash
#
# - If bindings are missing, *attempt* to build node bindings via `npm run build:bindings` and continue regardless.
# - Subsequent steps (copy/clean/builds) are critical: failures stop the script with a clear message.

set -Eeuo pipefail

# ---------- paths ----------
# script is inside src/build/, so repo root is two levels up
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BINDINGS_CHECK_PATH="${BINDINGS_CHECK_PATH:-$ROOT_DIR/src/bindings/compiled}"  # presence gate

# ---------- shared libraries ----------
source "$ROOT_DIR/scripts/lib/ux.sh"

# ---------- setup ----------
setup_error_handling "Build"

# ---------- steps ----------
ensure_bindings() {
  bold "[1/5] Ensuring compiled bindings"
  if [[ -d "$BINDINGS_CHECK_PATH" ]]; then
    ok "Found compiled bindings at: $BINDINGS_CHECK_PATH"
    return 0
  fi

  warn "Compiled bindings not found at: $BINDINGS_CHECK_PATH"
  info "Attempting to build node bindings via: npm run build:bindings"

  # Try to build node bindings but DON'T fail the whole build if this step fails
  set +e
  (cd "$ROOT_DIR" && npm run build:bindings)
  local rc=$?
  set -e

  if [[ $rc -eq 0 ]]; then
    if [[ -d "$BINDINGS_CHECK_PATH" ]]; then
      ok "Bindings built successfully at: $BINDINGS_CHECK_PATH"
    else
      warn "Bindings script completed but directory still missing. Continuing."
    fi
  else
    warn "npm run build:bindings exited with code $rc. Continuing without bindings."
    info "Tip: You can also build full (node+web) bindings later with: npm run build:update-bindings"
  fi
}

copy_artifacts() {
  bold "[2/5] Copying artifacts to dist"
  node "$ROOT_DIR/src/build/copy-artifacts.js"
  ok "Artifacts copied."
}

clean_dist_node() {
  bold "[3/5] Cleaning dist/node"
  if command -v npx >/dev/null 2>&1; then
    npx rimraf "$ROOT_DIR/dist/node"
  else
    rm -rf "$ROOT_DIR/dist/node"
  fi
  ok "dist/node cleaned."
}

build_dev() {
  bold "[4/5] Running npm run build:dev"
  (cd "$ROOT_DIR" && npm run build:dev)
  ok "build:dev completed."
}

build_node() {
  bold "[5/5] Building Node bundle"
  node "$ROOT_DIR/src/build/build-node.js"
  ok "Node build completed."
}

# ---------- main ----------
bold "Starting build"
ensure_bindings         # non-fatal if missing or failed
copy_artifacts          # fatal on error
clean_dist_node         # fatal on error
build_dev               # fatal on error
build_node              # fatal on error
bold "Build finished successfully."
