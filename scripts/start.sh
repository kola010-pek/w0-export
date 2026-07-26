#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

PORT=5000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"

# Load environment configuration from .env.local
if [ -f "${COZE_WORKSPACE_PATH}/.env.local" ]; then
    set -a
    source "${COZE_WORKSPACE_PATH}/.env.local"
    set +a
fi

start_service() {
    cd "${COZE_WORKSPACE_PATH}"
    echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
    echo "DATA_SOURCE_MODE=${DATA_SOURCE_MODE:-mock}"
    echo "SQLITE_DB_PATH=${SQLITE_DB_PATH:-not set}"
    PORT=${DEPLOY_RUN_PORT} node dist/server.js
}

echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
start_service
