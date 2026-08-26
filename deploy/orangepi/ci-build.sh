#!/usr/bin/env bash
# CI: install deps, gate on typecheck + tests, then Vite dist (ephemeral hosted config).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

nix develop -c bash -c '
  set -euo pipefail
  npm ci
  npm run typecheck
  npm run test
  npm run build
'
cp deploy/orangepi/app/config.js dist/config.js
