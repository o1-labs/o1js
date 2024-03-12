#!/usr/bin/env bash
set -e

echo ""
echo "Running o1js benchmarks."
echo ""

./run benchmarks/ecdsa.ts --bundle >>benchmarks.log 2>&1
