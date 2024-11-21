#!/bin/bash

set -eu

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <target-branch>"
  exit 1
fi

cd src/mina

git fetch --depth=1 origin $1

CURR=$(git rev-parse HEAD)

BRANCH=$1

function in_branch {
  if git rev-list origin/$1 | grep -q $CURR; then
    echo "Mina submodule commit is an ancestor of $1"
    true
  else
    false
  fi
}

if (! in_branch ${BRANCH}); then
  echo "Mina submodule commit is NOT an ancestor of ${BRANCH} branch"
  exit 1
fi