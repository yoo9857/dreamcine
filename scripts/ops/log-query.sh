#!/usr/bin/env sh
set -eu

service="${1:?usage: log-query.sh SERVICE [REQUEST_ID]}"
request_id="${2:-}"

if [ -n "$request_id" ]; then
  docker compose -f infra/compose/docker-compose.prod.yml logs --no-color --no-log-prefix "$service" 2>&1 |
    jq -c --arg requestId "$request_id" 'select(.requestId == $requestId)'
else
  docker compose -f infra/compose/docker-compose.prod.yml logs --no-color --no-log-prefix "$service" 2>&1 |
    jq -c '.'
fi
