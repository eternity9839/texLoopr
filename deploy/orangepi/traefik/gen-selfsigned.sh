#!/usr/bin/env bash
# Generate a self-signed cert for the public Traefik entrypoint.
# Run from deploy/orangepi (or any cwd); writes to traefik/certs/.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="${DIR}/certs"
HOST="${TLS_HOST:-dev.texlooper.com}"
mkdir -p "$CERT_DIR"
umask 077

if [[ -f "${CERT_DIR}/${HOST}.crt" && -f "${CERT_DIR}/${HOST}.key" && "${FORCE:-}" != "1" ]]; then
  echo "certs already exist for ${HOST} (set FORCE=1 to regenerate)"
  exit 0
fi

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "${CERT_DIR}/${HOST}.key" \
  -out "${CERT_DIR}/${HOST}.crt" \
  -days 825 \
  -subj "/CN=${HOST}/O=texLooper Dev/C=BE" \
  -addext "subjectAltName=DNS:${HOST}"

chmod 600 "${CERT_DIR}/${HOST}.key"
chmod 644 "${CERT_DIR}/${HOST}.crt"
echo "wrote ${CERT_DIR}/${HOST}.{crt,key}"
