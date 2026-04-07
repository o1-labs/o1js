#!/usr/bin/env bash
set -euo pipefail

bundle_path="${1:-.tmp-zkfunction-kimchi-bundle.json}"

case "$bundle_path" in
  /*) bundle_abs_path="$bundle_path" ;;
  *) bundle_abs_path="$(pwd)/$bundle_path" ;;
esac

node src/build/run.js src/tests/zkfunction-kimchi-bundle.ts "$bundle_path"

ZKFUNCTION_KIMCHI_BUNDLE="$bundle_abs_path" cargo test \
  --manifest-path src/mina/src/lib/crypto/proof-systems/Cargo.toml \
  -p kimchi \
  --test zkfunction_bundle \
  -- \
  --ignored \
  --nocapture
