#!/bin/bash

set -eu

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <target-branch>"
  exit 1
fi
echo "1"
cd src/mina

git fetch --depth=1 origin $1
echo "2"

CURR=$(git rev-parse HEAD)
echo "3"

BRANCH=$1
echo "4"

function in_branch {
  echo $1
  if git rev-list origin/compatible | grep -q $CURR; then
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