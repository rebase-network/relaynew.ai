#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

CF_ACCOUNT_ID="${CF_ACCOUNT_ID:-5abb6d6f38eb7d3dabf8a5adf095c5f7}"

usage() {
  cat <<USAGE
Usage: ./ops/manage-api-edge.sh <command>

Commands:
  help      Show this help message
  build     Build the API edge Worker
  preview   Build and validate the API edge Worker with dry-run deploy
  deploy    Build and deploy the API edge Worker
  whoami    Show the active Wrangler account

Overrides:
  CF_ACCOUNT_ID  Default: ${CF_ACCOUNT_ID}
USAGE
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

run_build() {
  echo "Building api-edge for Cloudflare..."
  (
    cd "$ROOT_DIR"
    pnpm --filter "@relaynews/api-edge" run build
  )
}

run_wrangle() {
  (
    cd "$ROOT_DIR"
    export CLOUDFLARE_ACCOUNT_ID="${CF_ACCOUNT_ID}"
    pnpm exec wrangler "$@" --config "apps/api-edge/wrangler.jsonc"
  )
}

reject_extra_args() {
  if [ "$#" -gt 0 ]; then
    cat >&2 <<EOF
This script only manages relaynews-api-edge and does not accept targets.
Use GitHub pushes for relaynews-web and relaynews-admin.
EOF
    exit 1
  fi
}

preview_target() {
  run_build
  echo "Previewing api-edge Wrangler deploy..."
  run_wrangle deploy --dry-run
}

deploy_target() {
  run_build
  echo "Deploying api-edge to Cloudflare..."
  run_wrangle deploy
}

main() {
  require_cmd pnpm

  local command="${1:-help}"
  shift || true

  case "$command" in
    help|-h|--help)
      reject_extra_args "$@"
      usage
      ;;
    build)
      reject_extra_args "$@"
      run_build
      ;;
    preview)
      reject_extra_args "$@"
      preview_target
      ;;
    deploy)
      reject_extra_args "$@"
      deploy_target
      ;;
    whoami)
      reject_extra_args "$@"
      (
        cd "$ROOT_DIR"
        export CLOUDFLARE_ACCOUNT_ID="${CF_ACCOUNT_ID}"
        pnpm exec wrangler whoami
      )
      ;;
    *)
      echo "Unknown command: ${command}" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
