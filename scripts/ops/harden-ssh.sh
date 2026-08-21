#!/usr/bin/env bash
set -euo pipefail

readonly DEPLOY_USER="${DEPLOY_USER:-deploy}"
readonly SSH_DROP_IN='/etc/ssh/sshd_config.d/99-aidream-hardening.conf'

require_safe_prerequisites() {
  if [[ "${EUID}" -ne 0 ]]; then
    printf 'ERROR: run as root\n' >&2
    exit 1
  fi
  if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
    printf 'ERROR: deploy user does not exist: %s\n' "${DEPLOY_USER}" >&2
    exit 1
  fi
  local authorized_keys="/home/${DEPLOY_USER}/.ssh/authorized_keys"
  if [[ ! -s "${authorized_keys}" ]]; then
    printf 'ERROR: deploy authorized_keys is empty\n' >&2
    exit 1
  fi
  if [[ "${DEPLOY_KEY_VERIFIED:-}" != 'yes' ]]; then
    printf 'ERROR: verify a separate deploy-key SSH login, then set DEPLOY_KEY_VERIFIED=yes\n' >&2
    exit 1
  fi
}

write_hardening_config() {
  if [[ -f "${SSH_DROP_IN}" ]]; then
    cp --archive "${SSH_DROP_IN}" "${SSH_DROP_IN}.backup-$(date -u +%Y%m%dT%H%M%SZ)"
  fi
  install -m 0600 /dev/null "${SSH_DROP_IN}"
  printf '%s\n' \
    'PubkeyAuthentication yes' \
    'AuthenticationMethods publickey' \
    'PasswordAuthentication no' \
    'KbdInteractiveAuthentication no' \
    'PermitRootLogin no' >"${SSH_DROP_IN}"
}

validate_and_reload() {
  sshd -t
  systemctl reload ssh
  sshd -T | grep -E '^(authenticationmethods|passwordauthentication|kbdinteractiveauthentication|permitrootlogin|pubkeyauthentication) '
}

main() {
  require_safe_prerequisites
  write_hardening_config
  validate_and_reload
}

main "$@"
