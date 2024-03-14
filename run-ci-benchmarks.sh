#!/usr/bin/env bash
set -e

echo ""
echo "Running o1js benchmarks."
echo ""

./run benchmark/runners/with-cloud-history.ts --bundle >>benchmarks.log 2>&1
