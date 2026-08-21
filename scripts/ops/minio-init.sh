#!/usr/bin/env bash
set -euo pipefail

require_environment() {
  local variable
  for variable in MINIO_ENDPOINT MINIO_ROOT_USER MINIO_ROOT_PASSWORD S3_BUCKET_ORIGINALS S3_BUCKET_HLS S3_BUCKET_THUMBS; do
    if [[ -z "${!variable:-}" ]]; then
      printf 'ERROR: required environment variable is empty: %s\n' "${variable}" >&2
      exit 1
    fi
  done
}

wait_for_minio() {
  local attempt
  for attempt in {1..30}; do
    if mc alias set local "${MINIO_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" >/dev/null 2>&1 &&
      mc ready local >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  printf 'ERROR: MinIO was not ready within 60 seconds\n' >&2
  return 1
}

main() {
  require_environment
  wait_for_minio
  mc mb --ignore-existing "local/${S3_BUCKET_ORIGINALS}" "local/${S3_BUCKET_HLS}" "local/${S3_BUCKET_THUMBS}"
  mc anonymous set none "local/${S3_BUCKET_ORIGINALS}"
  mc anonymous set download "local/${S3_BUCKET_HLS}"
  mc anonymous set download "local/${S3_BUCKET_THUMBS}"
  mc anonymous get "local/${S3_BUCKET_ORIGINALS}"
  mc anonymous get "local/${S3_BUCKET_HLS}"
  mc anonymous get "local/${S3_BUCKET_THUMBS}"
}

main "$@"
