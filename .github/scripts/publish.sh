#!/usr/bin/env bash
# Creates the release for the package.json version if missing, then attaches files from ./out (idempotent).
set -euo pipefail
VER="v$(node -p "require('./package.json').version")"
(cd out && sha256sum * > "SHA256SUMS-$(ls | head -1 | sed 's/[^A-Za-z0-9]/_/g').txt")
if ! gh release view "$VER" --repo "$REPO" >/dev/null 2>&1; then
  gh release create "$VER" --repo "$REPO" --target "$SHA" --title "Bunnys Invoice Generator $VER" --generate-notes || sleep 5
fi
gh release upload "$VER" out/* --repo "$REPO" --clobber
