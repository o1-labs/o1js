# /usr/bin/env bash
set -e
gh workflow run build-bindings.yml --ref $(git branch --show-current)
sleep 5 # wait a bit to make sure the job exists
"$(dirname "$0")"/download-bindings.sh
