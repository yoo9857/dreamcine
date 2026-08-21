import { NotImplementedError } from '@aidream/core'

/** ULID 는 26자 Crockford base32 다. 외부 패키지 없이 생성한다. */
export const REQUEST_ID_LENGTH = 26

export function createRequestId(): string {
  throw new NotImplementedError('T03:requestId')
}
