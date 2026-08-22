#!/usr/bin/env bash
#
# O01_DEPLOY.md §2·§3 의 배포 절차.
#
#   scripts/ops/deploy.sh <commit-sha>
#
# 원칙 (O01 §1):
#   · 게이트 통과가 배포 조건    → CI 가 초록일 때만 이미지가 존재한다
#   · 이미지는 CI 가 빌드         → 여기서는 pull 만 한다. 서버에서 빌드 금지
#   · 태그는 커밋 SHA             → latest 금지
#   · 마이그레이션은 배포 전 별도  → 앱 시작 시 자동 마이그레이션 금지
#   · 롤백은 이미지 태그 교체      → 실패하면 직전 태그로 되돌린다
set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly COMPOSE_FILE="${REPO_ROOT}/infra/compose/docker-compose.prod.yml"
readonly ENV_FILE="${REPO_ROOT}/.env"
readonly STATE_FILE="${REPO_ROOT}/.deploy-state"

# 헬스가 돌아올 때까지 기다리는 시간. 넘으면 롤백한다.
readonly HEALTH_TIMEOUT_SEC=120
readonly HEALTH_INTERVAL_SEC=3

log() { printf '\n=== %s\n' "$*"; }
fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat >&2 <<'USAGE'
사용법: scripts/ops/deploy.sh <commit-sha>

  <commit-sha>  CI 가 빌드한 이미지의 태그. 40자 또는 축약 SHA.

환경변수:
  REGISTRY        기본 ghcr.io/yoo9857/dreamcine
  DEPLOY_WORKER   1 이면 워커·스케줄러(media 프로파일)까지 배포한다.
                  apps/worker 가 생긴 뒤(T06)에만 의미가 있다.
USAGE
  exit 2
}

readonly SHA="${1:-}"
[[ -n "${SHA}" ]] || usage
[[ "${SHA}" =~ ^[0-9a-f]{7,40}$ ]] || fail "커밋 SHA 가 아닙니다: ${SHA}"

readonly REGISTRY="${REGISTRY:-ghcr.io/yoo9857/dreamcine}"
readonly WEB_IMAGE="${REGISTRY}/web:${SHA}"
readonly WORKER_IMAGE="${REGISTRY}/worker:${SHA}"
readonly DEPLOY_WORKER="${DEPLOY_WORKER:-0}"

compose() {
  local profile=()
  if [[ "${DEPLOY_WORKER}" == '1' ]]; then
    profile=(--profile media)
  fi
  WEB_IMAGE="${WEB_IMAGE}" WORKER_IMAGE="${WORKER_IMAGE}" \
    docker compose -f "${COMPOSE_FILE}" "${profile[@]}" "$@"
}

# ─────────────────────────────────────────────────────────────────────────────
# 0. 사전 확인 — O01 §3-0 "정상이 아닌 상태에서 배포하지 않는다.
#    장애 중 배포는 원인을 두 배로 만든다."
# ─────────────────────────────────────────────────────────────────────────────
preflight() {
  log '사전 확인'
  [[ -f "${COMPOSE_FILE}" ]] || fail "compose 파일이 없습니다: ${COMPOSE_FILE}"
  [[ -f "${ENV_FILE}" ]] || fail ".env 가 없습니다: ${ENV_FILE}"

  command -v docker >/dev/null || fail 'docker 가 없습니다'

  if [[ "${DEPLOY_WORKER}" == '1' ]]; then
    # compose 의 `:?` 를 여기로 옮겨왔다 — 프로파일을 켤 때만 검사한다.
    docker manifest inspect "${WORKER_IMAGE}" >/dev/null 2>&1 ||
      fail "워커 이미지를 찾을 수 없습니다: ${WORKER_IMAGE}"
  fi

  docker manifest inspect "${WEB_IMAGE}" >/dev/null 2>&1 ||
    fail "웹 이미지를 찾을 수 없습니다: ${WEB_IMAGE} (CI 가 초록이었습니까?)"

  local free_kb
  free_kb="$(df -Pk "${REPO_ROOT}" | awk 'NR==2 {print $4}')"
  # 이미지 두 개를 받을 여유가 없으면 pull 중간에 죽는다.
  if ((free_kb < 3 * 1024 * 1024)); then
    fail "디스크 여유가 3GiB 미만입니다 (${free_kb}KiB)"
  fi

  printf 'PASS: %s\n' "${WEB_IMAGE}"
}

