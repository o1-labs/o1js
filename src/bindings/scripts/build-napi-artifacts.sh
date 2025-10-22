#!/usr/bin/env bash
set -Eeuo pipefail

source ./scripts/lib/ux.sh

setup_script build-napi-artifacts "Build NAPI artifacts"

BUILD_PATH=./_build/napi
OUTDIR=./src/bindings/native

rm -rf $BUILD_PATH/
mkdir -p $BUILD_PATH/

# must set target on build command, not in config
# to support more architectures, call this script with TARGETS set:
# TARGETS='aarch64-apple-darwin aarch64-unknown-linux-gnu' ./src/bindings/scripts/build-napi-artifacts.sh
if [ -z "${TARGETS[*]:-}" ]; then
  TARGETS=($(rustc -vV | sed -n 's|host: ||p'))
fi

info "running NAPI workflow..."
# package.json requires an empty napi config because of napi-cli
# do not use --target-dir option, doesn't work
# dts is set by default
# set DEBUG="napi:*" to get verbose output
for target in ${TARGETS[@]}; do
  napi build \
    --manifest-path ./src/mina/src/lib/crypto/proof-systems/Cargo.toml \
    --package plonk-napi \
    --config-path ./src/bindings/scripts/build-napi.config.json \
    --output-dir $BUILD_PATH \
    --release \
    --platform \
    --target $target \
    --esm
done

# we could write our own .d.ts file and our own index.js for arch-selection logic, but we're gonna use the one that napi-rs provides

ok "NAPI workflow succeeded"

info "copying artifacts..."

cp -v $BUILD_PATH/index.d.ts $OUTDIR/index.d.ts
cp -v $BUILD_PATH/index.js $OUTDIR/index.js
cp -v $BUILD_PATH/*.node $OUTDIR/

ok "Artifacts copied into place"