#!/usr/bin/env bash
# CI: arm64 APK via Nix android shell (run only after ci-test.sh).
# ANDROID_VARIANT=debug|release (default: debug).
# Release expects src-tauri/gen/android/key.properties (+ keystore) — wire from
# GitHub secrets when enabling this stage.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

VARIANT="${ANDROID_VARIANT:-debug}"
case "$VARIANT" in
  debug | release) ;;
  *)
    echo "error: ANDROID_VARIANT must be debug or release (got: ${VARIANT})" >&2
    exit 1
    ;;
esac

if [[ "$VARIANT" == "release" && ! -f src-tauri/gen/android/key.properties ]]; then
  echo "error: release APK needs src-tauri/gen/android/key.properties" >&2
  exit 1
fi

nix develop .#android -c bash -c "
  set -euo pipefail
  npm ci
  if [[ ! -d src-tauri/gen/android/app ]]; then
    npm run tauri -- android init
  fi
  if [[ '${VARIANT}' == 'release' ]]; then
    npm run tauri -- android build -- --apk --target aarch64
  else
    npm run tauri -- android build -- --debug --apk --target aarch64
  fi
"

VERSION="$(node -p "require('./package.json').version")"
OUT_DIR="src-tauri/gen/android/app/build/outputs/apk/arm64/${VARIANT}"
SRC_APK="$(find "$OUT_DIR" -name '*.apk' -type f | head -n1 || true)"
if [[ -z "$SRC_APK" ]]; then
  echo "error: no APK under ${OUT_DIR}" >&2
  find src-tauri/gen/android/app/build/outputs -type f -name '*.apk' 2>/dev/null || true
  exit 1
fi

mkdir -p dist-android
DEST="dist-android/texlooper-v${VERSION}-arm64-${VARIANT}.apk"
cp -f "$SRC_APK" "$DEST"
echo "apk=${DEST}"
ls -lh "$DEST"
