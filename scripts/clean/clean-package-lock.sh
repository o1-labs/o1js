#!/usr/bin/env bash
# Strip the gitignored, locally-built native/<platform> packages out of
# package-lock.json WITHOUT changing any dependency versions.
#
# `npm run build:native` produces a local @o1js/native-<platform> package
# (version 0.0.0, os/cpu-locked) under ./native/<slug>/. A subsequent `npm
# install` records it in the lockfile as an `extraneous` "native/<slug>" entry.
# On another platform `npm ci` then tries to install e.g.
# @o1js/native-darwin-arm64 and fails with EBADPLATFORM (this breaks linux CI).
# Only the registry @o1js/native-* packages (optional: true) belong in the lock.
#
# This deletes just those `native/<slug>` lockfile entries. It deliberately does
# NOT `rm package-lock.json` + reinstall: that would re-resolve every ^/~ range
# to its newest version (e.g. typescript 5.4 -> 5.9) and break unrelated builds.
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT"

echo "stripping local native/* entries from package-lock.json..."
node -e '
  const fs = require("fs");
  const l = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
  let removed = [];
  for (const k of Object.keys(l.packages ?? {})) {
    if (/^native\//.test(k)) { delete l.packages[k]; removed.push(k); }
  }
  fs.writeFileSync("package-lock.json", JSON.stringify(l, null, 2) + "\n");
  console.log(removed.length ? "removed: " + removed.join(", ") : "nothing to strip");
'

# fail loudly if anything local-native remains
if grep -Eq '"native/[a-z0-9_-]+":|"extraneous": true' package-lock.json; then
  echo "ERROR: package-lock.json still references local native/* packages:" >&2
  grep -nE '"native/[a-z0-9_-]+":|"extraneous": true' package-lock.json | head >&2
  exit 1
fi

# sanity: lockfile must still satisfy the npm ci sync check (the gate CI runs)
echo "verifying npm ci sync..."
npm ci --dry-run >/dev/null
echo "package-lock.json cleaned (no native/* leak, versions unchanged, npm-ci-consistent)"
