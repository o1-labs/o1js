#!/usr/bin/env bash

# - If bindings are missing, try `npm run check:bindings` (downloads CI artifacts).
# - If that fails, fall back to `npm run build:bindings-node` (local build).
# - Subsequent steps (copy/clean/builds) are critical: failures stop the script with a clear message.

set -Eeuo pipefail

# ---------- paths ----------
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BINDINGS_CHECK_PATH="${BINDINGS_CHECK_PATH:-$ROOT_DIR/src/bindings/compiled}"  # presence gate

# ---------- shared libraries ----------
source ./scripts/lib/ux.sh
setup_script "${BASH_SOURCE[0]}" "Build"

# ---------- steps ----------
ensure_bindings() {
  bold "[1/5] Ensuring compiled bindings"

  if [[ -d "$BINDINGS_CHECK_PATH" ]]; then
    ok "Found compiled bindings at: $BINDINGS_CHECK_PATH"
    return 0
  fi

  warn "Compiled bindings not found at: $BINDINGS_CHECK_PATH"
  warn "Trying npm run check:bindings (downloads prebuilt artifacts)..."

  # Non-fatal attempt to fetch CI-built bindings
  ( cd "$ROOT_DIR" && npm run check:bindings ) || true

  if [[ -d "$BINDINGS_CHECK_PATH" ]]; then
    ok "Bindings downloaded successfully at: $BINDINGS_CHECK_PATH"
    return 0
  fi

  warn "check:bindings did not produce bindings. Falling back to local build via npm run build:bindings-node (fatal)..."

  # FATAL fallback: if this fails, the ERR trap will abort the build
  ( cd "$ROOT_DIR" && npm run build:bindings-node )

  # Extra safety: ensure the directory actually exists after a 'successful' run
  if [[ -d "$BINDINGS_CHECK_PATH" ]]; then
    ok "Bindings built locally at: $BINDINGS_CHECK_PATH"
  else
    error "Local bindings build completed but ${BINDINGS_CHECK_PATH} is still missing."
    exit 1
  fi
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
ensure_bindings         # use check:bindings first(non-fatal on error), then fallback to build:bindings-node(fatal on error)
clean_dist_node         # fatal on error
build_dev               # fatal on error
build_node              # fatal on error
success "Build finished successfully."
