#!/usr/bin/env bash
# Deploy to orangepi5 over Tailscale SSH (no deploy key). Requires prior tailscale/github-action step.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOST="${DEPLOY_HOST:-orangepi5}"
USER="${DEPLOY_USER:-orangepi}"
REMOTE="${REMOTE:-/home/orangepi/src/texLoopr}"
RSYNC_RSH="${ROOT}/deploy/orangepi/rsync-ts-ssh.sh"

cd "$ROOT"
chmod +x "$RSYNC_RSH"

ts_ssh() {
  # Retry: ephemeral CI peers can take a moment to appear in the Pi's netmap.
  local attempt=1
  local max=8
  local delay=5
  while true; do
    if tailscale ssh "${USER}@${HOST}" -- "$@"; then
      return 0
    fi
    if (( attempt >= max )); then
      echo "error: tailscale ssh ${USER}@${HOST} failed after ${max} attempts" >&2
      echo "--- diagnostics ---" >&2
      tailscale status || true
      tailscale ping -c 3 "${HOST}" || true
      return 1
    fi
    echo "warn: tailscale ssh attempt ${attempt}/${max} failed; retry in ${delay}s" >&2
    sleep "${delay}"
    attempt=$((attempt + 1))
    delay=$((delay + 3))
  done
}

echo "waiting for ${HOST} on tailnet…"
tailscale ping -c 5 "${HOST}" || true
tailscale status | head -40 || true

ts_ssh "mkdir -p ${REMOTE}/deploy/orangepi/app/html"

# rsync destination as host:path (user passed via -l through the wrapper)
rsync -az --delete -e "$RSYNC_RSH" \
  --exclude '.env' \
  --exclude '.deploy-stamps' \
  --exclude 'app/html' \
  --exclude 'traefik/certs/*.crt' \
  --exclude 'traefik/certs/*.key' \
  --exclude 'traefik/crowdsec-bouncer.key' \
  deploy/orangepi/ \
  "${USER}@${HOST}:${REMOTE}/deploy/orangepi/"

rsync -az --delete -e "$RSYNC_RSH" \
  dist/ \
  "${USER}@${HOST}:${REMOTE}/deploy/orangepi/app/html/"

rsync -az -e "$RSYNC_RSH" \
  --exclude target --exclude gen/android/build \
  deploy/inhouse/ \
  "${USER}@${HOST}:${REMOTE}/deploy/inhouse/"

rsync -az -e "$RSYNC_RSH" \
  --exclude target --exclude gen/android \
  src-tauri/ \
  "${USER}@${HOST}:${REMOTE}/src-tauri/"

rsync -az -e "$RSYNC_RSH" \
  assets/ \
  "${USER}@${HOST}:${REMOTE}/assets/"

ts_ssh bash -s <<EOF
set -euo pipefail
cd ${REMOTE}/deploy/orangepi
chmod +x ci-deploy.sh
FORCE_APP=${FORCE_APP:-0} FORCE_API=${FORCE_API:-0} ./ci-deploy.sh
EOF
