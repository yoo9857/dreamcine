import { NotImplementedError } from '@aidream/core'
import type { Readable } from 'node:stream'

import type { BucketKind } from './buckets.js'

/**
 * `cacheControl` 을 **optional 로 두지 않는다.** optional 이면 반드시
 * 빠뜨리고, 빠뜨리면 CDN 이 캐시하지 않아 오리진 비용이 조용히 늘어난다.
 * 값은 `cache-presets.ts` 에서 고른다. (T04 §5)
 */
export interface PutObjectInput {
  readonly bucket: BucketKind
  readonly key: string
  readonly body: Buffer | Readable
  readonly contentType: string
  readonly cacheControl: string
}

export function putObject(_input: PutObjectInput): Promise<{ etag: string }> {
  throw new NotImplementedError('T04:putObject')
}
