#!/usr/bin/env bash
# Usage: released-version.sh <version before semantic-release>
#
# Run after semantic-release, in the repository. package.json's version
# changes only when it released, so only then does this write `version` and
# `major` to $GITHUB_OUTPUT, for moving the major tag. Users take these
# actions by that tag, so an unreleased change must never reach it.
set -euo pipefail

before=$1
version=$(node -p "require('./package.json').version")
if [ "$version" = "$before" ]; then
  echo "No release: v${version%%.*} stays where it is."
  exit 0
fi
echo "Released $version."
echo "version=$version" >> "$GITHUB_OUTPUT"
echo "major=${version%%.*}" >> "$GITHUB_OUTPUT"
