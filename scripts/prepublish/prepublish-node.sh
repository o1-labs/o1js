#!/usr/bin/env bash
set -Eeuo pipefail

# shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/ux.sh"

# paths
ROOT_DIR="$(get_repo_root)"
DIST_NODE_DIR="$ROOT_DIR/dist/node"

# setup
setup_script "${BASH_SOURCE[0]}" "Node prepublish"

cd "$ROOT_DIR"

# steps
bold "Preparing node artifacts for publishing"

info "Ensuring bindings are available..."
run_cmd npm run check:bindings
ok "Bindings ready"

info "Copying binding artifacts..."
run_cmd node src/build/copy-artifacts.js
ok "Artifacts copied"

info "Cleaning node dist directory..."
run_cmd rimraf "$DIST_NODE_DIR"
ok "Node dist directory cleaned"

info "Compiling TypeScript for node target..."
run_cmd tsc -p tsconfig.node.json
ok "TypeScript compilation finished"

info "Copying compiled output to dist..."
run_cmd node src/build/copy-to-dist.js
ok "Copied compiled output"

info "Building production node bundle..."
run_cmd env NODE_ENV=production node src/build/build-node.js
ok "Production node bundle built"

success "Node prepublish complete"
