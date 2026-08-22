import { AppError, NotImplementedError } from '@aidream/core'

/**
 * S3 에러를 `AppError` 로 옮긴다. 매핑표는 T04 §6.
 *
 * 여기서 걸러지지 않은 것은 밖에서 `E_INTERNAL` 이 된다 — 그것이 알럿을
 * 울리므로 조용히 삼켜지지 않는다.
 */
export function mapS3Error(_error: unknown): AppError {
  throw new NotImplementedError('T04:storageErrors')
}
