#!/bin/bash

set -euo pipefail

. "$(
  cd "$(dirname "$0")" && pwd
)/runtime-env.sh"

ensure_node_runtime
ensure_docker_access

CHAINCODE_VERSION="${1:-1.5}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NETWORK_DIR="$PROJECT_ROOT/../fabric-samples/test-network"
STATE_DB="${FABRIC_STATE_DB:-couchdb}"

have_container() {
  docker ps --format '{{.Names}}' | grep -q "^$1$"
}

have_network() {
  docker network ls --format '{{.Name}}' | grep -q "^$1$"
}

if have_network fabric_test && ! have_container orderer.example.com && ! have_container peer0.org1.example.com && ! have_container peer0.org2.example.com; then
  echo "Detected a stale fabric_test Docker network with no running peers/orderer. Cleaning it before startup..."
  "$PROJECT_ROOT/scripts/reset-fabric-network.sh"
fi

if ! have_container orderer.example.com || ! have_container peer0.org1.example.com || ! have_container peer0.org2.example.com; then
  echo "Starting Fabric network and channel..."
  cd "$NETWORK_DIR"
  if [ "$STATE_DB" = "couchdb" ]; then
    ./network.sh up createChannel -ca -c mychannel -s couchdb
  else
    ./network.sh up createChannel -ca -c mychannel
  fi
else
  echo "Fabric peer and orderer containers are already running."
fi

if ! have_container ca_org1 || ! have_container ca_org2 || ! have_container ca_orderer; then
  echo "Starting Fabric CA containers..."
  cd "$NETWORK_DIR"
  docker-compose -f compose/compose-ca.yaml up -d
else
  echo "Fabric CA containers are already running."
fi

cd "$PROJECT_ROOT"
echo "Refreshing wallet identities..."
"$NODE_BIN" blockchain/scripts/enrollAdmin.js
"$NODE_BIN" blockchain/scripts/registerUser.js
"$NODE_BIN" blockchain/scripts/registerGatewayUser.js

if ! have_container peer0org1_devicecontract_ccaas || ! have_container peer0org2_devicecontract_ccaas; then
  echo "Deploying device chaincode version $CHAINCODE_VERSION..."
  "$PROJECT_ROOT/scripts/deploy-fabric.sh" "$CHAINCODE_VERSION"
else
  echo "Fabric chaincode service containers are already running."
fi

if [ "$STATE_DB" = "couchdb" ]; then
  echo "CouchDB world-state mode requested. You can inspect CouchDB at http://localhost:5984/_utils and http://localhost:7984/_utils if exposed by your Fabric sample setup."
fi

echo "Fabric stack is ready."
