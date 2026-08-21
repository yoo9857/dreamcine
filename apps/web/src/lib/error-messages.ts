import type { Capacity, ErrorCode } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

/**
 * 티어 의존 숫자가 들어가는 문구는 반드시 함수형으로 둔다. 문자열에 용량을
 * 박으면 T1 승급 시 문구가 거짓이 된다. (09_ERROR_CATALOG.md §5)
 */
export type MessageEntry = string | ((capacity: Capacity) => string)

export function messageFor(_code: ErrorCode, _capacity: Capacity): string {
  throw new NotImplementedError('T03:errorMessages')
}
