#!/usr/bin/env bash

set -e

MINA_PATH="src/mina"

BUILT=$(sed 's/.* //' src/bindings/"${MINA_COMMIT}")

pushd "${MINA_PATH}"
  MINA_COMMIT=$(git rev-parse HEAD)
popd

if [ "${BUILT}" != "${MINA_COMMIT}" ]
then
  echo mina is on "${MINA_COMMIT}" but bindings were built for "${BUILT}"
  exit 1
fi
