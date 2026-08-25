#!/usr/bin/env bash
# CI build: Nix devShell + Vite dist (ephemeral hosted config overlay).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

nix develop -c bash -c 'npm ci && npm run build'
cp deploy/orangepi/app/config.js dist/config.js
