import { ServerEnvSchema } from '@aidream/core'

import { hlsMasterKey, thumbKey } from './buckets.js'

/** 에피소드 카드용 기본 썸네일 파일명. (06_MEDIA_PIPELINE.md §1) */
const DEFAULT_THUMB_FILE = 'thumb.jpg'

const TRAILING_SLASHES = /\/+$/u
const LEADING_SLASHES = /^\/+/u

/**
 * **이 파일에서만 `CDN_BASE_URL` 을 읽는다.** 06_MEDIA_PIPELINE.md §5 가 이
 * 규칙을 린트로 강제하라고 요구하며, `packages/config/eslint/base.cjs` 의
 * `CDN_SINGLE_POINT` 가 실제로 막는다. CDN 도메인을 갈아탈 때 고칠 파일이
 * 하나여야 한다.
 *
 * 공개 버킷은 둘(`hls`, `thumbs`)인데 base URL 은 하나다. 키가 `hls/…` ·
 * `thumbs/…` 로 시작하므로 CDN 이 첫 경로 세그먼트로 오리진을 가른다는
 * 전제다. 개발/CI 값은 아직 그 전제를 만족하지 않는다. (OBS-013)
 */
function rawBase(): string | undefined {
  /*
    브라우저 번들에서는 `NEXT_PUBLIC_*` 만 빌드 시점에 값으로 치환된다.
    플레이어(T07)가 클라이언트에서 URL 을 조립하므로 그쪽을 먼저 본다.
    서버에서는 둘 다 있으므로 결과가 같다.
  */
  return process.env.NEXT_PUBLIC_CDN_BASE_URL ?? process.env.CDN_BASE_URL
}

function baseUrl(): string {
  return ServerEnvSchema.shape.CDN_BASE_URL.parse(rawBase())
}

/**
 * CSP 가 쓰는 CDN **출처**. 경로는 뺀다 — CSP 소스에 경로를 넣으면 접두사
 * 규칙에 걸려 세그먼트 요청이 조용히 막히는 경우가 생긴다.
 *
 * 설정이 없으면 `null` 이다. 미들웨어가 매 요청 던지면 사이트 전체가 죽는데,
 * CDN 설정 누락의 올바른 증상은 "영상이 재생되지 않음" 이지 "사이트 다운" 이
 * 아니다. 설정 검증은 부팅 시 env 스키마가 한다.
 */
export function cdnOrigin(): string | null {
  const raw = rawBase()
  if (raw === undefined || raw === '') {
    return null
  }
  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

/**
 * base 의 끝 슬래시와 키의 앞 슬래시를 **양쪽 다** 다듬는다. 한쪽만 다듬으면
 * `//` 가 생기거나 구분자가 사라진다. S3 에서 `a//b` 와 `a/b` 는 다른 키다.
 */
export function cdnUrl(key: string): string {
  const base = baseUrl().replace(TRAILING_SLASHES, '')
  const path = key.replace(LEADING_SLASHES, '')
  return base + '/' + path
}

/** `{CDN}/hls/{assetId}/master.m3u8` */
export function masterUrl(assetId: string): string {
  return cdnUrl(hlsMasterKey(assetId))
}

/** `{CDN}/thumbs/{assetId}/{file}` */
export function thumbUrl(assetId: string, file = DEFAULT_THUMB_FILE): string {
  return cdnUrl(thumbKey(assetId, file))
}

/**
 * 아바타는 **저장된 키**로 만든다. `User.avatarKey` 가 nullable 이므로
 * (04_DOMAIN_MODEL.md §2) 없을 때는 `null` 을 돌려준다.
 *
 * 기본 아바타 이미지를 가리키지 않는 이유: `packages/ui` 의 `Avatar` 는
 * 이미 이니셜 폴백을 가지고 있다. 존재하지 않는 기본 이미지를 가리키면
 * 그 폴백이 죽고 깨진 이미지가 남는다. 없음은 없음으로 전달한다.
 *
 * userId 가 아니라 키를 받는 이유: 키를 다시 유도하면 저장된 것과 갈라질 수
 * 있다. 쓰기는 `avatarKey(userId)`, 읽기는 저장된 키 — 한 방향으로 흐른다.
 */
export function avatarUrl(avatarKey: string | null): string | null {
  return avatarKey === null || avatarKey === '' ? null : cdnUrl(avatarKey)
}
