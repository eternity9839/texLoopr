#!/usr/bin/env bash
# Render a project JSON to PDF via texlooper-cli or /v1/render-batch.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: render-project.sh --project PATH.json [--output OUT.pdf] [--api URL] [--output-id ID]

  --project     Project JSON (required)
  --output      PDF path (default: <project-basename>.pdf)
  --api         API base URL, e.g. https://dev.texlooper.com or http://127.0.0.1:8787
                If omitted, uses texlooper-cli when available, else http://127.0.0.1:8787
  --output-id   Output profile id (default: first pdf/print output, else out-pdf-a4)
  --rows        Data rows JSON array (default: [{}] for static docs)

Examples:
  ./scripts/render-project.sh --project projects/yassin-bousaadi-resume.json
  ./scripts/render-project.sh --project projects/yassin-bousaadi-resume.json --api http://127.0.0.1:8788
EOF
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT=""
OUTPUT=""
API="${TEXLOOPER_API_URL:-}"
OUTPUT_ID=""
ROWS='[{}]'
CLI="${TEXLOOPER_CLI:-$ROOT/src-tauri/target/release/texlooper-cli}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) PROJECT="$2"; shift 2 ;;
    --output) OUTPUT="$2"; shift 2 ;;
    --api) API="$2"; shift 2 ;;
    --output-id) OUTPUT_ID="$2"; shift 2 ;;
    --rows) ROWS="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

[[ -n "$PROJECT" && -f "$PROJECT" ]] || { echo "Missing or invalid --project" >&2; exit 1; }

if [[ -z "$OUTPUT" ]]; then
  base="$(basename "$PROJECT" .json)"
  dir="$(dirname "$PROJECT")"
  OUTPUT="$dir/$base.pdf"
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

if [[ -z "$API" && -x "$CLI" ]]; then
  export TEXLOOPER_ASSETS="${TEXLOOPER_ASSETS:-$ROOT/assets}"
  row_file="$tmpdir/row.json"
  printf '%s\n' "$ROWS" > "$row_file"
  args=(render --project "$PROJECT" --data "$row_file" --output "$OUTPUT")
  [[ -n "$OUTPUT_ID" ]] && args+=(--output-id "$OUTPUT_ID")
  "$CLI" "${args[@]}"
  echo "wrote $OUTPUT ($(wc -c < "$OUTPUT") bytes, cli)"
  exit 0
fi

API="${API:-http://127.0.0.1:8787}"
base="${API%/}"

if [[ -z "$OUTPUT_ID" ]]; then
  OUTPUT_ID="$(jq -r '[.outputs[]? | select(.kind == "pdf" or .kind == "print") | .id][0] // "out-pdf-a4"' "$PROJECT")"
fi

output_json="$(jq -r --arg id "$OUTPUT_ID" '.outputs[]? | select(.id == $id)' "$PROJECT")"
[[ -n "$output_json" && "$output_json" != "null" ]] || {
  echo "Output profile not found: $OUTPUT_ID" >&2
  exit 1
}

jq -n \
  --slurpfile project "$PROJECT" \
  --argjson rows "$ROWS" \
  --argjson output "$output_json" \
  '{project: $project[0], rows: $rows, output: $output, includeZip: false}' \
  > "$tmpdir/body.json"

headers=(-H "Content-Type: application/json")
if [[ -n "${TEXLOOPER_API_KEY:-}" ]]; then
  headers+=(-H "X-Api-Key: $TEXLOOPER_API_KEY")
fi

curl -sS -X POST "${base}/v1/render-batch" "${headers[@]}" -d @"$tmpdir/body.json" > "$tmpdir/resp.json"

if jq -e '.errors | length > 0 and (.files | length) == 0' "$tmpdir/resp.json" >/dev/null 2>&1; then
  jq -r '.errors[]' "$tmpdir/resp.json" >&2
  exit 1
fi

jq -r '.files[0].bytesBase64 // empty' "$tmpdir/resp.json" | base64 -d > "$OUTPUT"
[[ -s "$OUTPUT" ]] || { echo "Render returned no PDF bytes" >&2; jq . "$tmpdir/resp.json" >&2; exit 1; }

echo "wrote $OUTPUT ($(wc -c < "$OUTPUT") bytes, api $base)"
