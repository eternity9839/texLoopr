#!/usr/bin/env bash
# Rename release tags vX.Y.Z -> vX.Y.Z-alpha (same commits). Idempotent.
#
# Auth: set GITHUB_TOKEN, or put it in .envrc.local / .env (not gh CLI).
#
# Usage:
#   bash scripts/retag-alpha-tags.sh          # create local -alpha tags
#   bash scripts/retag-alpha-tags.sh --push   # push new tags, delete legacy on origin
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PUSH=false
if [[ "${1:-}" == "--push" ]]; then
  PUSH=true
fi

load_github_token() {
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    return 0
  fi
  for env_file in "$ROOT/.envrc.local" "$ROOT/.env"; do
    if [[ -f "$env_file" ]]; then
      # shellcheck disable=SC1090
      set -a
      source "$env_file"
      set +a
      if [[ -n "${GITHUB_TOKEN:-}" ]]; then
        echo "Using GITHUB_TOKEN from ${env_file##*/}"
        return 0
      fi
    fi
  done
  return 1
}

git_push_target() {
  local remote="${1:-origin}"
  if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    printf '%s\n' "$remote"
    return 0
  fi
  local url owner repo
  url="$(git remote get-url "$remote")"
  if [[ "$url" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
    owner="${BASH_REMATCH[1]}"
    repo="${BASH_REMATCH[2]}"
    printf 'https://x-access-token:%s@github.com/%s/%s.git\n' \
      "$GITHUB_TOKEN" "$owner" "$repo"
    return 0
  fi
  printf '%s\n' "$remote"
}

mapfile -t LEGACY_TAGS < <(
  git tag -l 'v*' | grep -Ev -- '-alpha$' | sort -V
)

if ((${#LEGACY_TAGS[@]} == 0)); then
  echo "No legacy tags without -alpha suffix."
  exit 0
fi

echo "Migrating ${#LEGACY_TAGS[@]} tag(s) to -alpha suffix:"
for tag in "${LEGACY_TAGS[@]}"; do
  base="${tag#v}"
  new="v${base}-alpha"
  commit="$(git rev-parse "${tag}^{commit}")"

  if git rev-parse -q --verify "refs/tags/${new}" >/dev/null; then
    existing="$(git rev-parse "${new}^{commit}")"
    if [[ "$existing" != "$commit" ]]; then
      echo "error: ${new} exists on different commit (${existing} vs ${commit})" >&2
      exit 1
    fi
    echo "  ok  ${new} already points at ${commit:0:7}"
  else
    git tag "$new" "$commit"
    echo "  tag ${tag} -> ${new} @ ${commit:0:7}"
  fi
done

if [[ "$PUSH" != true ]]; then
  echo
  echo "Local -alpha tags ready. Re-run with --push to update origin."
  exit 0
fi

if ! load_github_token; then
  echo "error: GITHUB_TOKEN not set (export it or add to .envrc.local / .env)" >&2
  exit 1
fi

PUSH_TARGET="$(git_push_target origin)"
echo
echo "Pushing -alpha tags to origin…"
for tag in "${LEGACY_TAGS[@]}"; do
  base="${tag#v}"
  new="v${base}-alpha"
  git push "$PUSH_TARGET" "refs/tags/${new}"
done

echo "Removing legacy tags from origin…"
for tag in "${LEGACY_TAGS[@]}"; do
  git push "$PUSH_TARGET" ":refs/tags/${tag}" || true
  git tag -d "$tag" 2>/dev/null || true
done

echo "Done."
