#!/usr/bin/env bash

set -euo pipefail

# Check if GitHub CLI (gh) is installed
if ! command -v gh >/dev/null 2>&1; then
  echo "Please install the GitHub CLI tool: https://github.com/cli/cli#installation"
  exit 1
fi

# Get the current commit hash, allow overriding with $REV
REV="${REV:-$(git rev-parse HEAD)}"

# Get the run ID for relevant CI jobs
RUN_ID=$(gh run list --commit "$REV" --json name,databaseId |
  jq -r '.[] | select(.name == "Checks" or .name == "Build and upload bindings") | .databaseId')

# Exit if no relevant run was found
if [ -z "$RUN_ID" ]; then
  echo "Bindings have not been built for this commit."
  echo "You may want to:"
  echo " - Switch to a commit where they have been built"
  echo " - Trigger a remote build with: npm run build:bindings-remote"
  echo " - Open a PR and run CI"
  echo " - Push your latest commit if you're running remote-build"
  exit 1
fi

# Wait for CI job to complete, warn if it failed
if ! gh run watch "$RUN_ID" --exit-status; then
  echo "Warning: CI failed on this job, trying to download bindings anyway"
fi

# Clean up previous bindings archive if it exists
BINDINGS_ARCHIVE=".bindings_download/bindings.tar.gz"
if [ -f "$BINDINGS_ARCHIVE" ]; then
  rm -f "$BINDINGS_ARCHIVE"
fi

# Download bindings artifact
gh run download "$RUN_ID" --dir .bindings_download --name=bindings.tar.gz

# Remove any old bindings
rm -f src/bindings/mina-transaction/gen/*/*.ts src/bindings/mina-transaction/gen/*/*.js

# Extract new bindings
tar -xf "$BINDINGS_ARCHIVE" -C src/bindings
