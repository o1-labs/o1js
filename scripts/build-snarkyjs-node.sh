#!/bin/bash

set -e

$(dirname "$0")/build-snarkyjs-node-artifacts.sh

npm run --prefix="src/lib/snarkyjs" dev
