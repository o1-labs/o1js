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

# generate and prepublish the @o1js/native meta package
META_PATH=./native/meta
mkdir -p $META_PATH

cat > $META_PATH/package.json <<EOF
{
  "name": "@o1js/native",
  "version": "0.0.0",
  "description": "Native bindings for o1js. Install alongside o1js to enable the native backend.",
  "optionalDependencies": {
    "@o1js/native-darwin-arm64": "0.0.0",
    "@o1js/native-darwin-x64": "0.0.0",
    "@o1js/native-linux-arm64": "0.0.0",
    "@o1js/native-win32-x64": "0.0.0"
  }
}
EOF

./run ./scripts/prepublish/native/prepublish-native-package.ts \
  --write \
  $META_PATH \
  ./

cat $META_PATH/package.json
