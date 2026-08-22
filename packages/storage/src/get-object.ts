import { AppError } from '@aidream/core'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'

import { type BucketKind } from './buckets.js'
import { bucketName, s3Streaming } from './client.js'
import { withS3 } from './errors.js'

export interface ObjectStream {
  readonly body: Readable
  readonly contentLength: number | null
  readonly contentType: string | null
}

/**
 * SDK 의 `Body` 타입은 런타임에 따라 Blob·WebStream 도 될 수 있다. 캐스팅으로
 * 넘기면 다른 환경에서 조용히 깨지므로 실제로 확인한다.
 */
function asReadable(body: unknown): Readable {
  if (body instanceof Readable) {
    return body
  }
  throw new AppError('E_INTERNAL', { reason: 'unexpected-s3-body-type' })
}

/**
 * **메모리에 적재하지 않는다.** 원본은 GB 단위일 수 있다.
 *
 * 스트리밍 전용 클라이언트를 쓴다 — 일반 클라이언트의 30초 요청 타임아웃이
 * 걸리면 큰 파일에서만 실패한다. (T04 §6)
 */
export async function getObjectStream(
  bucket: BucketKind,
  key: string,
): Promise<ObjectStream> {
  const result = await withS3(() =>
    s3Streaming().send(
      new GetObjectCommand({ Bucket: bucketName(bucket), Key: key }),
    ),
  )
  return {
    body: asReadable(result.Body),
    contentLength: result.ContentLength ?? null,
    contentType: result.ContentType ?? null,
  }
}
