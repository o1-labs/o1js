#!/usr/bin/env bash
set -e

npm run dev

./run src/tests/inductive-proofs-small.ts --bundle
