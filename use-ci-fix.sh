#!/usr/bin/env bash
set -e
FIX_BRANCH="$(git branch --show-current)-ci-fix"
git fetch origin $FIX_BRANCH
git merge origin/$FIX_BRANCH
git branch -D $FIX_BRANCH
git push origin --delete $FIX_BRANCH
