#!/bin/bash

set -e

DIR_PATH=$(dirname "$0")

./${DIR_PATH}/build-snarkyjs-node-artifacts.sh
npm run --prefix="$SNARKY_JS_PATH" dev
