#!/usr/bin/env bash
FIX_BRANCH="$(git branch --show-current)-ci-fix"
git merge $FIX_BRANCH
git branch -D $FIX_BRANCH
git push origin --delete $FIX_BRANCH
