#!/bin/bash
set -e

# run the build:test
npm run build:test

# find all unit tests in dist/node and run them
for f in ./dist/node/**/*.unit-test.js; do
  echo "Running $f"
  node --enable-source-maps --stack-trace-limit=1000 $f;
done
