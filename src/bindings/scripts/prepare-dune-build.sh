#!/usr/bin/env bash

# use this script before you can run `dune build <something>`

set -e

MINA_PATH="src/mina"

# Copy mina config files, that is necessary for o1js to build
dune b "${MINA_PATH}"/src/config.mlh && \
cp "${MINA_PATH}"/src/config.mlh src && \
cp -r "${MINA_PATH}"/src/config src/config
