#!/usr/bin/env bash
set -e
shopt -s globstar # to expand '**' into nested directories

if ! [ -f ./mina-signer/dist ]
then
  pushd src/mina-signer
    npm run build
  popd
fi

for f in ./src/**/*.test.ts; do
  NODE_OPTIONS=--experimental-vm-modules npx jest $f;
done
