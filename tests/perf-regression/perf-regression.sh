#!/usr/bin/env bash
set -euo pipefail

# Forward the first arg (--dump or --check)
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 [--dump|--check]"
  exit 1
fi

MODE=$1

# Run ZkProgram performance regression tests
./run src/examples/crypto/sha256/run.ts --bundle "$MODE"
./run src/examples/crypto/ecdsa/run.ts --bundle "$MODE"
./run src/examples/crypto/blake2b/run.ts --bundle "$MODE"
./run src/examples/crypto/rsa/run.ts --bundle "$MODE"

./run src/examples/zkprogram/mutual-recursion.ts --bundle "$MODE"
./run src/examples/zkprogram/hash-chain.ts --bundle "$MODE"
./run src/examples/zkprogram/gadgets.ts --bundle "$MODE"
./run src/examples/zkprogram/side-loading/run.ts --bundle "$MODE"
./run src/examples/zkprogram/runtime-table/run.ts --bundle "$MODE"
./run src/examples/zkprogram/program-small-big.ts --bundle "$MODE"

# Run CS + zkApps performance regression tests
./run tests/perf-regression/perf-regression.ts --bundle "$MODE"
