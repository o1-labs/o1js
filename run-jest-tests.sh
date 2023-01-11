#!/bin/bash
set -e

for f in ./src/**/*.test.ts; do
  NODE_OPTIONS=--experimental-vm-modules npx jest $f;
done
