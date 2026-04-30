#!/usr/bin/env bash
set -Eeuo pipefail

source ./scripts/lib/ux.sh
setup_script "prepublish-native" "prepublish native"

./run ./scripts/prepublish/prepublish-native.ts --bundle --write ./