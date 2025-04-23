#!/usr/bin/env bash

set -e

"$(dirname "$0")"/build-o1js-node-artifacts.sh

npm run dev
