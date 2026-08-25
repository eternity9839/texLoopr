#!/usr/bin/env bash
# Laptop → orangepi5 deploy (same as CI, no GitHub). Fish users: bash this script.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SSH_CFG="${SSH_CFG:-$HOME/.config/home-manager/servers/orangepi5-server/ssh-config}"
HOST="${HOST:-orangepi5}"
REMOTE="${REMOTE:-/home/orangepi/src/texLooper}"

cd "$REPO"
npm ci
npm run build
cp deploy/orangepi/app/config.js dist/config.js

ssh -F "$SSH_CFG" "$HOST" "mkdir -p $REMOTE/deploy/orangepi/app/html"

rsync -az --delete \
  --exclude '.env' \
  --exclude '.deploy-stamps' \
  --exclude 'app/html' \
  --exclude 'traefik/certs/*.crt' \
  --exclude 'traefik/certs/*.key' \
  --exclude 'traefik/crowdsec-bouncer.key' \
  -e "ssh -F $SSH_CFG" \
  deploy/orangepi/ \
  "$HOST:$REMOTE/deploy/orangepi/"

rsync -az --delete \
  -e "ssh -F $SSH_CFG" \
  dist/ \
  "$HOST:$REMOTE/deploy/orangepi/app/html/"

ssh -F "$SSH_CFG" "$HOST" "cd $REMOTE/deploy/orangepi && chmod +x ci-deploy.sh && ./ci-deploy.sh"
