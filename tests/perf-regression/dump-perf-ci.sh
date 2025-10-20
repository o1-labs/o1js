#!/usr/bin/env bash
set -euo pipefail

WF_FILE="dump-perf-baseline.yml"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

echo "🚀 Triggering '$WF_FILE' on branch '$BRANCH' to dump and commit the performance baseline..."
gh workflow run "$WF_FILE" -r "$BRANCH"

echo ""
echo "✅ Workflow dispatched. Once it finishes, pull the updated baseline with:"
echo "   git pull origin '$BRANCH'"
