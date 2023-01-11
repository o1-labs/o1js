#!/bin/bash
set -e
shopt -s globstar # to expand '**' into nested directories

npm run build:test

for f in ./dist/node/**/*.unit-test.js; do
  echo "Running $f"
  node $f;
done
