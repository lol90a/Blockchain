#!/bin/bash

# Set environment variables
export FABRIC_MOCK_MODE=false
export AES_SECRET=5cfd3f098503ead938643de65060019d1dfc1dd7bc00dc5dd7dafb2b11f8b84f
export PORT=5000
export CONNECTION_PROFILE_PATH=./blockchain/connection-org1.json
export CHANNEL_NAME=mychannel
export CHAINCODE_NAME=deviceContract

# Navigate to project directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the server
echo "🚀 Starting IoT Device Registry backend server..."
echo "📊 Mode: Fabric Mode"
echo "🔐 AES Encryption: Enabled"
echo "🌐 Port: $PORT"
echo ""

node api/server.js 