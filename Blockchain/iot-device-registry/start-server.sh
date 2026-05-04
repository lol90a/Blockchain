#!/bin/bash

set -euo pipefail

. "$(dirname "$0")/scripts/runtime-env.sh"
ensure_node_runtime

# Set environment variables
export FABRIC_MOCK_MODE=false
export AES_SECRET=5cfd3f098503ead938643de65060019d1dfc1dd7bc00dc5dd7dafb2b11f8b84f
export PORT=5000
export HOST=${HOST:-127.0.0.1}
export CONNECTION_PROFILE_PATH=../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json
export CHANNEL_NAME=mychannel
export CHAINCODE_NAME=devicecontract
export FABRIC_STATE_DB=${FABRIC_STATE_DB:-couchdb}
export ADMIN_REQUIRE_FABRIC_IDENTITY=${ADMIN_REQUIRE_FABRIC_IDENTITY:-true}
export HOSPITAL_RETENTION_DAYS=${HOSPITAL_RETENTION_DAYS:-365}

# Navigate to project directory
cd "$(dirname "$0")"

if command -v lsof >/dev/null 2>&1; then
    existing_pid="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -n 1 || true)"
    if [ -n "$existing_pid" ]; then
        existing_cmd="$(ps -p "$existing_pid" -o args= 2>/dev/null || true)"
        echo "Port $PORT is already in use by PID $existing_pid."
        if printf '%s' "$existing_cmd" | grep -q "api/server.js"; then
            echo "The IoT Device Registry backend is already running."
            exit 0
        fi
        echo "Command: ${existing_cmd:-unknown}"
        echo "Stop that process or set a different PORT before starting the backend."
        exit 1
    fi
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm_cli="$(resolve_npm_cli)" || {
        echo "npm CLI could not be located for the detected Node.js runtime." >&2
        exit 1
    }
    "$NODE_BIN" "$npm_cli" install
fi

# Start the server
echo "🚀 Starting IoT Device Registry backend server..."
echo "📊 Mode: Fabric Mode"
echo "🔐 AES Encryption: Enabled"
echo "🗄️ State DB: $FABRIC_STATE_DB"
echo "🏥 Hospital Integration: Enabled"
echo "🪪 Admin Fabric Identity Required: $ADMIN_REQUIRE_FABRIC_IDENTITY"
echo "🖥️ Host: $HOST"
echo "🌐 Port: $PORT"
echo ""

"$NODE_BIN" api/server.js
