#!/usr/bin/env bash
set -euo pipefail

readonly DEPLOY_USER="${DEPLOY_USER:-deploy}"
readonly DEPLOY_HOME="/home/${DEPLOY_USER}"
readonly DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/dreamcine}"

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    printf 'ERROR: run as root\n' >&2
    exit 1
  fi
}

install_packages() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y --no-install-recommends \
    ca-certificates curl docker.io docker-compose-v2 unattended-upgrades ufw
  systemctl enable --now docker unattended-upgrades
}

configure_deploy_user() {
  if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
    useradd --create-home --shell /bin/bash "${DEPLOY_USER}"
  fi
  usermod --append --groups docker "${DEPLOY_USER}"
  case "${DEPLOY_ROOT}" in
    /opt/*) ;;
    *)
      printf 'ERROR: DEPLOY_ROOT must be a child of /opt: %s\n' "${DEPLOY_ROOT}" >&2
      exit 1
      ;;
  esac
  install -d -m 0750 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${DEPLOY_ROOT}"
  chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_ROOT}"

  if [[ -n "${DEPLOY_PUBLIC_KEY:-}" ]]; then
    install -d -m 0700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${DEPLOY_HOME}/.ssh"
    touch "${DEPLOY_HOME}/.ssh/authorized_keys"
    if ! grep -Fqx -- "${DEPLOY_PUBLIC_KEY}" "${DEPLOY_HOME}/.ssh/authorized_keys"; then
      printf '%s\n' "${DEPLOY_PUBLIC_KEY}" >>"${DEPLOY_HOME}/.ssh/authorized_keys"
    fi
    chown "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_HOME}/.ssh/authorized_keys"
    chmod 0600 "${DEPLOY_HOME}/.ssh/authorized_keys"
  fi
}

configure_swap() {
  if [[ ! -f /swapfile ]]; then
    fallocate -l 4G /swapfile
    chmod 0600 /swapfile
    mkswap /swapfile
  fi
  if ! swapon --show=NAME --noheadings | grep -Fqx '/swapfile'; then
    swapon /swapfile
  fi
  if ! grep -Eq '^/swapfile[[:space:]]+none[[:space:]]+swap[[:space:]]+sw[[:space:]]+0[[:space:]]+0$' /etc/fstab; then
    printf '/swapfile none swap sw 0 0\n' >>/etc/fstab
  fi
  printf 'vm.swappiness=10\n' >/etc/sysctl.d/99-aidream.conf
  sysctl --system >/dev/null
}

configure_firewall() {
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
}

verify_provisioning() {
  docker --version
  docker compose version
  swapon --show
  sysctl vm.swappiness
  id "${DEPLOY_USER}"
  ufw status verbose
}

main() {
  require_root
  install_packages
  configure_deploy_user
  configure_swap
  configure_firewall
  verify_provisioning
}

main "$@"
