import { NotImplementedError } from '@aidream/core'
import type { Readable } from 'node:stream'

import type { BucketKind } from './buckets.js'

export interface ObjectStream {
  readonly body: Readable
  readonly contentLength: number | null
  readonly contentType: string | null
}

/**
 * **메모리에 적재하지 않는다.** 원본은 GB 단위일 수 있다.
 * 스트리밍 전용 클라이언트를 쓴다 — 일반 클라이언트의 30초 타임아웃이
 * 걸리면 큰 파일에서만 실패한다. (T04 §6)
 */
export function getObjectStream(
  _bucket: BucketKind,
  _key: string,
): Promise<ObjectStream> {
  throw new NotImplementedError('T04:getObjectStream')
}