previous_web_image() {
  [[ -f "${STATE_FILE}" ]] && grep -m1 '^WEB_IMAGE=' "${STATE_FILE}" |
    cut -d= -f2- || true
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. 이미지 받기 — 교체 직전에 받아두면 다운타임이 pull 시간만큼 늘어난다.
# ─────────────────────────────────────────────────────────────────────────────
pull_images() {
  log '이미지 받기'
  docker pull "${WEB_IMAGE}"
  if [[ "${DEPLOY_WORKER}" == '1' ]]; then
    docker pull "${WORKER_IMAGE}"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. 마이그레이션 — O01 §3-1. 앱 교체 **전에**, 1회성 컨테이너로.
#    컨테이너 여러 개가 동시에 마이그레이션하면 충돌한다.
# ─────────────────────────────────────────────────────────────────────────────
migrate() {
  log '마이그레이션'
  compose up -d --wait postgres redis
  docker run --rm \
    --env-file "${ENV_FILE}" \
    --network 'aidream_default' \
    "${WEB_IMAGE}" \
    node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma ||
    fail '마이그레이션 실패 — 배포를 중단합니다. 구 코드는 구 스키마로 계속 동작합니다.'
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. 교체 — 워커를 먼저 (그레이스풀), 그다음 웹.
# ─────────────────────────────────────────────────────────────────────────────
roll_services() {
  if [[ "${DEPLOY_WORKER}" == '1' ]]; then
    log '워커 교체 (진행 중인 트랜스코드를 죽이지 않는다)'
    compose up -d --no-deps worker scheduler
  fi

  log '웹 교체'
  compose up -d --no-deps --wait web caddy
}

# ─────────────────────────────────────────────────────────────────────────────
# 4. 헬스 확인 — 실패 시 롤백
# ─────────────────────────────────────────────────────────────────────────────
wait_healthy() {
  log '헬스 확인'
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SEC))
  while ((SECONDS < deadline)); do
    if compose exec -T web node -e \
      "fetch('http://127.0.0.1:3000/api/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
      >/dev/null 2>&1; then
      printf 'PASS: /api/ready\n'
      return 0
    fi
    sleep "${HEALTH_INTERVAL_SEC}"
  done
  return 1
}

rollback() {
  local previous
  previous="$(previous_web_image)"
  if [[ -z "${previous}" ]]; then
    printf 'ERROR: 되돌릴 직전 이미지 기록이 없습니다. 수동 개입이 필요합니다.\n' >&2
    printf '       docker compose -f %s ps\n' "${COMPOSE_FILE}" >&2
    return 1
  fi
  log "롤백 → ${previous}"
  WEB_IMAGE="${previous}" WORKER_IMAGE="${WORKER_IMAGE}" \
    docker compose -f "${COMPOSE_FILE}" up -d --no-deps --wait web
  printf 'ROLLED BACK: %s\n' "${previous}" >&2
}

record_state() {
  {
    printf 'WEB_IMAGE=%s\n' "${WEB_IMAGE}"
    printf 'SHA=%s\n' "${SHA}"
  } >"${STATE_FILE}"
}

main() {
  preflight
  local previous
  previous="$(previous_web_image)"
  printf '직전: %s\n' "${previous:-(없음)}"

  pull_images
  migrate
  roll_services

  if ! wait_healthy; then
    printf 'ERROR: 헬스 확인이 %s초 안에 통과하지 못했습니다.\n' \
      "${HEALTH_TIMEOUT_SEC}" >&2
    rollback || true
    exit 1
  fi

  record_state
  log "배포 완료 — ${SHA}"
  printf '롤백하려면: scripts/ops/deploy.sh <직전 SHA>\n'
}

main "$@"
