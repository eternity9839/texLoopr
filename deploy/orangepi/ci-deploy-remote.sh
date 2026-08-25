#!/usr/bin/env bash
# Deploy to orangepi5 over Tailscale SSH (no deploy key). Requires prior tailscale/github-action step.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOST="${DEPLOY_HOST:-orangepi5}"
USER="${DEPLOY_USER:-orangepi}"
REMOTE="${REMOTE:-/home/orangepi/src/texLoopr}"
RSYNC_RSH="tailscale ssh --"

cd "$ROOT"

tailscale ssh "${USER}@${HOST}" -- "mkdir -p ${REMOTE}/deploy/orangepi/app/html"

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

tailscale ssh "${USER}@${HOST}" -- bash -s <<EOF
set -euo pipefail
cd ${REMOTE}/deploy/orangepi
chmod +x ci-deploy.sh
./ci-deploy.sh
EOF
