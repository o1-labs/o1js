#!/usr/bin/env bash
REV=$(git rev-parse HEAD)
RUN_ID=$(gh run list --commit "$REV" --workflow 'Build o1js' --json databaseId --jq '.[0].databaseId')

[ -z ".bindings_download/bindings.tar.gz" ] || rm .bindings_download/bindings.tar.gz
gh run download "$RUN_ID" --dir .bindings_download --name=bindings.tar.gz
tar xzf .bindings_download/bindings.tar.gz -C src/bindings --overwrite
