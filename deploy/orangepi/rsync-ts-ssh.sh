#!/usr/bin/env bash
# Adapt rsync's OpenSSH-style -e invocation to `tailscale ssh`.
# rsync calls: $RSYNC_RSH [-l user] [-o Opt=val] ... host [remote-cmd...]
# tailscale ssh wants: tailscale ssh user@host -- remote-cmd...
set -euo pipefail

user=""
args=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -l)
      user="${2:-}"
      shift 2
      ;;
    -o | -p | -i | -F | -c)
      # Ignore OpenSSH options rsync may pass; Tailscale SSH handles auth.
      shift 2
      ;;
    -4 | -6 | -T | -v | -q | -x | -a | -n)
      shift
      ;;
    --)
      shift
      break
      ;;
    -*)
      # Unknown short flag: drop it (and its arg if present looks like a value)
      shift
      ;;
    *)
      break
      ;;
  esac
done

if [[ $# -lt 1 ]]; then
  echo "rsync-ts-ssh: missing host" >&2
  exit 1
fi

host="$1"
shift

target="$host"
if [[ -n "$user" ]]; then
  target="${user}@${host}"
elif [[ "$host" != *@* ]]; then
  echo "rsync-ts-ssh: no user for host ${host}" >&2
  exit 1
fi

if [[ $# -gt 0 ]]; then
  exec tailscale ssh "$target" -- "$@"
fi
exec tailscale ssh "$target"
