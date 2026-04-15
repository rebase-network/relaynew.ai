#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

CF_TUNNEL_ACCOUNT_ID="${CF_TUNNEL_ACCOUNT_ID:-5abb6d6f38eb7d3dabf8a5adf095c5f7}"
CF_TUNNEL_ID="${CF_TUNNEL_ID:-0c4e23ef-b334-44cd-a77b-4bf4d8015013}"
CF_TUNNEL_SERVICE="${CF_TUNNEL_SERVICE:-http://api:8787}"

usage() {
  cat <<USAGE
Usage: ./ops/manage-tunnel.sh <command>

Commands:
  help        Show this help message
  status      Print the current tunnel configuration
  apply       Apply the dedicated product tunnel config

Overrides:
  CF_TUNNEL_ACCOUNT_ID  Default: ${CF_TUNNEL_ACCOUNT_ID}
  CF_TUNNEL_ID          Default: ${CF_TUNNEL_ID}
  CF_TUNNEL_SERVICE     Default: ${CF_TUNNEL_SERVICE}
USAGE
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

get_api_token() {
  (
    cd "$ROOT_DIR"
    pnpm exec wrangler auth token | tail -n 1
  )
}

api_url() {
  printf "https://api.cloudflare.com/client/v4/accounts/%s/cfd_tunnel/%s/configurations"     "$CF_TUNNEL_ACCOUNT_ID"     "$CF_TUNNEL_ID"
}

fetch_config() {
  local token
  token="$(get_api_token)"
  curl -fsS     -H "Authorization: Bearer ${token}"     "$(api_url)"
}

show_status() {
  fetch_config | python3 -m json.tool
}

apply_config() {
  require_cmd python3
  require_cmd curl
  require_cmd pnpm

  export CF_TUNNEL_SERVICE

  local token payload
  token="$(get_api_token)"
  payload="$(mktemp)"
  trap 'rm -f "${payload:-}"' EXIT

  python3 - "$payload" <<'PY_TUNNEL'
import json
import os
import sys

payload = {
    "config": {
        "ingress": [
            {
                "service": os.environ["CF_TUNNEL_SERVICE"],
                "originRequest": {},
            }
        ],
        "warp-routing": {
            "enabled": False,
        },
    }
}

with open(sys.argv[1], "w", encoding="utf-8") as handle:
    json.dump(payload, handle)
PY_TUNNEL

  curl -fsS     -X PUT     -H "Authorization: Bearer ${token}"     -H "Content-Type: application/json"     "$(api_url)"     --data "@${payload}"     >/dev/null

  echo "Updated dedicated tunnel ingress for ${CF_TUNNEL_SERVICE}"
  show_status
}

main() {
  local command="${1:-help}"

  case "$command" in
    help|-h|--help)
      usage
      ;;
    status)
      show_status
      ;;
    apply)
      apply_config
      ;;
    *)
      echo "Unknown command: ${command}" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
