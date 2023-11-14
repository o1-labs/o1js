#!/bin/bash
set -e
shopt -s globstar # to expand '**' into nested directories

for f in ./src/**/*.test.ts; do
  NODE_OPTIONS=--experimental-vm-modules npx jest $f;
done