#!/usr/bin/env bash
set -e

echo ""
echo "Running o1js benchmarks."
echo ""

./run benchmark/runners/init.ts --bundle >>benchmarks.log 2>&1
./run benchmark/runners/simple.ts --bundle >>benchmarks.log 2>&1
