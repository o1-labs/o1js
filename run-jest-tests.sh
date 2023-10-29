#!/bin/bash
set -e
shopt -s globstar # to expand '**' into nested directories

for f in ./src/**/*.test.ts; do
  # TODO: Remove this once we remove the `snarkyjs` inside the mina repo
  if [[ $f != *"src/mina"* ]]; then
    NODE_OPTIONS=--experimental-vm-modules npx jest $f;
  fi
done