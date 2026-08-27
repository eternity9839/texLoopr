#!/usr/bin/env bash
# Smoke-run the desktop app, capture layout dumps + screenshot, print verdict.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="${TEXLOOPER_LAYOUT_LOG:-/tmp/texlooper-layout.jsonl}"
SHOT="${TEXLOOPER_LAYOUT_SHOT:-/tmp/texlooper-desktop.png}"
APP_LOG="${TEXLOOPER_APP_LOG:-/tmp/texlooper-app.log}"
BIN="$ROOT/src-tauri/target/release/texlooper"

rm -f "$LOG" "$SHOT" "$APP_LOG"
: >"$LOG"

if [[ ! -x "$BIN" ]]; then
  echo "missing binary: $BIN (run npm run tauri:build)" >&2
  exit 2
fi

export TEXLOOPER_LAYOUT_DEBUG=1
export TEXLOOPER_LAYOUT_LOG="$LOG"
export GDK_BACKEND="${TEXLOOPER_GDK_BACKEND:-x11}"
export GDK_SCALE="${GDK_SCALE:-1}"
export GDK_DPI_SCALE="${GDK_DPI_SCALE:-1}"

pkill -f 'target/release/texlooper' 2>/dev/null || true
sleep 0.3

echo "starting $BIN (GDK_BACKEND=$GDK_BACKEND log=$LOG)" >&2
"$BIN" >"$APP_LOG" 2>&1 &
PID=$!
cleanup() { kill "$PID" 2>/dev/null || true; }
trap cleanup EXIT

ok=0
for i in $(seq 1 40); do
  sleep 0.5
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "app exited early" >&2
    cat "$APP_LOG" >&2 || true
    exit 3
  fi
  if grep -q '"tag":"host-probe"' "$LOG" 2>/dev/null; then
    if grep -q '"studioCols":"48px' "$LOG" 2>/dev/null \
      || grep -q '"rootClient":{"w":[1-9]' "$LOG" 2>/dev/null; then
      ok=1
      break
    fi
  fi
  if [[ "$i" -ge 20 && -s "$LOG" ]]; then
    ok=1
    break
  fi
done

# Extra settle time for SPA paint before screenshot
sleep 1.5
if command -v grim >/dev/null 2>&1; then
  grim "$SHOT" 2>/dev/null || true
fi

echo "===== layout log ($LOG) ====="
if [[ -s "$LOG" ]]; then
  tail -n 6 "$LOG" | head -c 4000
  echo
else
  echo "(empty)"
fi
echo "===== app log tail ====="
tail -n 40 "$APP_LOG" || true
echo "===== screenshot ====="
ls -la "$SHOT" 2>/dev/null || echo "(no screenshot)"

if command -v node >/dev/null 2>&1 && [[ -s "$LOG" ]]; then
  node <<'NODE'
const fs = require('fs');
const log = fs.readFileSync(process.env.TEXLOOPER_LAYOUT_LOG || '/tmp/texlooper-layout.jsonl', 'utf8')
  .trim().split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const probes = log.filter(x => x.tag === 'host-probe' || x.tag === 'spa-snapshot');
const last = [...probes].reverse().find(x => x.tag === 'host-probe' && (x.rootHTML|0) > 0)
  || probes[probes.length - 1]
  || log[log.length - 1];
const snap = [...log].reverse().find(x => x.tag === 'spa-snapshot') || last?.layout || null;
const rootHTML = last?.rootHTML ?? 0;
const studio = last?.studio ?? false;
const page = last?.page ?? false;
const cols = last?.studioCols || '';
const client = last?.rootClient;
const dpr = last?.dpr ?? last?.frameInner?.[2];
const inner = last?.inner || last?.frameInner;
const colsOk = !cols || !/^0px(\s+0px)*$/.test(String(cols).trim());
const clientOk = client && client.w >= 200 && client.h >= 200;
const metricsOk = Array.isArray(inner) && Math.abs(inner[0]) >= 320 && Math.abs(inner[0]) <= 8192;
const healthy = rootHTML > 500 && studio && page && colsOk && clientOk && metricsOk;
console.log(JSON.stringify({
  verdict: healthy ? 'PASS' : 'FAIL',
  records: log.length,
  lastTag: last?.tag,
  dpr,
  inner,
  frameInner: last?.frameInner,
  rootHTML,
  studio,
  page,
  hostScale: last?.hostScale,
  rootClient: client,
  studioCols: cols || null,
  anomalies: snap?.accuracyChecks?.anomalies?.slice?.(0, 8) || null,
}, null, 2));
process.exit(healthy ? 0 : 4);
NODE
fi
