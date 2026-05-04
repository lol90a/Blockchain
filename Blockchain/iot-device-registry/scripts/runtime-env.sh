#!/bin/bash

resolve_node_bin() {
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi

  local vscode_node
  vscode_node="$(find "$HOME/.vscode-server/bin" -maxdepth 2 -type f -name node 2>/dev/null | head -n 1)"
  if [ -n "$vscode_node" ] && [ -x "$vscode_node" ]; then
    echo "$vscode_node"
    return 0
  fi

  return 1
}

resolve_npm_cli() {
  local npm_cli

  if [ -f "node_modules/npm/bin/npm-cli.js" ]; then
    echo "node_modules/npm/bin/npm-cli.js"
    return 0
  fi

  npm_cli="$(find /mnt/c/Program\ Files/nodejs/node_modules/npm/bin -maxdepth 1 -type f -name npm-cli.js 2>/dev/null | head -n 1)"
  if [ -n "$npm_cli" ] && [ -f "$npm_cli" ]; then
    echo "$npm_cli"
    return 0
  fi

  return 1
}

ensure_node_runtime() {
  NODE_BIN="$(resolve_node_bin)" || {
    echo "No Linux-accessible Node.js runtime was found." >&2
    echo "Install Node.js in WSL or reopen this environment with a working Linux node binary." >&2
    return 1
  }

  export NODE_BIN
}

ensure_docker_access() {
  if docker ps >/dev/null 2>&1; then
    return 0
  fi

  echo "Docker is installed but this shell cannot access /var/run/docker.sock." >&2
  if getent group docker >/dev/null 2>&1 && getent group docker | grep -q "\b$USER\b"; then
    echo "Your user is already in the docker group, so this usually means the current shell has stale group membership." >&2
    echo "Run 'newgrp docker' or open a new terminal, then retry." >&2
  else
    echo "Add your user to the docker group or run the script from a session with Docker access." >&2
  fi
  return 1
}
