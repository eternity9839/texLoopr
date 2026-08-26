#!/usr/bin/env bash
# Push devShell closure to Attic (best-effort; never fails the deploy job).
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [[ -z "${ATTIC_TOKEN:-}" ]]; then
  echo "ATTIC_TOKEN not set — skip push"
  exit 0
fi
: "${ATTIC_CACHE:?}"
: "${ATTIC_URL:?}"

ATTIC="${ATTIC_BIN:-attic}"
system="$(nix eval --impure --raw --expr 'builtins.currentSystem')" || {
  echo "warn: could not resolve currentSystem — skip attic push"
  exit 0
}

if ! "$ATTIC" login qnap "$ATTIC_URL" "$ATTIC_TOKEN"; then
  echo "warn: attic login failed — skip push (token or URL may be wrong)"
  exit 0
fi
"$ATTIC" cache create "$ATTIC_CACHE" 2>/dev/null || true
"$ATTIC" use "$ATTIC_CACHE" 2>/dev/null || true

mapfile -t path_list < <(nix path-info -r ".#devShells.${system}.default" 2>&1) || true
# Filter out non-store lines (nix may print errors to stdout in some cases)
paths=()
for line in "${path_list[@]+"${path_list[@]}"}"; do
  [[ "$line" == /nix/store/* ]] && paths+=("$line")
done
if [[ ${#paths[@]} -eq 0 ]]; then
  echo "no devShell store paths to push (nix path-info returned nothing usable)"
  exit 0
fi

echo "pushing ${#paths[@]} path(s) to ${ATTIC_CACHE} on ${ATTIC_URL}"
if ! "$ATTIC" push "$ATTIC_CACHE" "${paths[@]}"; then
  echo "warn: attic push failed — continuing deploy"
  exit 0
fi
