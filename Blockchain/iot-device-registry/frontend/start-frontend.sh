#!/bin/bash

set -euo pipefail

. "$(dirname "$0")/../scripts/runtime-env.sh"
ensure_node_runtime

cd "$(dirname "$0")"

PORT="${PORT:-3000}"
HOST="${HOST:-127.0.0.1}"
export PORT HOST

echo "🚀 Starting IoT Device Registry frontend..."
echo "🖥️ Host: $HOST"
echo "🌐 Port: $PORT"
echo "🔗 API Base: ${REACT_APP_API_BASE_URL:-http://localhost:5000/api}"
echo ""

"$NODE_BIN" node_modules/react-scripts/bin/react-scripts.js start
