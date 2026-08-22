import { AppError } from '@aidream/core'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import type { Readable } from 'node:stream'

import { type BucketKind } from './buckets.js'
import { bucketName, s3 } from './client.js'
import { withS3 } from './errors.js'

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
  /**
   * 스트림을 넘길 때는 **필수**다. SDK 는 길이를 모르는 스트림의 크기를
   * 알아낼 수 없어 "Cannot determine length of stream" 으로 실패한다.
   * 파일에서 읽는 경우 `stat().size` 가 그 값이다.
   */
  readonly contentLength?: number
}

export async function putObject(
  input: PutObjectInput,
): Promise<{ etag: string }> {
  if (!Buffer.isBuffer(input.body) && input.contentLength === undefined) {
    /*
      SDK 에 맡기면 "Cannot determine length of stream" 이라는 낯선 메시지가
      호출 지점에서 멀리 떨어진 곳에서 난다. 여기서 무엇이 빠졌는지 말한다.
    */
    throw new AppError('E_INTERNAL', {
      reason: 'stream-without-content-length',
      key: input.key,
    })
  }

  const result = await withS3(() =>
    s3().send(
      new PutObjectCommand({
        Bucket: bucketName(input.bucket),
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: input.cacheControl,
        ...(input.contentLength === undefined
          ? {}
          : { ContentLength: input.contentLength }),
      }),
    ),
  )
  return { etag: result.ETag ?? '' }
}
