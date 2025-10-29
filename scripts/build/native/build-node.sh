#!/usr/bin/env bash
set -Eeuo pipefail

source ./scripts/lib/ux.sh

setup_script "native-node-build" "native node build"

NODE_PLATFORM=$(node -e 'console.log(process.platform)')
NODE_ARCH=$(node -e 'console.log(process.arch)')
TARGET_SLUG=$NODE_PLATFORM-$NODE_ARCH

info "building bindings for $TARGET_SLUG"

KIMCHI_PATH=./src/mina/src/lib/crypto/kimchi_bindings/js/native
BUILT_PATH=./src/mina/src/lib/crypto/kimchi_bindings/js/native/artifacts
BINDINGS_PATH=./native/$TARGET_SLUG/

mkdir -p $BINDINGS_PATH

info "building native Kimchi bindings..."

dune build $KIMCHI_PATH

info "creating package for $TARGET_SLUG bindings..."

cat > $BINDINGS_PATH/package.json <<EOF
{
  "name": "@o1js/native-$TARGET_SLUG",
  "version": "dev",
  "author": "O(1) Labs",
  "os": [
    "$NODE_PLATFORM"
  ],
  "cpu": [
    "$NODE_ARCH"
  ],
  "type": "commonjs",
  "exports": {
    ".": {
      "default": "./index.js",
      "types": "./index.d.ts"
    }
  },
  "files": [
    "plonk_napi.node",
    "index.d.ts",
    "index.js"
  ]
}
EOF

echo "module.exports = require('./plonk_napi.node')" > $BINDINGS_PATH/index.js

info "copying artifacts into the right place..."
cp $BUILT_PATH/plonk_napi.node $BINDINGS_PATH/plonk_napi.node
chmod 660 $BINDINGS_PATH/plonk_napi.node
cp $BUILT_PATH/index.d.ts $BINDINGS_PATH/index.d.ts
chmod 660 $BINDINGS_PATH/index.d.ts

success "Native build success!"