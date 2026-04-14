#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

REMOTE_HOST="${REMOTE_HOST:-rebase@rebase.network}"
REMOTE_BASE_DIR="${REMOTE_BASE_DIR:-/home/rebase/apps/relaynews-origin}"
REMOTE_RELEASES_DIR="${REMOTE_RELEASES_DIR:-${REMOTE_BASE_DIR}/releases}"
REMOTE_SHARED_DIR="${REMOTE_SHARED_DIR:-${REMOTE_BASE_DIR}/shared}"
REMOTE_CURRENT_LINK="${REMOTE_CURRENT_LINK:-${REMOTE_BASE_DIR}/current}"
REMOTE_ENV_FILE="${REMOTE_ENV_FILE:-${REMOTE_SHARED_DIR}/origin.env}"
REMOTE_SERVICE_NAME="${REMOTE_SERVICE_NAME:-relaynews-origin}"
REMOTE_HEALTHCHECK_URL="${REMOTE_HEALTHCHECK_URL:-http://127.0.0.1:8787/health}"
REMOTE_NODE_ENV="${REMOTE_NODE_ENV:-production}"
SSH_OPTS=("-o" "ServerAliveInterval=30" "-o" "StrictHostKeyChecking=accept-new")

usage() {
  cat <<USAGE
Usage: ./ops/manage.sh <command> [args]

Commands:
  help                     Show this help message
  ssh                      Open an interactive SSH session
  remote <cmd...>          Run an arbitrary command on the remote host
  bootstrap                Create remote directories and install the systemd unit
  deploy                   Sync repo, install, build, migrate, and restart origin
  status                   Show service status and current release path
  health                   Check the remote origin health endpoint
  logs [lines]             Tail service logs with journalctl (default: 100)
  start                    Start the origin service
  stop                     Stop the origin service
  restart                  Restart the origin service
  env-push [local-file]    Upload a local env file to the remote origin env path
  path                     Print the derived remote paths

Overrides:
  REMOTE_HOST              Default: ${REMOTE_HOST}
  REMOTE_BASE_DIR          Default: ${REMOTE_BASE_DIR}
  REMOTE_SERVICE_NAME      Default: ${REMOTE_SERVICE_NAME}
  REMOTE_ENV_FILE          Default: ${REMOTE_ENV_FILE}
USAGE
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

run_ssh() {
  ssh "${SSH_OPTS[@]}" "$REMOTE_HOST" "$@"
}

run_remote_script() {
  local script="$1"
  ssh "${SSH_OPTS[@]}" "$REMOTE_HOST" 'bash -se' <<EOF_REMOTE
set -euo pipefail
$script
EOF_REMOTE
}

render_service_unit() {
  cat <<EOF_UNIT
[Unit]
Description=relaynews.ai origin API
After=network.target

[Service]
Type=simple
User=rebase
WorkingDirectory=${REMOTE_CURRENT_LINK}
EnvironmentFile=${REMOTE_ENV_FILE}
Environment=NODE_ENV=${REMOTE_NODE_ENV}
ExecStart=/usr/bin/env bash -lc 'cd ${REMOTE_CURRENT_LINK} && pnpm --filter @relaynews/origin start'
Restart=always
RestartSec=5
KillSignal=SIGINT
TimeoutStopSec=20
SyslogIdentifier=${REMOTE_SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOF_UNIT
}

bootstrap_remote() {
  local unit_file="/tmp/${REMOTE_SERVICE_NAME}.service"
  local escaped_service
  escaped_service="$(render_service_unit)"

  run_remote_script "
mkdir -p '${REMOTE_RELEASES_DIR}' '${REMOTE_SHARED_DIR}'
if [ ! -f '${REMOTE_ENV_FILE}' ]; then
  cat > '${REMOTE_ENV_FILE}' <<'EOF_ENV'
NODE_ENV=production
HOST=127.0.0.1
PORT=8787
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/relaynews
ENABLE_SCHEDULER=true
PUBLIC_PROBE_ALLOW_PRIVATE_HOSTS=false
EOF_ENV
fi
cat > '${unit_file}' <<'EOF_UNIT'
${escaped_service}
EOF_UNIT
sudo mv '${unit_file}' '/etc/systemd/system/${REMOTE_SERVICE_NAME}.service'
sudo systemctl daemon-reload
sudo systemctl enable ${REMOTE_SERVICE_NAME}
"

  echo "Bootstrap completed for ${REMOTE_HOST}"
}

sync_release() {
  require_cmd rsync
  local release_id
  release_id="$(date +%Y%m%d%H%M%S)"
  local release_dir="${REMOTE_RELEASES_DIR}/${release_id}"

  run_remote_script "mkdir -p '${release_dir}' '${REMOTE_SHARED_DIR}'"

  rsync -az --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.env' \
    --exclude '.DS_Store' \
    --exclude 'test-results' \
    --exclude 'playwright-report' \
    --exclude '.wrangler' \
    --exclude '.pnpm-store' \
    --exclude 'coverage' \
    --exclude '.idea' \
    --exclude '.vscode' \
    "$ROOT_DIR/" "${REMOTE_HOST}:${release_dir}/"

  echo "$release_dir"
}

deploy_remote() {
  require_cmd ssh
  require_cmd rsync

  local release_dir
  release_dir="$(sync_release)"

  run_remote_script "
set -a
[ -f '${REMOTE_ENV_FILE}' ] && . '${REMOTE_ENV_FILE}'
set +a
cd '${release_dir}'
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile
pnpm --filter @relaynews/shared build
pnpm --filter @relaynews/origin build
pnpm --filter @relaynews/origin run db:migrate
ln -sfn '${release_dir}' '${REMOTE_CURRENT_LINK}'
sudo systemctl daemon-reload
sudo systemctl restart '${REMOTE_SERVICE_NAME}'
sleep 2
curl --fail --silent --show-error '${REMOTE_HEALTHCHECK_URL}' >/dev/null
"

  echo "Deploy completed"
  status_remote
}

status_remote() {
  run_remote_script "
echo 'remote_host: ${REMOTE_HOST}'
echo 'service: ${REMOTE_SERVICE_NAME}'
echo 'current_release:'
readlink '${REMOTE_CURRENT_LINK}' || true
echo
echo 'systemd status:'
sudo systemctl --no-pager --full status '${REMOTE_SERVICE_NAME}' || true
"
}

health_remote() {
  run_remote_script "curl --fail --silent --show-error '${REMOTE_HEALTHCHECK_URL}' && echo"
}

logs_remote() {
  local lines="${1:-100}"
  run_ssh sudo journalctl -u "$REMOTE_SERVICE_NAME" -n "$lines" --no-pager
}

push_env() {
  local local_file="${1:-${ROOT_DIR}/ops/origin.env.example}"
  if [ ! -f "$local_file" ]; then
    echo "Local env file not found: $local_file" >&2
    exit 1
  fi

  run_remote_script "mkdir -p '${REMOTE_SHARED_DIR}'"
  scp "${SSH_OPTS[@]}" "$local_file" "${REMOTE_HOST}:${REMOTE_ENV_FILE}"
  echo "Uploaded ${local_file} -> ${REMOTE_ENV_FILE}"
}

service_action() {
  local action="$1"
  run_ssh sudo systemctl "$action" "$REMOTE_SERVICE_NAME"
}

case "${1:-help}" in
  help|-h|--help)
    usage
    ;;
  ssh)
    exec ssh "${SSH_OPTS[@]}" "$REMOTE_HOST"
    ;;
  remote)
    shift
    if [ "$#" -eq 0 ]; then
      echo "remote requires a command" >&2
      exit 1
    fi
    run_ssh "$@"
    ;;
  bootstrap)
    bootstrap_remote
    ;;
  deploy)
    deploy_remote
    ;;
  status)
    status_remote
    ;;
  health)
    health_remote
    ;;
  logs)
    shift || true
    logs_remote "${1:-100}"
    ;;
  start|stop|restart)
    service_action "$1"
    ;;
  env-push)
    shift || true
    push_env "${1:-${ROOT_DIR}/ops/origin.env.example}"
    ;;
  path)
    cat <<EOF_PATH
REMOTE_HOST=${REMOTE_HOST}
REMOTE_BASE_DIR=${REMOTE_BASE_DIR}
REMOTE_RELEASES_DIR=${REMOTE_RELEASES_DIR}
REMOTE_SHARED_DIR=${REMOTE_SHARED_DIR}
REMOTE_CURRENT_LINK=${REMOTE_CURRENT_LINK}
REMOTE_ENV_FILE=${REMOTE_ENV_FILE}
REMOTE_SERVICE_NAME=${REMOTE_SERVICE_NAME}
REMOTE_HEALTHCHECK_URL=${REMOTE_HEALTHCHECK_URL}
EOF_PATH
    ;;
  *)
    echo "Unknown command: $1" >&2
    usage
    exit 1
    ;;
esac
