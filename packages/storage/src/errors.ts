import { AppError, type ErrorCode } from '@aidream/core'

/**
 * S3 에러 이름 → 우리 에러코드. 표의 출처는 T04 §6 이다.
 *
 * SDK 는 서비스가 돌려준 코드를 `error.name` 에 담는다. 상태코드보다 이름이
 * 정확하다 — 403 하나에 자격증명 오류와 정책 거부가 섞여 들어온다.
 */
const BY_NAME: Readonly<Record<string, ErrorCode>> = {
  // 설정 문제. 503 + 알럿이 옳다 — 사용자가 고칠 수 없다.
  AccessDenied: 'E_STORAGE_UNAVAILABLE',
  InvalidAccessKeyId: 'E_STORAGE_UNAVAILABLE',
  SignatureDoesNotMatch: 'E_STORAGE_UNAVAILABLE',
  NoSuchBucket: 'E_STORAGE_UNAVAILABLE',

  NoSuchKey: 'E_STORAGE_OBJECT_NOT_FOUND',
  NotFound: 'E_STORAGE_OBJECT_NOT_FOUND',

  // 세션 자체가 사라졌다. 410 — 다시 시작해야 한다.
  NoSuchUpload: 'E_UPLOAD_SESSION_EXPIRED',

  // 특정 파트가 문제다. 409 — 그 파트만 다시 올리면 된다.
  InvalidPart: 'E_UPLOAD_PART_MISSING',

  // 규격 위반. 400 — 다시 올려도 같은 결과다.
  InvalidPartOrder: 'E_UPLOAD_INVALID_PART',
  EntityTooSmall: 'E_UPLOAD_INVALID_PART',

  // 네트워크. SDK 재시도가 끝난 뒤에 온다.
  TimeoutError: 'E_STORAGE_UNAVAILABLE',
  RequestTimeout: 'E_STORAGE_UNAVAILABLE',
  RequestTimeTooSkewed: 'E_STORAGE_UNAVAILABLE',
}

interface S3ErrorShape {
  readonly name?: unknown
  readonly Code?: unknown
  readonly $metadata?: { readonly httpStatusCode?: unknown }
}

function shapeOf(error: unknown): S3ErrorShape {
  return typeof error === 'object' && error !== null
    ? (error as S3ErrorShape)
    : {}
}

/**
 * 이름은 `name` 에 오지만 XML 파싱 경로에 따라 `Code` 로만 오는 경우가 있다.
 * 둘 다 본다 — 한쪽만 보면 어떤 배포에서는 매핑이 조용히 풀린다.
 */
function errorName(error: unknown): string | null {
  const shape = shapeOf(error)
  for (const candidate of [shape.name, shape.Code]) {
    if (typeof candidate === 'string' && candidate !== '') {
      return candidate
    }
  }
  return null
}

function httpStatus(error: unknown): number | null {
  const status = shapeOf(error).$metadata?.httpStatusCode
  return typeof status === 'number' ? status : null
}

function byStatus(status: number): ErrorCode | null {
  if (status === 404) {
    return 'E_STORAGE_OBJECT_NOT_FOUND'
  }
  if (status === 401 || status === 403) {
    return 'E_STORAGE_UNAVAILABLE'
  }
  if (status >= 500) {
    return 'E_STORAGE_UNAVAILABLE'
  }
  return null
}

/**
 * S3 에러를 `AppError` 로 옮긴다.
 *
 * **모르는 에러는 `E_STORAGE_UNAVAILABLE` 로 보내지 않는다.** 그것은 503 이고
 * 재시도 가능으로 표시되어 있어서(09_ERROR_CATALOG §STORAGE), 우리 코드의
 * 버그가 "일시적 스토리지 장애" 로 위장된 채 영원히 재시도된다. 모르는 것은
 * `E_INTERNAL` 이어야 하고, 그래야 알럿이 울려 사람이 본다.
 *
 * 원인은 `detail` 에 남긴다 — `withRoute` 가 응답에는 넣지 않고 로그에만
 * 남기므로 내부 정보가 새지 않는다.
 */
export function mapS3Error(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  const name = errorName(error)
  const status = httpStatus(error)
  const detail: Record<string, unknown> = {}
  if (name !== null) {
    detail.s3Error = name
  }
  if (status !== null) {
    detail.httpStatus = status
  }

  const mapped =
    (name === null ? undefined : BY_NAME[name]) ??
    (status === null ? null : byStatus(status))

  return new AppError(mapped ?? 'E_INTERNAL', detail, error)
}

/**
 * S3 호출을 감싼다. 각 함수가 try/catch 를 반복하면 한 곳에서 빠뜨린다.
 */
export async function withS3<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error: unknown) {
    throw mapS3Error(error)
  }
}
