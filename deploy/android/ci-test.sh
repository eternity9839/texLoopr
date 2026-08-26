#!/usr/bin/env bash
# CI: typecheck + vitest in the default Nix devShell (before any APK work).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

nix develop -c bash -c '
  set -euo pipefail
  npm ci
  npm run typecheck
  npm run test
'
