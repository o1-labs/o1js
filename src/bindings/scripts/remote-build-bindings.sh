#!/usr/bin/env bash
set -euo pipefail

# Check if gh CLI is installed
if ! command -v gh > /dev/null; then
  echo "GitHub CLI (gh) is not installed. Please install it: https://github.com/cli/cli#installation"
  exit 1
fi

# Ensure the current commit is pushed to origin
BRANCH=$(git branch --show-current)
REMOTE_COMMIT=$(git ls-remote origin "$BRANCH" | awk '{ print $1 }')
LOCAL_COMMIT=$(git rev-parse HEAD)

if [[ "$REMOTE_COMMIT" != "$LOCAL_COMMIT" ]]; then
  echo "Your local commit is not pushed to origin."
  echo "Please run: git push origin $BRANCH"
  exit 1
fi

# Trigger the remote bindings workflow
gh workflow run remote_bindings.yml --ref "$BRANCH"

# Wait a bit to ensure the job exists
echo "⏳ Waiting for workflow to initialize..."
sleep 5

# Run the bindings download script
"$(dirname "$0")/download-bindings.sh"
