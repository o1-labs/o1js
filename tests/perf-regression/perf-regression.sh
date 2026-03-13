#!/usr/bin/env bash
set -euo pipefail

# Usage: perf-regression.sh [--dump|--check] [--file <path>]
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 [--dump|--check] [--file <path>]"
  exit 1
fi

MODE=$1
shift

# Collect remaining args (e.g. --file <path>) to forward to each test
EXTRA_ARGS=("${@}")

# Run ZkProgram performance regression tests
./run src/examples/crypto/sha256/run.ts --bundle "$MODE" ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}
./run src/examples/crypto/ecdsa/run.ts --bundle "$MODE" ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}
./run src/examples/crypto/blake2b/run.ts --bundle "$MODE" ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}
./run src/examples/crypto/rsa/run.ts --bundle "$MODE" ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}

./run src/examples/zkprogram/mutual-recursion.ts --bundle "$MODE" ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}
./run src/examples/zkprogram/hash-chain.ts --bundle "$MODE" ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}
./run src/examples/zkprogram/gadgets.ts --bundle "$MODE" ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}
./run src/examples/zkprogram/side-loading/run.ts --bundle "$MODE" ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}
./run src/examples/zkprogram/runtime-table/run.ts --bundle "$MODE" ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}
./run src/examples/zkprogram/small-big/run.ts --bundle "$MODE" ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}

# Run CS + zkApps performance regression tests
./run tests/perf-regression/perf-regression.ts --bundle "$MODE" ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}
