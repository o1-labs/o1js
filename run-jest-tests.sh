#!/usr/bin/env bash
set -e

if ! [ -f ./mina-signer/dist ]
then
  pushd src/mina-signer
    npm run build
  popd
fi

while IFS= read -r -d '' f; do
  NODE_OPTIONS=--experimental-vm-modules npx jest "$f"
done < <(find ./src -name "*.test.ts" -print0)
