import { NotImplementedError } from '@aidream/core'

/**
 * **이 파일에서만 `CDN_BASE_URL` 을 참조한다.**
 * 06_MEDIA_PIPELINE.md §5 는 이 규칙을 린트로 강제하라고 요구한다 —
 * CDN 도메인을 갈아탈 때 고칠 파일이 하나여야 한다.
 *
 * 공개 버킷은 둘(`hls`, `thumbs`)인데 base URL 은 하나다. 키가 `hls/…` ·
 * `thumbs/…` 로 시작하므로 CDN 이 첫 경로 세그먼트로 오리진을 가른다는
 * 전제다. 개발/CI 값은 아직 그 전제를 만족하지 않는다. (OBS-013)
 */
export function cdnUrl(_key: string): string {
  throw new NotImplementedError('T04:cdn')
}

/** `{CDN}/hls/{assetId}/master.m3u8` */
export function masterUrl(_assetId: string): string {
  throw new NotImplementedError('T04:cdn')
}

/** `{CDN}/thumbs/{assetId}/{file}` — 기본 `thumb.jpg` */
export function thumbUrl(_assetId: string, _file?: string): string {
  throw new NotImplementedError('T04:cdn')
}

/** `userId` 가 null 이면 기본 아바타. CDN 이 아니라 앱 정적 자산이다. */
export function avatarUrl(_userId: string | null): string {
  throw new NotImplementedError('T04:cdn')
}
