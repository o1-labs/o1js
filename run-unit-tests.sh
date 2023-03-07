#!/bin/bash
set -ex

# run the build:test
npm run build:test

# find all unit tests in dist/node and run them
find ./dist/node -name "*.unit-test.js" -print -exec node {} \;
