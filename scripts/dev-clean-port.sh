#!/usr/bin/env bash
set -euo pipefail

PORT="${FRONTEND_PORT:-3001}"

find_port_pids() {
  if command -v fuser >/dev/null 2>&1; then
    fuser -n tcp "$PORT" 2>/dev/null | tr ' ' '\n' | sed '/^$/d' || true
    return
  fi

  if command -v lsof >/dev/null 2>&1; then
    lsof -ti tcp:"$PORT" -sTCP:LISTEN 2>/dev/null || true
    return
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$PORT" 2>/dev/null |
      sed -nE 's/.*pid=([0-9]+).*/\1/p' |
      sort -u || true
  fi
}

port_is_busy() {
  if command -v ss >/dev/null 2>&1; then
    ss -H -ltn "sport = :$PORT" 2>/dev/null | grep -q .
    return
  fi

  [ -n "$(find_port_pids)" ]
}

pids="$(find_port_pids | sort -u | tr '\n' ' ' | sed 's/[[:space:]]*$//')"

if [ -n "$pids" ]; then
  echo "[frontend-dev] Liberando porta ${PORT}: ${pids}"
  current_pgid="$(ps -o pgid= -p "$$" | tr -d ' ' || true)"
  pgids="$(
    for pid in $pids; do
      ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' '
    done | sed '/^$/d' | sort -u
  )"

  for pgid in $pgids; do
    if [ -n "$pgid" ] && [ "$pgid" != "$current_pgid" ]; then
      kill -- "-$pgid" 2>/dev/null || true
    fi
  done

  kill $pids 2>/dev/null || true

  for _ in $(seq 1 30); do
    if ! port_is_busy; then
      break
    fi

    sleep 0.2
  done

  if port_is_busy; then
    echo "[frontend-dev] Forcando encerramento na porta ${PORT}: ${pids}"
    kill -9 $pids 2>/dev/null || true
  fi
fi

rm -rf .next/dev 2>/dev/null || true

exec bash ./scripts/use-node.sh ./node_modules/.bin/next dev --webpack --port "$PORT"
