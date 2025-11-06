#!/usr/bin/env bash
set -Eeuo pipefail

# Description:
#   Deep-clean o1js build artifacts produced across multiple toolchains. This script
#   removes compiled JS outputs, compiled node/web bindings, and intermediate outputs created
#   by OCaml/Dune, Rust/WASM, and the Mina proof-systems build.
#
# Usage:
#   npm run clean:artifacts


# shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/ux.sh"

# paths
ROOT_DIR="$(get_repo_root)"
DIST_DIR="$ROOT_DIR/dist"
COMPILED_DIR="$ROOT_DIR/src/bindings/compiled"
JSOO_DIR="$ROOT_DIR/_build/default/src/bindings/ocaml/jsoo_exports"
KIMCHI_BINDINGS_NODE="$ROOT_DIR/_build/default/src/mina/src/lib/crypto/kimchi_bindings/js/node_js"
KIMCHI_BINDINGS_WEB="$ROOT_DIR/_build/default/src/mina/src/lib/crypto/kimchi_bindings/js/web"
PROOF_SYSTEMS_DIR="$ROOT_DIR/_build/default/src/mina/src/lib/crypto/proof-systems"
CRYPTO_CONSTANTS="$ROOT_DIR/_build/default/src/bindings/crypto/constants.ts"
MINA_TRANSACTION_GEN="$ROOT_DIR/_build/default/src/bindings/mina-transaction/gen"

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

bold "Cleaning compiled bindings"
if [ -d "$COMPILED_DIR" ]; then
  info "Removing compiled artifact files from $COMPILED_DIR..."
  run_cmd rimraf "$COMPILED_DIR"
  ok "Compiled artifact files removed"
else
  warn "Compiled directory not found, skipping"
fi

bold "Cleaning compiled OCaml jsoo artifacts"
if [ -d "$JSOO_DIR" ]; then
  info "Removing compiled artifact files from $JSOO_DIR..."
  run_cmd rimraf "$JSOO_DIR"
  ok "Compiled jsoo artifact files removed"
else
  warn "Compiled directory not found, skipping"
fi

bold "Cleaning compiled Kimchi bindings node artifacts"
if [ -d "$KIMCHI_BINDINGS_NODE" ]; then
  info "Removing compiled artifact files from $KIMCHI_BINDINGS_NODE..."
  run_cmd rimraf "$KIMCHI_BINDINGS_NODE"
  ok "Compiled Kimchi bindings node artifact files removed"
else
  warn "Compiled directory not found, skipping"
fi

bold "Cleaning compiled Kimchi bindings web artifacts"
if [ -d "$KIMCHI_BINDINGS_WEB" ]; then
  info "Removing compiled artifact files from $KIMCHI_BINDINGS_WEB..."
  run_cmd rimraf "$KIMCHI_BINDINGS_WEB"
  ok "Compiled Kimchi bindings web artifact files removed"
else
  warn "Compiled directory not found, skipping"
fi

bold "Cleaning compiled Mina proof systems artifacts"
if [ -d "$PROOF_SYSTEMS_DIR" ]; then
  info "Removing compiled artifact files from $PROOF_SYSTEMS_DIR..."
  run_cmd rimraf "$PROOF_SYSTEMS_DIR"
  ok "Compiled Mina proof systems artifact files removed"
else
  warn "Compiled directory not found, skipping"
fi

bold "Cleaning compiled bindings crypto constants"
if [ -f "$CRYPTO_CONSTANTS" ]; then
  info "Removing $CRYPTO_CONSTANTS"
  run_cmd rimraf "$CRYPTO_CONSTANTS"
  ok "_build/default/src/bindings/crypto/constants.ts removed"
else
  warn "_build/default/src/bindings/crypto/constants.ts not found, skipping"
fi

bold "Cleaning compiled Mina transaction layout TS definitions"
if [ -d "$MINA_TRANSACTION_GEN" ]; then
  info "Removing compiled files in $MINA_TRANSACTION_GEN"
  run_cmd rimraf "$MINA_TRANSACTION_GEN";
  ok "Mina transaction layout TS definitions removed"
else
  warn "Compiled directory not found, skipping"
fi

success "Build artifacts cleanup complete"