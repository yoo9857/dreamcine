#!/usr/bin/env bash
set -euo pipefail

readonly COMPOSE_FILE='infra/compose/docker-compose.dev.yml'

require_docker() {
  command -v docker >/dev/null 2>&1 || {
    printf 'ERROR: Docker is not installed\n' >&2
    exit 1
  }
  docker compose version >/dev/null
}

check_ports() {
  local port
  for port in 5432 6379 9000 9001; do
    if command -v ss >/dev/null 2>&1 && ss -lnt "sport = :${port}" | grep -q LISTEN; then
      printf 'ERROR: local port %s is already in use\n' "${port}" >&2
      exit 1
    fi
  done
}

main() {
  require_docker
  case "${1:-dev}" in
    dev)
      check_ports
      docker compose -f "${COMPOSE_FILE}" up -d --wait
      ;;
    down) docker compose -f "${COMPOSE_FILE}" down ;;
    logs) docker compose -f "${COMPOSE_FILE}" logs --follow --tail=200 ;;
    psql)
      docker compose -f "${COMPOSE_FILE}" exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
      ;;
    redis-cli) docker compose -f "${COMPOSE_FILE}" exec redis redis-cli ;;
    verify) scripts/ops/verify-infra.sh dev ;;
    *)
      printf 'usage: scripts/dev.sh [dev|down|logs|psql|redis-cli|verify]\n' >&2
      exit 2
      ;;
  esac
}

main "$@"
