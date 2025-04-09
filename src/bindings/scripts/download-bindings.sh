# /usr/bin/env bash
set -e
# TODO good error handleing

REV=$(git rev-parse HEAD)
RUN_ID=$(gh run list --commit "$REV" --workflow 'Build bindings' --json databaseId --jq '.[0].databaseId')

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
#remove if it exists but don't fail
[ -z ".bindings_download/bindings.tar.gz" ] || rm .bindings_download/bindings.tar.gz
gh run download "$RUN_ID" --dir .bindings_download --name=bindings.tar.gz
tar xzf .bindings_download/bindings.tar.gz -C src/bindings --overwrite
