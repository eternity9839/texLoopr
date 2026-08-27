#!/usr/bin/env bash
# Path-aware deploy on orangepi5. Run from deploy/orangepi after artifacts are synced.
# Env:
#   TEXLOOPER_ROOT  repo root on Pi (default: parent of deploy/orangepi)
#   FORCE_APP=1    rebuild/restart app even if stamp unchanged
#   FORCE_AUTH=1
#   FORCE_API=1    rebuild/recreate Rust API
#   FORCE_PROXY=1  recreate traefik (+ crowdsec if needed)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${TEXLOOPER_ROOT:-$ROOT/../..}" && pwd)"
cd "$ROOT"

stamp() {
  local f=$1
  if [[ -f "$f" ]]; then sha256sum "$f" | awk '{print $1}'; else echo none; fi
}

need_app=0
need_auth=0
need_api=0
need_proxy=0

DIST_STAMP="$ROOT/.deploy-stamps/dist.sha"
AUTH_STAMP="$ROOT/.deploy-stamps/auth.sha"
API_STAMP="$ROOT/.deploy-stamps/api.sha"
PROXY_STAMP="$ROOT/.deploy-stamps/proxy.sha"
mkdir -p "$ROOT/.deploy-stamps"

# Aggregate stamps for trees
hash_tree() {
  # portable content fingerprint of listed paths (missing paths → empty stamp)
  local paths=()
  local p
  for p in "$@"; do
    [[ -e "$p" ]] && paths+=("$p")
  done
  if [[ ${#paths[@]} -eq 0 ]]; then
    echo none
    return 0
  fi
  find "${paths[@]}" -type f 2>/dev/null | sort | xargs -r sha256sum 2>/dev/null | sha256sum | awk '{print $1}'
}

DIST_DIR="$ROOT/app/html"
if [[ ! -d "$DIST_DIR" ]] || [[ -z "$(ls -A "$DIST_DIR" 2>/dev/null || true)" ]]; then
  echo "error: missing built SPA at $DIST_DIR (CI should rsync dist/ here)" >&2
  exit 1
fi

# Always overlay ephemeral config.js
install -m 0644 "$ROOT/app/config.js" "$DIST_DIR/config.js"

new_dist=$(hash_tree "$DIST_DIR")
new_auth=$(hash_tree "$ROOT/auth")
new_api=$(hash_tree "$REPO_ROOT/deploy/inhouse/Dockerfile.api" "$REPO_ROOT/src-tauri" "$REPO_ROOT/assets")
new_proxy=$(hash_tree "$ROOT/traefik/dynamic.yml" "$ROOT/crowdsec" "$ROOT/docker-compose.yml")

old_dist=$(cat "$DIST_STAMP" 2>/dev/null || echo "")
old_auth=$(cat "$AUTH_STAMP" 2>/dev/null || echo "")
old_api=$(cat "$API_STAMP" 2>/dev/null || echo "")
old_proxy=$(cat "$PROXY_STAMP" 2>/dev/null || echo "")

[[ "${FORCE_APP:-0}" == "1" || "$new_dist" != "$old_dist" ]] && need_app=1
[[ "${FORCE_AUTH:-0}" == "1" || "$new_auth" != "$old_auth" ]] && need_auth=1
[[ "${FORCE_API:-0}" == "1" || "$new_api" != "$old_api" ]] && need_api=1
[[ "${FORCE_PROXY:-0}" == "1" || "$new_proxy" != "$old_proxy" ]] && need_proxy=1

# Ensure key file exists for Traefik plugin
if [[ ! -f "$ROOT/traefik/crowdsec-bouncer.key" ]]; then
  if [[ -f "$ROOT/.env" ]] && grep -q '^CROWDSEC_BOUNCER_KEY=' "$ROOT/.env"; then
    umask 077
    grep '^CROWDSEC_BOUNCER_KEY=' "$ROOT/.env" | cut -d= -f2- | tr -d '\r\n' >"$ROOT/traefik/crowdsec-bouncer.key"
    chmod 600 "$ROOT/traefik/crowdsec-bouncer.key"
  else
    echo "error: missing traefik/crowdsec-bouncer.key and CROWDSEC_BOUNCER_KEY" >&2
    exit 1
  fi
fi

echo "plan: app=$need_app auth=$need_auth api=$need_api proxy=$need_proxy"

# Legacy compose project name stole :8788 after rename to texlooper — drop if present.
if docker ps -a --format '{{.Names}}' | grep -qx 'texloopr-traefik'; then
  echo "removing legacy compose project texloopr (frees 127.0.0.1:8788)"
  docker compose -p texloopr down --remove-orphans || true
fi

if [[ "$need_auth" == "1" ]]; then
  docker compose build auth
  docker compose up -d --no-deps --force-recreate auth
  echo "$new_auth" >"$AUTH_STAMP"
fi

if [[ "$need_api" == "1" ]]; then
  export TEXLOOPER_GIT_COMMIT="${TEXLOOPER_GIT_COMMIT:-$(git -C "$REPO_ROOT" rev-parse --short=7 HEAD 2>/dev/null || echo dev)}"
  export TEXLOOPER_GIT_TAG="${TEXLOOPER_GIT_TAG:-$(git -C "$REPO_ROOT" describe --tags --always 2>/dev/null || echo unknown)}"
  echo "api build identity: tag=${TEXLOOPER_GIT_TAG} commit=${TEXLOOPER_GIT_COMMIT}"
  echo "building Rust API image (first time is slow on the Pi)…"
  docker compose build api
  docker compose up -d --no-deps --force-recreate api
  echo "$new_api" >"$API_STAMP"
fi

if [[ "$need_app" == "1" ]]; then
  # Volume-mounted html — recreate app so nginx picks a clean mount (or just reload)
  docker compose up -d --no-deps --force-recreate app
  # Prefer soft reload if container already healthy
  docker exec texlooper-app nginx -s reload 2>/dev/null || true
  echo "$new_dist" >"$DIST_STAMP"
fi

if [[ "$need_proxy" == "1" ]]; then
  docker compose up -d crowdsec
  docker compose up -d --force-recreate traefik
  echo "$new_proxy" >"$PROXY_STAMP"
fi

# First boot / ensure everything is up without rebuilding images
docker compose up -d db crowdsec api app traefik

echo "smoke:"
curl -sS -o /dev/null -w "  app %{http_code}\n" http://127.0.0.1:8788/ || true
curl -sS -o /dev/null -w "  api-health (no cookie) %{http_code}\n" http://127.0.0.1:8788/v1/health || true
