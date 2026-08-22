import type { Capacity } from '../capacity.js'
import { AppError } from '../errors/app-error.js'
import { NotImplementedError } from '../errors/not-implemented.js'
import { LIMITS } from '../limits.js'

export interface PartPlan {
  readonly partSize: number
  readonly totalParts: number
}

export interface UploadRequest {
  readonly fileName: string
  readonly fileSize: number
  readonly mimeType: string
}

/**
 * 허용 컨테이너. `05_API_CONTRACT.md` §3 의 enum 과 같아야 한다.
 *
 * 클라이언트가 보낸 MIME 은 **신고값**이다. 진짜 검증은 트랜스코드 전
 * ffprobe 가 한다 (06_MEDIA_PIPELINE.md §2). 여기서 거르는 것은 명백한
 * 낭비를 막기 위한 1차 필터일 뿐이다.
 */
export const ALLOWED_UPLOAD_MIME = [
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
  'video/webm',
] as const

export type AllowedUploadMime = (typeof ALLOWED_UPLOAD_MIME)[number]

/** MIME 과 짝이 맞아야 하는 확장자. 둘이 어긋나면 거른다. */
export const MIME_EXTENSIONS: Readonly<
  Record<AllowedUploadMime, readonly string[]>
> = {
  'video/mp4': ['.mp4', '.m4v'],
  'video/quicktime': ['.mov'],
  'video/x-matroska': ['.mkv'],
  'video/webm': ['.webm'],
}

/**
 * 파트 크기를 정한다. (06_MEDIA_PIPELINE.md §2)
 *
 * 순수 함수다 — 서버와 클라이언트가 **같은 답**을 내야 재개가 성립한다.
 * 한쪽이 다른 크기로 쪼개면 파트 번호가 어긋나 이어 올릴 수 없다.
 */
export function decidePartSize(_fileSize: number): PartPlan {
  throw new NotImplementedError('T05:decidePartSize')
}

/**
 * 업로드를 받아도 되는지 판정한다. 위반이면 던지고, 통과하면 조용히 끝난다.
 *
 * **상한을 인자로 받는다.** `LIMITS` 나 리터럴에서 읽지 않는다 — T0→T1 승급
 * 시 코드가 바뀌면 안 된다. (11_CAPACITY_TIERS.md §1)
 *
 * 하한(`LIMITS.UPLOAD_MIN_BYTES`)만 티어와 무관한 고정값이라 여기서 읽는다.
 *
 * 검증 순서는 06 §2 를 따른다 — 싼 검사부터. 용량 초과를 MIME 검사보다
 * 먼저 걸러야 잘못된 파일에 헛수고를 하지 않는다.
 */
export function assertUploadAllowed(
  _request: UploadRequest,
  _capacity: Capacity,
): void {
  throw new NotImplementedError('T05:assertUploadAllowed')
}

/** 위 함수들이 던지는 에러가 카탈로그 밖으로 새지 않게 묶어 둔다. */
export type UploadPolicyError = AppError

/** 하한은 티어와 무관하다. 재노출해 호출자가 두 곳을 보지 않게 한다. */
export const UPLOAD_MIN_BYTES = LIMITS.UPLOAD_MIN_BYTES
