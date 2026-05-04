#!/bin/bash

set -euo pipefail

. "$(
  cd "$(dirname "$0")" && pwd
)/runtime-env.sh"

ensure_docker_access

CHAINCODE_VERSION="${1:-1.5}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NETWORK_DIR="$PROJECT_ROOT/../fabric-samples/test-network"

cd "$NETWORK_DIR"
./network.sh deployCCAAS -c mychannel -ccn devicecontract -ccp ../../iot-device-registry/chaincode/deviceContract -ccv "$CHAINCODE_VERSION"
