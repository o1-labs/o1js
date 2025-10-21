#!/usr/bin/env bash
set -Eeuo pipefail

# shared libraries
source ./scripts/lib/ux.sh

# paths
ROOT_DIR="$(get_repo_root)"
BINDINGS_CHECK_PATH="${BINDINGS_CHECK_PATH:-$ROOT_DIR/src/bindings/compiled}"

# setup
setup_script "${BASH_SOURCE[0]}" "Build"

# steps
bold "Starting build"

bold "[1/4] Ensuring compiled bindings"

if [[ -d "$BINDINGS_CHECK_PATH" ]]; then
  ok "Found compiled bindings at: $BINDINGS_CHECK_PATH"
else
  warn "Compiled bindings not found at: $BINDINGS_CHECK_PATH"
  warn "Trying npm run check:bindings (downloads prebuilt artifacts)..."

  # Non-fatal attempt to fetch CI-built bindings
  ( cd "$ROOT_DIR" && npm run check:bindings ) || true

  if [[ -d "$BINDINGS_CHECK_PATH" ]]; then
    ok "Bindings downloaded successfully at: $BINDINGS_CHECK_PATH"
  else
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
  fi
fi

bold "[2/4] Cleaning dist/node"
if command -v npx >/dev/null 2>&1; then
  npx rimraf "$ROOT_DIR/dist/node"
else
  rm -rf "$ROOT_DIR/dist/node"
fi
ok "dist/node cleaned."

bold "[3/4] Running npm run build:dev"
(cd "$ROOT_DIR" && npm run build:dev)
ok "build:dev completed."

bold "[4/4] Building Node bundle"
node "$ROOT_DIR/src/build/build-node.js"
ok "Node build completed."

success "Build finished successfully."
