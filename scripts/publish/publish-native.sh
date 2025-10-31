#!/usr/bin/env bash
set -Eeuxo pipefail

source ./scripts/lib/ux.sh
setup_script "npm-publish-native" "NPM publish native"

NODE_PLATFORM=$(node -e 'console.log(process.platform)')
NODE_ARCH=$(node -e 'console.log(process.arch)')
TARGET_SLUG=$NODE_PLATFORM-$NODE_ARCH
BINDINGS_PATH=./native/$TARGET_SLUG

./run ./scripts/publish/publish-native.ts --bundle --write --native-version=0.0.2 $BINDINGS_PATH

pushd $BINDINGS_PATH
npm publish --access public
popd