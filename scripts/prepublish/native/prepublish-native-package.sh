#!/usr/bin/env bash
set -Eeuo pipefail

source ./scripts/lib/ux.sh
setup_script "npm-publish-native" "NPM publish native"

NODE_PLATFORM=$(node -e 'console.log(process.platform)')
NODE_ARCH=$(node -e 'console.log(process.arch)')
TARGET_SLUG=$NODE_PLATFORM-$NODE_ARCH
BINDINGS_PATH=./native/$TARGET_SLUG

./run ./scripts/prepublish/native/prepublish-native-package.ts \
  --bundle \
  --write \
  $BINDINGS_PATH \
  ./

cat $BINDINGS_PATH/package.json