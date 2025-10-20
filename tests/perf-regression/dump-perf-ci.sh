#!/usr/bin/env bash
set -euo pipefail

WF_FILE="dump-perf-baseline.yml"
BRANCH="main"

echo "Triggering '$WF_FILE' on $BRANCH to dump and commit the performance baseline..."
gh workflow run "$WF_FILE" -r "$BRANCH"

echo "Dispatched. Pull when the run finishes:"
echo "  git pull origin $BRANCH"
