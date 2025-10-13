#!/usr/bin/env bash
set -Eeuo pipefail

# Also remove _build/default/src/bindings/ocaml/jsoo_exports

# shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/ux.sh"

# paths
ROOT_DIR="$(get_repo_root)"
DIST_DIR="$ROOT_DIR/dist"
COMPILED_DIR="$ROOT_DIR/src/bindings/compiled"
JSOO_DIR="_build/default/src/bindings/ocaml/jsoo_exports"
PROOF_SYSTEMS_DIR="_build/default/src/mina/src/lib/crypto/proof-systems"
CRYPTO_CONSTANTS="$ROOT_DIR/src/bindings/crypto/constants.ts"
GEN_CONST_DIR="$ROOT_DIR/src/bindings/mina-transaction/gen"

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

bold "Cleaning bindings compiled OCaml/Rust/WebAssembly artifacts"
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

bold "Cleaning compiled Mina proof systems artifacts"
if [ -d "$PROOF_SYSTEMS_DIR" ]; then
  info "Removing compiled artifact files from $PROOF_SYSTEMS_DIR..."
  run_cmd rimraf "$PROOF_SYSTEMS_DIR"
  ok "Compiled Mina proof systems artifact files removed"
else
  warn "Compiled directory not found, skipping"
fi

bold "Cleaning bindings generated crypto constants"
if [ -f "$CRYPTO_CONSTANTS" ]; then
  info "Removing $CRYPTO_CONSTANTS"
  run_cmd rimraf "$CRYPTO_CONSTANTS"
  ok "bindings/crypto/constants.ts removed"
else
  warn "bindings/crypto/constants.ts not found, skipping"
fi

bold "Cleaning Mina auto-generated transaction definitions"
if [ -d "$GEN_CONST_DIR" ]; then
  info "Removing generated files in $GEN_CONST_DIR"
  find "$GEN_CONST_DIR" -type f \( -name '*.ts' -o -name '*.js' \) -exec rm -f {} \;
  ok "Mina auto-generated transaction definitions removed"
else
  warn "bindings/mina-transaction/gen directory not found, skipping"
fi

success "Build artifacts cleanup complete"