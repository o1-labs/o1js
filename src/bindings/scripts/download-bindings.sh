# /usr/bin/env bash
set -e
# TODO good error handleing

REV=$(git rev-parse HEAD)
RUN_ID=$(gh run list --commit "$REV" --workflow 'Build o1js' --json databaseId --jq '.[0].databaseId')

if [ -n "$RUN_ID" ]
then
  gh run watch "$RUN_ID" --exit-status || echo "Warning: ci failed on this job, trying to download bindings anyway"
  #remove if it exists but don't fail
  [ -z ".bindings_download/bindings.tar.gz" ] || rm .bindings_download/bindings.tar.gz
  gh run download "$RUN_ID" --dir .bindings_download --name=bindings.tar.gz
  tar xzf .bindings_download/bindings.tar.gz -C src/bindings --overwrite
else

fi
