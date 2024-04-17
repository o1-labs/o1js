#!/bin/bash

# CHANGELOG Update Script for New Releases
#
# This script automates the process of updating the CHANGELOG.md in response to new releases.
# It performs the following actions:
# 
# 1. Identifies the latest version number in the CHANGELOG (following semantic versioning).
# 2. Increments the patch segment of the version number for the new release.
# 3. Retrieves the current Git commit hash and truncates it for brevity.
# 4. Captures the current date in YYYY-MM-DD format.
# 5. Updates the CHANGELOG.md file:
#    - Adds a new entry for the upcoming release using the incremented version number and the current date.
#    - Updates the link for the [Unreleased] section to point from the current commit to HEAD.
#
# Usage:
# It should be run in the root directory of the repository where the CHANGELOG.md is located.
# Ensure that you have the necessary permissions to commit and push changes to the repository.

# Step 1: Capture the latest version
latest_version=$(grep -oP '\[\K[0-9]+\.[0-9]+\.[0-9]+(?=\])' CHANGELOG.md | head -1)
echo "Latest version: $latest_version"

# Step 2: Bump the patch version
IFS='.' read -r -a version_parts <<< "$latest_version"
let version_parts[2]+=1
new_version="${version_parts[0]}.${version_parts[1]}.${version_parts[2]}"
echo "New version: $new_version"

# Step 3: Capture the current git commit and truncate it to the first 9 characters
current_commit=$(git rev-parse HEAD | cut -c 1-9)
echo "Current commit: $current_commit"

# Step 4: Capture the current date in YYYY-MM-DD format
current_date=$(date +%Y-%m-%d)
echo "Current date: $current_date"

# Step 5: Update the CHANGELOG
sed -i "s/\[Unreleased\](.*\.\.\.HEAD)/\[Unreleased\](https:\/\/github.com\/o1-labs\/o1js\/compare\/$current_commit...HEAD)\n\n## \[$new_version\](https:\/\/github.com\/o1-labs\/o1js\/compare\/1ad7333e9e...$current_commit) - $current_date/" CHANGELOG.md
