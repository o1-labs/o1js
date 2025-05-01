#!/usr/bin/env bash
set -euo pipefail

# Check if gh CLI is installed
if ! command -v gh > /dev/null; then
  echo "ERROR: GitHub CLI (gh) is not installed."
  echo "       Please install it: https://github.com/cli/cli#installation"
  exit 1
fi

# Check for uncommitted changes
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: You have uncommitted changes."
  echo "       Please commit or stash them before continuing."
  exit 2
fi


# Ensure the current commit is pushed to origin
BRANCH=$(git branch --show-current)
REMOTE_COMMIT=$(git ls-remote origin "$BRANCH" | awk '{ print $1 }')
LOCAL_COMMIT=$(git rev-parse HEAD)

if [[ "$REMOTE_COMMIT" != "$LOCAL_COMMIT" ]]; then
  echo "ERROR: Your local commit is not pushed to origin."
  echo "       Please run: git push origin $BRANCH"
  exit 3
fi

# Trigger the remote bindings workflow
gh workflow run remote_bindings.yml --ref "$BRANCH"

# Wait a bit to ensure the job exists
sleep 5

# Run the bindings download script
"$(dirname "$0")/download-bindings.sh"
