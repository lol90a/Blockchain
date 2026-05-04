#!/bin/bash

set -euo pipefail

. "$(
  cd "$(dirname "$0")" && pwd
)/runtime-env.sh"

ensure_docker_access

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NETWORK_DIR="$PROJECT_ROOT/../fabric-samples/test-network"

cd "$NETWORK_DIR"

docker rm -f \
  peer0org1_devicecontract_ccaas \
  peer0org2_devicecontract_ccaas \
  orderer.example.com \
  peer0.org1.example.com \
  peer0.org2.example.com \
  couchdb0 \
  couchdb1 \
  ca_org1 \
  ca_org2 \
  ca_orderer \
  2>/dev/null || true

docker volume rm \
  compose_orderer.example.com \
  compose_peer0.org1.example.com \
  compose_peer0.org2.example.com \
  2>/dev/null || true

docker network rm \
  fabric_test \
  2>/dev/null || true

echo "Fabric network containers, stale ledger volumes, and the stale fabric_test network have been cleared."
