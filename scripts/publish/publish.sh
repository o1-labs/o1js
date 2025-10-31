#!/usr/bin/env bash
set -Eeuxo pipefail

source ./scripts/lib/ux.sh
setup_script "npm-publish" "NPM publish"

./run ./scripts/publish/publish.ts --bundle --write --native-version=0.0.1 ./

info "to return to local development, use \`git checkout package.json\`"

npm publish --access public