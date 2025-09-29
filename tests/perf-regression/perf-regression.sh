#!/usr/bin/env bash
set -euo pipefail

# Forward the first arg (--dump or --check)
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 [--dump|--check]"
  exit 1
fi

MODE=$1

# Run ZkProgram perf regression tests with STOP_AFTER controls
STOP_AFTER=2 ./run src/examples/crypto/sha256/run.ts --bundle "$MODE"
STOP_AFTER=4 ./run src/examples/crypto/ecdsa/run.ts --bundle "$MODE"
STOP_AFTER=2 ./run src/examples/crypto/blake2b/run.ts --bundle "$MODE"
STOP_AFTER=2 ./run src/examples/crypto/rsa/run.ts --bundle "$MODE"
# STOP_AFTER=3 ./run tests/vk-regression/diverse-zk-program-run.ts --bundle "$MODE"

# Run CS + zkApps perf regression tests
./run tests/perf-regression/perf-regression.ts --bundle "$MODE"
