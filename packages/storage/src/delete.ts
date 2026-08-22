import { NotImplementedError } from '@aidream/core'

import type { BucketKind } from './buckets.js'

export interface DeletePrefixResult {
  readonly deleted: number
  /** 지우지 못한 키. 호출자가 재시도 큐에 다시 넣는다. (T04 §6) */
  readonly failed: readonly string[]
}

/** 대상이 이미 없어도 성공으로 본다 — 멱등. (T04 §6) */
export function deleteObject(_bucket: BucketKind, _key: string): Promise<void> {
  throw new NotImplementedError('T04:deletePrefix')
}

/** 1000개 단위 배치 + 페이지네이션. 에피소드 삭제가 이것을 쓴다. */
export function deletePrefix(
  _bucket: BucketKind,
  _prefix: string,
): Promise<DeletePrefixResult> {
  throw new NotImplementedError('T04:deletePrefix')
}
