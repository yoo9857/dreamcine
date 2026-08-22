#!/usr/bin/env bash
#
# 서버를 GitHub Actions 배포가 가능한 상태로 만든다. **한 번만** 실행한다.
#
#   curl -fsSLO https://raw.githubusercontent.com/yoo9857/dreamcine/main/scripts/ops/prepare-deploy.sh
#   sudo bash prepare-deploy.sh
#
# 하는 일:
#   1. deploy 계정 확인 (없으면 만든다)
#   2. 배포용 공개키를 authorized_keys 에 추가 (멱등)
#   3. deploy 를 docker 그룹에 넣는다
#   4. .env 의 BOOTSTRAP_MODE 를 false 로 (없으면 추가)
#   5. GitHub Secrets 에 넣을 값을 출력
#
# 아무것도 지우지 않고, 이미 되어 있는 것은 건너뛴다.
set -euo pipefail

readonly DEPLOY_USER="${DEPLOY_USER:-deploy}"

# GitHub Actions 가 쓸 배포 공개키.
#
# 공개키는 비밀이 아니다 — authorized_keys 는 원래 공개되는 값이고, 이것만으로는
# 아무도 접속할 수 없다. 짝이 되는 개인키는 저장소에 없으며 GitHub Secret
# `DEPLOY_SSH_KEY` 에만 들어간다.
readonly DEPLOY_PUBKEY='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJWl78jHABatIAWhqrIya6ytyBBAWkrci9O6gvvmc8lb aidream-deploy@github-actions'

step() { printf '\n=== %s\n' "$*"; }
ok() { printf '  OK  %s\n' "$*"; }
warn() { printf '  !!  %s\n' "$*"; }

[[ "$(id -u)" == '0' ]] || {
  printf 'root 로 실행해야 합니다: sudo bash %s\n' "$0" >&2
  exit 1
}

# ── 1. deploy 계정 ───────────────────────────────────────────────────────────
step "deploy 계정 (${DEPLOY_USER})"
if id "${DEPLOY_USER}" >/dev/null 2>&1; then
  ok '이미 있습니다'
else
  useradd --create-home --shell /bin/bash "${DEPLOY_USER}"
  ok '만들었습니다'
fi

readonly HOME_DIR="$(getent passwd "${DEPLOY_USER}" | cut -d: -f6)"
readonly SSH_DIR="${HOME_DIR}/.ssh"
readonly AUTH_KEYS="${SSH_DIR}/authorized_keys"

# ── 2. 공개키 ────────────────────────────────────────────────────────────────
step '배포 공개키'
install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${SSH_DIR}"
touch "${AUTH_KEYS}"
if grep -qF "${DEPLOY_PUBKEY##* }" "${AUTH_KEYS}" 2>/dev/null; then
  ok '이미 등록되어 있습니다'
else
  printf '%s\n' "${DEPLOY_PUBKEY}" >>"${AUTH_KEYS}"
  ok '추가했습니다'
fi
chmod 600 "${AUTH_KEYS}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${AUTH_KEYS}"

# ── 3. docker 권한 ───────────────────────────────────────────────────────────
step 'docker 권한'
if ! command -v docker >/dev/null; then
  warn 'docker 가 없습니다. 먼저 설치해야 합니다.'
elif id -nG "${DEPLOY_USER}" | tr ' ' '\n' | grep -qx docker; then
  ok '이미 docker 그룹입니다'
else
  usermod -aG docker "${DEPLOY_USER}"
  ok 'docker 그룹에 넣었습니다'
fi

# ── 4. 저장소와 부트스트랩 ───────────────────────────────────────────────────
step '저장소 위치'
REPO_PATH=''
for candidate in /srv/aidream /srv/dreamcine /opt/aidream /opt/dreamcine \
  "${HOME_DIR}/dreamcine" /root/dreamcine /root/aidream; do
  if [[ -f "${candidate}/infra/compose/docker-compose.prod.yml" ]]; then
    REPO_PATH="${candidate}"
    break
  fi
done
if [[ -z "${REPO_PATH}" ]]; then
  REPO_PATH="$(dirname "$(dirname "$(find / -maxdepth 6 -name docker-compose.prod.yml \
    -path '*/infra/compose/*' 2>/dev/null | head -1)")")" || true
  REPO_PATH="${REPO_PATH%/infra}"
fi

if [[ -n "${REPO_PATH}" && -d "${REPO_PATH}" ]]; then
  ok "${REPO_PATH}"
else
  warn '저장소를 찾지 못했습니다. git clone 이 필요합니다:'
  warn '  git clone https://github.com/yoo9857/dreamcine.git /srv/aidream'
fi

step '부트스트랩 모드'
readonly ENV_FILE="${REPO_PATH}/.env"
if [[ -n "${REPO_PATH}" && -f "${ENV_FILE}" ]]; then
  if grep -q '^BOOTSTRAP_MODE=' "${ENV_FILE}"; then
    sed -i 's/^BOOTSTRAP_MODE=.*/BOOTSTRAP_MODE=false/' "${ENV_FILE}"
  else
    printf 'BOOTSTRAP_MODE=false\n' >>"${ENV_FILE}"
  fi
  ok '껐습니다 — 이제 Caddy 가 앱으로 프록시합니다'
  warn '아직 배포하지 않았다면 사이트가 502 가 됩니다. 배포까지 이어서 하세요.'
else
  warn ".env 를 찾지 못했습니다 (${ENV_FILE})"
fi

# ── 5. GitHub Secrets ────────────────────────────────────────────────────────
step 'GitHub Secrets 에 넣을 값'
cat <<INFO

  Settings → Secrets and variables → Actions → New repository secret

  DEPLOY_HOST         $(hostname -I 2>/dev/null | awk '{print $1}')
  DEPLOY_USER         ${DEPLOY_USER}
  DEPLOY_PATH         ${REPO_PATH:-<저장소 경로>}
  DEPLOY_DOMAIN       $(grep -m1 '^DOMAIN=' "${ENV_FILE}" 2>/dev/null | cut -d= -f2- || echo '<도메인>')
  DEPLOY_SSH_KEY      (개인키 파일 내용 — 로컬 스크래치패드에 있습니다)
  DEPLOY_KNOWN_HOSTS  아래 한 줄

INFO
ssh-keyscan -t ed25519 "$(hostname -I 2>/dev/null | awk '{print $1}')" 2>/dev/null |
  sed 's/^/  /' || warn 'ssh-keyscan 실패 — 수동으로 얻으세요'

printf '\n준비 끝. 다음은 GitHub Actions 의 deploy 워크플로를 실행하세요.\n'
