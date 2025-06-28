#!/bin/bash
# Script to benchmark the actual OCaml Snarky implementation

echo "Building o1js with bindings..."
npm run build:bindings-download || npm run build:bindings

echo "Running benchmark..."
node --max-old-space-size=4096 ./run tests/benchmarks/poseidon-benchmark.ts