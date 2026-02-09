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
  else
    npm publish --provenance --access public --tag experimental
  fi
popd

# publish @o1js/native meta package
META_PATH=./native/meta
META_PACKAGE_NAME=@o1js/native

pushd $META_PATH
  META_VERSION=$(cat ./package.json | jq -r .version)
  if npm view $META_PACKAGE_NAME@$META_VERSION >/dev/null 2>&1; then
    echo "$META_PACKAGE_NAME@$META_VERSION already exists. Skipping publish step."
  else
    npm publish --provenance --access public --tag experimental
  fi
popd