#!/usr/bin/env bash
set -e

tsc -p ../../tsconfig.mina-signer-web.json
node moveWebFiles.js
npx esbuild --bundle --minify dist/tmp/mina-signer/mina-signer.js --outfile=./dist/web/index.js --format=esm --target=es2021
npx rimraf dist/tmp
