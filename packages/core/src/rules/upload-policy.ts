import type { Capacity } from '../capacity.js'
import { AppError } from '../errors/app-error.js'
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
export function decidePartSize(fileSize: number): PartPlan {
  let partSize = LIMITS.PART_SIZE_DEFAULT
  // 파트 수 상한(10,000)을 넘지 않을 때까지 크기를 배로 늘린다.
  while (Math.ceil(fileSize / partSize) > LIMITS.PART_COUNT_MAX) {
    partSize *= 2
  }
  if (partSize < LIMITS.PART_SIZE_MIN) {
    partSize = LIMITS.PART_SIZE_MIN
  }
  /*
    파트가 0개인 업로드는 없다. 하한(UPLOAD_MIN_BYTES) 덕분에 실제로는
    일어나지 않지만, 0 을 돌려주면 서명할 파트가 없어 세션이 만들어지자마자
    죽는다 — 원인이 여기라는 것을 알아내기 어렵다.
  */
  return { partSize, totalParts: Math.max(1, Math.ceil(fileSize / partSize)) }
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot <= 0 ? '' : fileName.slice(dot).toLowerCase()
}

function isAllowedMime(mimeType: string): mimeType is AllowedUploadMime {
  return (ALLOWED_UPLOAD_MIME as readonly string[]).includes(mimeType)
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
  request: UploadRequest,
  capacity: Capacity,
): void {
  const { fileName, fileSize, mimeType } = request

  // 4. 용량 — 06 §2 는 두 경계 모두 E_UPLOAD_TOO_LARGE 로 묶는다.
  //    어느 쪽인지는 detail 로 구분한다.
  if (!Number.isFinite(fileSize) || fileSize < LIMITS.UPLOAD_MIN_BYTES) {
    throw new AppError('E_UPLOAD_TOO_LARGE', {
      reason: 'below-minimum',
      fileSize,
      minBytes: LIMITS.UPLOAD_MIN_BYTES,
    })
  }
  if (fileSize > capacity.uploadMaxBytes) {
    throw new AppError('E_UPLOAD_TOO_LARGE', {
      reason: 'above-tier-maximum',
      fileSize,
      maxBytes: capacity.uploadMaxBytes,
    })
  }

  // 5. MIME
  if (!isAllowedMime(mimeType)) {
    throw new AppError('E_UPLOAD_UNSUPPORTED_TYPE', {
      reason: 'mime-not-allowed',
      mimeType,
    })
  }

  /*
    6. 확장자가 MIME 과 맞는가.

    둘 다 클라이언트가 보낸 **신고값**이라 이 검사가 위조를 막지는 못한다.
    막는 것은 다른 것이다 — .mkv 를 video/mp4 라고 잘못 보내는 실수가
    트랜스코드까지 갔다가 ffprobe 에서 실패하는 낭비를 앞당겨 끊는다.
  */
  const extension = extensionOf(fileName)
  if (!MIME_EXTENSIONS[mimeType].includes(extension)) {
    throw new AppError('E_UPLOAD_UNSUPPORTED_TYPE', {
      reason: 'extension-mismatch',
      mimeType,
      extension,
    })
  }
}

/** 위 함수들이 던지는 에러가 카탈로그 밖으로 새지 않게 묶어 둔다. */
export type UploadPolicyError = AppError

/** 하한은 티어와 무관하다. 재노출해 호출자가 두 곳을 보지 않게 한다. */
export const UPLOAD_MIN_BYTES = LIMITS.UPLOAD_MIN_BYTES
