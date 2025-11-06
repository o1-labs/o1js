#!/usr/bin/env bash
set -Eeuo pipefail

NODE_PLATFORM=$(node -e 'console.log(process.platform)')
NODE_ARCH=$(node -e 'console.log(process.arch)')
TARGET_SLUG=$NODE_PLATFORM-$NODE_ARCH
BINDINGS_PATH=./native/$TARGET_SLUG

PACKAGE_NAME=@o1js/native-$TARGET_SLUG

pushd $BINDINGS_PATH
  VERSION=$(cat ./package.json | jq -r .version)
  if npm view $PACKAGE_NAME@$VERSION >/dev/null 2>&1; then
    echo "$PACKAGE_NAME@$VERSION already exists. Skipping publish step."
    exit 0
  fi

  npm publish --provenance --access public --tag experimental
popd