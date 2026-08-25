#!/usr/bin/env bash
# Push devShell closure to Attic (best-effort; requires ATTIC_TOKEN + attic client login).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

: "${ATTIC_CACHE:?}"
: "${ATTIC_TOKEN:?}"

ATTIC="${ATTIC_BIN:-attic}"
system="$(nix eval --impure --raw --expr 'builtins.currentSystem')"

"$ATTIC" login qnap "${ATTIC_URL:?}" "$ATTIC_TOKEN" 2>/dev/null || true
"$ATTIC" cache create "$ATTIC_CACHE" 2>/dev/null || true
"$ATTIC" use "$ATTIC_CACHE" 2>/dev/null || true

paths="$(
  nix path-info -r ".#devShells.${system}.default" 2>/dev/null \
    | tr '\n' ' ' \
    | sed 's/ $//'
)"
if [[ -z "$paths" ]]; then
  echo "no devShell paths to push"
  exit 0
fi

echo "pushing devShell paths to ${ATTIC_CACHE} on ${ATTIC_URL}"
# shellcheck disable=SC2086
"$ATTIC" push "$ATTIC_CACHE" $paths
