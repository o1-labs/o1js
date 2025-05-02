#!/usr/bin/env bash

set -e

(which gh > /dev/null 2>&1) || (echo "Please install gh the github cli tool: https://github.com/cli/cli#installation" && exit 1)

REV=${REV:=$(git rev-parse HEAD)}
RUN_ID=$( \
    gh run list --commit "${REV}" --json name,databaseId | \
    jq -r '.[] | select(.name == "Checks" or .name == "Build and upload bindings") | .databaseId' \
  )

if [ -z "$RUN_ID" ]
then
  echo bindings have not been built for this commit
  echo you may want to:
  echo - switch to a commit where they have been built
  echo - trigger a remote build with npm run build:bindings-remote
  echo - open a pr and run ci
  echo - if you are running remote-build you may not have pushed your latest commit
  exit 1
fi

gh run watch "$RUN_ID" --exit-status || echo "Warning: ci failed on this job, trying to download bindings anyway"
# remove if it exists but don't fail
if [ -f ".bindings_download/bindings.tar.gz" ]; then
  rm .bindings_download/bindings.tar.gz
fi
gh run download "$RUN_ID" --dir .bindings_download --name=bindings.tar.gz
# remove any old bindings
rm -f src/bindings/mina-transaction/gen/*/*.ts src/bindings/mina-transaction/gen/*/*.js
tar -xf .bindings_download/bindings.tar.gz -C src/bindings
