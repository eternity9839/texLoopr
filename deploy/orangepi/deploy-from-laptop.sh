#!/usr/bin/env bash
# Laptop → orangepi5 deploy (same as CI, no GitHub). Fish users: bash this script.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SSH_CFG="${SSH_CFG:-$HOME/.config/home-manager/servers/orangepi5-server/ssh-config}"
HOST="${HOST:-orangepi5}"
REMOTE="${REMOTE:-/home/orangepi/src/texLoopr}"

cd "$REPO"
TEXLOOPER_GIT_COMMIT="$(git rev-parse --short=7 HEAD)"
TEXLOOPER_GIT_TAG="$(git describe --tags --always)"

if [[ -d node_modules ]]; then
  npm run sync:render-assets
  npm run build
else
  npm ci --legacy-peer-deps
  npm run build
fi
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

rsync -az -e "ssh -F $SSH_CFG" \
  --exclude target --exclude gen/android/build \
  deploy/inhouse/ \
  "$HOST:$REMOTE/deploy/inhouse/"

rsync -az -e "ssh -F $SSH_CFG" \
  --exclude target --exclude gen/android \
  src-tauri/ \
  "$HOST:$REMOTE/src-tauri/"

rsync -az -e "ssh -F $SSH_CFG" \
  assets/ \
  "$HOST:$REMOTE/assets/"

ssh -F "$SSH_CFG" "$HOST" "cd $REMOTE/deploy/orangepi && chmod +x ci-deploy.sh && TEXLOOPER_GIT_COMMIT=$TEXLOOPER_GIT_COMMIT TEXLOOPER_GIT_TAG=$TEXLOOPER_GIT_TAG FORCE_APP=1 FORCE_API=1 ./ci-deploy.sh"
