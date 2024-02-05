#!/usr/bin/env bash
set -e

cp index.cjs dist/node/mina-signer/index.cjs
cp index.d.ts dist/node/mina-signer/index.d.ts

npx esbuild --bundle --minify dist/node/mina-signer/index.cjs --outfile=./dist/node/mina-signer/index.cjs --format=cjs --target=es2021 --platform=node --allow-overwrite=true
