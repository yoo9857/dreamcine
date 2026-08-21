#!/usr/bin/env bash
set -euo pipefail

readonly COMPOSE_DEV='infra/compose/docker-compose.dev.yml'

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_header() {
  local headers="$1"
  local pattern="$2"
  grep -Eiq -- "${pattern}" <<<"${headers}" || fail "missing header: ${pattern}"
}

verify_dev() {
  local postgres_id redis_id minio_id status originals_status public_status headers
  local hls_bucket="${S3_BUCKET_HLS:-aidream-hls}"

  cleanup_cors_probe() {
    docker compose -f "${COMPOSE_DEV}" run --rm --no-deps --entrypoint /bin/sh minio-init -c \
      'mc alias set local "$MINIO_ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null && mc rm --force "local/$S3_BUCKET_HLS/cors-probe" >/dev/null' \
      >/dev/null 2>&1 || true
  }
  trap cleanup_cors_probe EXIT
  postgres_id="$(docker compose -f "${COMPOSE_DEV}" ps -q postgres)"
  redis_id="$(docker compose -f "${COMPOSE_DEV}" ps -q redis)"
  minio_id="$(docker compose -f "${COMPOSE_DEV}" ps -q minio)"
  [[ -n "${postgres_id}" && -n "${redis_id}" && -n "${minio_id}" ]] || fail 'dev containers are not running'

  status="$(docker inspect --format '{{.State.Health.Status}}' "${postgres_id}")"
  [[ "${status}" == 'healthy' ]] || fail "postgres is ${status}"
  status="$(docker inspect --format '{{.State.Health.Status}}' "${redis_id}")"
  [[ "${status}" == 'healthy' ]] || fail "redis is ${status}"
  status="$(docker inspect --format '{{.State.Health.Status}}' "${minio_id}")"
  [[ "${status}" == 'healthy' ]] || fail "minio is ${status}"

  docker compose -f "${COMPOSE_DEV}" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "select 1"' | grep -qx '1' || fail 'postgres query failed'
  docker compose -f "${COMPOSE_DEV}" exec -T redis redis-cli ping | grep -qx 'PONG' || fail 'redis ping failed'

  originals_status="$(curl -sS -o /dev/null -w '%{http_code}' 'http://127.0.0.1:9000/aidream-originals/probe')"
  [[ "${originals_status}" == '403' ]] || fail "originals anonymous access returned ${originals_status}, expected 403"
  public_status="$(curl -sS -o /dev/null -w '%{http_code}' 'http://127.0.0.1:9000/aidream-hls/probe')"
  [[ "${public_status}" == '404' ]] || fail "hls anonymous access returned ${public_status}, expected 404"

  docker compose -f "${COMPOSE_DEV}" run --rm --no-deps --entrypoint /bin/sh minio-init -c 'mc alias set local "$MINIO_ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null && printf probe | mc pipe "local/$S3_BUCKET_HLS/cors-probe" >/dev/null'
  headers="$(curl -sS -D - -o /dev/null -H 'Origin: http://localhost:3000' "http://127.0.0.1:9000/${hls_bucket}/cors-probe")"
  assert_header "${headers}" '^access-control-allow-origin:[[:space:]]*http://localhost:3000'
  assert_header "${headers}" '^access-control-expose-headers:.*etag'
  cleanup_cors_probe
  trap - EXIT
  printf 'PASS: dev PostgreSQL, Redis, MinIO policies and CORS\n'
}

verify_https() {
  local url="${VERIFY_URL:-https://ilog.info}"
  local headers
  headers="$(curl --fail --silent --show-error --head --max-time 15 "${url}")"
  assert_header "${headers}" '^strict-transport-security:.*max-age=63072000'
  assert_header "${headers}" '^x-content-type-options:[[:space:]]*nosniff'
  assert_header "${headers}" '^x-frame-options:[[:space:]]*DENY'
  assert_header "${headers}" '^referrer-policy:[[:space:]]*strict-origin-when-cross-origin'
  assert_header "${headers}" '^permissions-policy:'
  assert_header "${headers}" '^cross-origin-opener-policy:[[:space:]]*same-origin'
  printf 'PASS: HTTPS and required security headers (%s)\n' "${url}"
}

main() {
  case "${1:-all}" in
    dev) verify_dev ;;
    https) verify_https ;;
    all)
      verify_dev
      verify_https
      ;;
    *) fail 'usage: verify-infra.sh [dev|https|all]' ;;
  esac
}

main "$@"
