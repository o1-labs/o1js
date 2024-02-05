#!/usr/bin/env bash
set -e
shopt -s globstar # to expand '**' into nested directories./

npm run build

# find all unit tests in dist/node and run them
# TODO it would be nice to make this work on Mac
# here is a first attempt which has the problem of not failing if one of the tests fails
# find ./dist/node -name "*.unit-test.js" -print -exec node {} \;
for f in ./dist/node/**/*.unit-test.js; do
  echo "Running $f"
  node --enable-source-maps --stack-trace-limit=1000 $f;
done
