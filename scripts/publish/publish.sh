#!/usr/bin/env bash
set -Eeuxo pipefail

source ./scripts/lib/ux.sh
setup_script "npm-publish" "NPM publish"

./run ./scripts/publish/publish.ts --native-version=0.0.1 ./package.json

npm publish --access public