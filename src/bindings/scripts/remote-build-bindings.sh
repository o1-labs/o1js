#!/usr/bin/env bash

set -euo pipefail

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$CURRENT_BRANCH" = "main" ]; then
    read -r -p "You are on the 'main' branch. Are you sure you want to run this workflow? (y/N): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "Aborted."
        exit 1
    fi
fi

gh workflow run remote_bindings.yml --ref "$CURRENT_BRANCH"
sleep 5 # wait a bit to make sure the job exists
SCRIPT_DIR=$(dirname "$0")
"$SCRIPT_DIR/download-bindings.sh"
