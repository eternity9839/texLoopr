#!/usr/bin/env bash
# Shared/reusable: build + run texlooper-cli serve via Nix (ADR 0016).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/src-tauri"
export TEXLOOPER_API_KEY="${TEXLOOPER_API_KEY:-dev-change-me}"
export TEXLOOPER_DATA_DIR="${TEXLOOPER_DATA_DIR:-$ROOT/.data/texlooper}"
export TEXLOOPER_CATALOG="${TEXLOOPER_CATALOG:-sqlite}"
mkdir -p "$TEXLOOPER_DATA_DIR"
BIND="${1:-127.0.0.1:8787}"
exec nix develop "$ROOT" -c cargo run --release --bin texlooper-cli -- serve --bind "$BIND"
