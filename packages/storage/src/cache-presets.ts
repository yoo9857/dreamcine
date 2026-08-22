/**
 * `putObject` 의 `cacheControl` 은 필수 인자다. 그 값을 매번 손으로 쓰면
 * 오타 하나가 조용히 캐시를 끈다. 쓸 수 있는 값을 여기서만 정의한다.
 */

/**
 * HLS 세그먼트·플레이리스트·썸네일. 06_MEDIA_PIPELINE.md §1 의 불변성 철칙
 * — 같은 키에 다른 내용을 쓰지 않으므로 무효화가 필요 없다. 그래서
 * `immutable` 을 쓸 수 있다. (재트랜스코드는 새 assetId 를 만든다)
 */
export const IMMUTABLE_1Y = 'public, max-age=31536000, immutable'

/** 원본처럼 캐시되면 안 되는 것. */
export const NO_STORE = 'no-store'
