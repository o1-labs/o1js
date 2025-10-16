#!/usr/bin/env bash
set -Eeuxo pipefail

source ./scripts/lib/ux.sh

ARTIFACT_PIN=$(date -Iseconds)

WORKDIR=tests/test-artifacts/cache/$ARTIFACT_PIN/
mkdir -p $WORKDIR

./run ./src/tests/cache/simple-regression.ts --bundle --mode dump --tarball $WORKDIR/simple-regression.tar.gz
./run ./src/tests/cache/complex-regression.ts --bundle --keep --mode dump --tarball $WORKDIR/complex-regression.tar.gz
./run ./src/tests/cache/rsa-regression.ts --bundle --keep --mode dump --tarball $WORKDIR/rsa-regression.tar.gz
./run ./src/tests/cache/sideloading-regression.ts --bundle --keep --mode dump --tarball $WORKDIR/sideloading-regression.tar.gz

gcloud storage cp --recursive $WORKDIR gs://o1js-ci/tests/cache/fixtures/

echo "Uploaded artifacts to: ($ARTIFACT_PIN)"