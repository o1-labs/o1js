#!/usr/bin/env bash
set -e

npm run build

# find all unit tests in dist/node and run them
while IFS= read -r -d '' f; do
  echo "Running $f"
  node --enable-source-maps --stack-trace-limit=1000 "$f"
done < <(find ./dist/node -name "*.unit-test.js" -print0)
