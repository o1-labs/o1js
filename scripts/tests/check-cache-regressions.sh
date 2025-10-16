#!/usr/bin/env bash
set -Eeuxo pipefail

source ./scripts/lib/ux.sh

# test cache regression packaging and unpackaging primitives here
./run ./src/tests/cache/simple-regression.ts --bundle --mode dump --tarball ./tests/test-artifacts/cache/simple-regression.tar.gz

./run ./src/tests/cache/simple-regression.ts --bundle --mode check --tarball ./tests/test-artifacts/cache/simple-regression.tar.gz

# This pin is generated in ./dump-cache-regressions.sh
ARTIFACT_PIN=2025-10-14T13:40:45-04:00

WORKDIR=tests/test-artifacts/cache/
mkdir -p $WORKDIR

# Download all the artifacts into the workdir
gcloud storage cp --recursive gs://o1js-ci/tests/cache/fixtures/$ARTIFACT_PIN/ $WORKDIR

WORKDIR=tests/test-artifacts/cache/$ARTIFACT_PIN

# Regression checks
./run ./src/tests/cache/simple-regression.ts --bundle --mode check --tarball $WORKDIR/simple-regression.tar.gz
./run ./src/tests/cache/complex-regression.ts --bundle --mode check --tarball $WORKDIR/complex-regression.tar.gz
./run ./src/tests/cache/rsa-regression.ts --bundle --keep --mode check --tarball $WORKDIR/rsa-regression.tar.gz

echo "Artifacts checked successfully!"