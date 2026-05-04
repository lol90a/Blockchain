#!/bin/bash

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <script> [args...]" >&2
  exit 1
fi

. "$(dirname "$0")/runtime-env.sh"
ensure_node_runtime

"$NODE_BIN" "$@"
