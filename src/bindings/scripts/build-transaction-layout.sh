#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CRYPTO_CONSTANTS="$ROOT_DIR/_build/default/src/bindings/crypto/constants.ts"
MINA_TRANSACTION_GEN="$ROOT_DIR/_build/default/src/bindings/mina-transaction/gen"

# shared libraries
source "$ROOT_DIR/scripts/lib/ux.sh"

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

info "Building bindings constants & transaction layout TypeScript definitions..."
run_cmd dune b src/bindings/mina-transaction/gen/v1/js-layout.ts \
  src/bindings/mina-transaction/gen/v2/js-layout.ts \
  src/bindings/crypto/constants.ts
ok "Bindings constants & Mina Transaction Layout TypeScript definitions built"

info "Formatting generated transaction layout definitions..."
run_cmd npx prettier --write \
  src/bindings/crypto/constants.ts \
  src/bindings/mina-transaction/gen/**/*.ts
ok "TypeScript definitions formatted"