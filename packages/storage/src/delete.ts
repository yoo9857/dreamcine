import { AppError } from '@aidream/core'
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'

import { type BucketKind } from './buckets.js'
import { bucketName, s3 } from './client.js'
import { withS3 } from './errors.js'

export interface DeletePrefixResult {
  readonly deleted: number
  /** 지우지 못한 키. 호출자가 재시도 큐에 다시 넣는다. (T04 §6) */
  readonly failed: readonly string[]
}

/** S3 의 DeleteObjects 한 번에 담을 수 있는 키 수. */
const DELETE_BATCH_SIZE = 1000

/**
 * 프리픽스는 **반드시 `/` 로 끝나야 한다.**
 *
 * `hls/ast_1` 로 지우면 `hls/ast_10/…`, `hls/ast_123/…` 까지 함께 지워진다.
 * 형제 자산이 조용히 사라지고, 원인은 몇 주 뒤 "영상이 재생되지 않는다" 로
 * 나타난다. 한 객체를 지우려면 `deleteObject` 를 쓴다.
 */
function assertPrefix(prefix: string): string {
  if (prefix === '' || !prefix.endsWith('/')) {
    throw new AppError('E_INTERNAL', {
      reason: 'prefix-must-end-with-slash',
      prefix,
    })
  }
  return prefix
}

/**
 * 대상이 이미 없어도 성공으로 본다 — S3 의 DeleteObject 자체가 멱등이다.
 * (T04 §6)
 */
export async function deleteObject(
  bucket: BucketKind,
  key: string,
): Promise<void> {
  await withS3(() =>
    s3().send(
      new DeleteObjectCommand({ Bucket: bucketName(bucket), Key: key }),
    ),
  )
}

async function deleteBatch(
  bucketId: string,
  keys: readonly string[],
): Promise<readonly string[]> {
  const result = await withS3(() =>
    s3().send(
      new DeleteObjectsCommand({
        Bucket: bucketId,
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
      }),
    ),
  )
  /*
    DeleteObjects 는 **부분 실패**를 200 응답 안에 담아 보낸다. 예외가 나지
    않으므로 Errors 를 읽지 않으면 "전부 지웠다" 고 착각한다.
  */
  return (result.Errors ?? [])
    .map((entry) => entry.Key)
    .filter((key): key is string => key !== undefined)
}

/**
 * 1000개 단위 배치 + 페이지네이션. 에피소드 삭제가 이것을 쓴다.
 *
 * 페이지를 받아 **바로 지운다.** 전체 목록을 모아 두면 세그먼트가 수만 개인
 * 자산에서 메모리에 키 배열이 쌓인다.
 */
export async function deletePrefix(
  bucket: BucketKind,
  prefix: string,
): Promise<DeletePrefixResult> {
  const safePrefix = assertPrefix(prefix)
  const bucketId = bucketName(bucket)
  const failed: string[] = []
  let deleted = 0
  let continuationToken: string | undefined

  do {
    const page = await withS3(() =>
      s3().send(
        new ListObjectsV2Command({
          Bucket: bucketId,
          Prefix: safePrefix,
          MaxKeys: DELETE_BATCH_SIZE,
          ...(continuationToken === undefined
            ? {}
            : { ContinuationToken: continuationToken }),
        }),
      ),
    )

    const keys = (page.Contents ?? [])
      .map((object) => object.Key)
      .filter((key): key is string => key !== undefined)

    if (keys.length > 0) {
      const batchFailed = await deleteBatch(bucketId, keys)
      failed.push(...batchFailed)
      deleted += keys.length - batchFailed.length
    }

    continuationToken =
      page.IsTruncated === true ? page.NextContinuationToken : undefined
  } while (continuationToken !== undefined)

  return { deleted, failed }
}

export { assertPrefix }
