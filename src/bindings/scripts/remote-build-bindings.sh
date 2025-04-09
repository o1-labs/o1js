# /usr/bin/env bash
set -e
# TODO this runs all of ci which isn't really needed
gh workflow run build-action.yml --ref $(git branch --show-current)
REV=$(git rev-parse HEAD)
RUN_ID=$(gh run list --commit "$REV" --workflow 'Build o1js' --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status
"$(dirname "$0")"/download-bindings.sh
