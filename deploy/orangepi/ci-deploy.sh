#!/usr/bin/env bash
# Path-aware deploy on orangepi5. Run from deploy/orangepi after artifacts are synced.
# Env:
#   TEXLOOPER_ROOT  repo root on Pi (default: parent of deploy/orangepi)
#   FORCE_APP=1    rebuild/restart app even if stamp unchanged
#   FORCE_AUTH=1
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
need_proxy=0

DIST_STAMP="$ROOT/.deploy-stamps/dist.sha"
AUTH_STAMP="$ROOT/.deploy-stamps/auth.sha"
PROXY_STAMP="$ROOT/.deploy-stamps/proxy.sha"
mkdir -p "$ROOT/.deploy-stamps"

# Aggregate stamps for trees
hash_tree() {
  # portable content fingerprint of listed paths
  find "$@" -type f 2>/dev/null | sort | xargs -r sha256sum 2>/dev/null | sha256sum | awk '{print $1}'
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
new_proxy=$(hash_tree "$ROOT/traefik/dynamic.yml" "$ROOT/crowdsec" "$ROOT/docker-compose.yml")

old_dist=$(cat "$DIST_STAMP" 2>/dev/null || echo "")
old_auth=$(cat "$AUTH_STAMP" 2>/dev/null || echo "")
old_proxy=$(cat "$PROXY_STAMP" 2>/dev/null || echo "")

[[ "${FORCE_APP:-0}" == "1" || "$new_dist" != "$old_dist" ]] && need_app=1
[[ "${FORCE_AUTH:-0}" == "1" || "$new_auth" != "$old_auth" ]] && need_auth=1
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

echo "plan: app=$need_app auth=$need_auth proxy=$need_proxy"

if [[ "$need_auth" == "1" ]]; then
  docker compose build auth
  docker compose up -d --no-deps --force-recreate auth
  echo "$new_auth" >"$AUTH_STAMP"
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
docker compose up -d db crowdsec auth app traefik

echo "smoke:"
curl -sS -o /dev/null -w "  login %{http_code}\n" http://127.0.0.1:8788/login || true
