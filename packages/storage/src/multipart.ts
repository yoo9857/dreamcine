import { AppError, LIMITS } from '@aidream/core'
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  HeadObjectCommand,
  ListMultipartUploadsCommand,
  ListPartsCommand,
  UploadPartCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { type BucketKind } from './buckets.js'
import { bucketName, s3 } from './client.js'
import { withS3 } from './errors.js'
import { assertTtl, type PresignedUrl } from './presign.js'

export interface CreateMultipartResult {
  readonly uploadId: string
  readonly key: string
}

export interface SignedPart extends PresignedUrl {
  readonly partNumber: number
}

export interface CompletedPart {
  readonly partNumber: number
  readonly etag: string
}

export interface CompletedUpload {
  readonly etag: string
  readonly sizeBytes: number
}

export interface StaleUpload {
  readonly key: string
  readonly uploadId: string
  readonly initiated: Date
}

/**
 * 진행 중 멀티파트에 실제로 저장된 파트를 읽는다.
 *
 * 브라우저는 새로고침 뒤 File/ETag 목록을 복원할 수 없으므로 재개 상태의
 * SSOT는 Object Storage다. S3 ListParts는 한 페이지가 최대 1,000개라
 * 10,000파트 상한까지 페이지네이션을 반드시 따라간다.
 */
export async function listUploadedParts(
  bucket: BucketKind,
  key: string,
  uploadId: string,
): Promise<readonly CompletedPart[]> {
  const bucketId = bucketName(bucket)
  const parts: CompletedPart[] = []
  let partNumberMarker: string | undefined

  do {
    const page = await withS3(() =>
      s3().send(
        new ListPartsCommand({
          Bucket: bucketId,
          Key: key,
          UploadId: uploadId,
          ...(partNumberMarker === undefined
            ? {}
            : { PartNumberMarker: partNumberMarker }),
        }),
      ),
    )

    for (const part of page.Parts ?? []) {
      if (
        part.PartNumber !== undefined &&
        part.ETag !== undefined &&
        part.ETag !== ''
      ) {
        parts.push({ partNumber: part.PartNumber, etag: part.ETag })
      }
    }
    partNumberMarker =
      page.IsTruncated === true ? page.NextPartNumberMarker : undefined
  } while (partNumberMarker !== undefined)

  return sortParts(parts)
}

/** 한 번에 서명하는 파트 수 상한. 그 이상은 추가 발급으로 나눈다. (06 §2) */
export const MAX_PARTS_PER_SIGN = 100

const QUOTES = /^"+|"+$/gu

/**
 * S3 의 ETag 는 큰따옴표로 감싸여 온다: `"abc123"`. 브라우저가 받은 값을 그대로
 * 보내면 인용부호가 포함되고, 어떤 클라이언트는 벗겨서 보낸다. 두 겹이나 없음
 * 모두 `InvalidPart` 가 되므로 **정확히 한 겹**으로 정규화한다.
 *
 * 실제 S3 가 무엇을 받아들이는지는 통합 테스트가 확정한다 (T04 §5).
 */
export function normalizeETag(etag: string): string {
  const bare = etag.trim().replace(QUOTES, '')
  if (bare === '') {
    throw new AppError('E_UPLOAD_PART_MISSING', { reason: 'empty-etag' })
  }
  return `"${bare}"`
}

/**
 * 파트 번호를 검증한다. `max` 가 다른 이유: 한 번에 **서명**하는 수는 100 개로
 * 제한하지만(06 §2), **완료**할 때는 전체 파트가 한꺼번에 온다(최대 10,000).
 * 하나의 상한을 두면 큰 파일을 완료할 수 없거나 서명 배치가 무제한이 된다.
 */
export function assertPartNumbers(
  partNumbers: readonly number[],
  max: number,
): readonly number[] {
  if (partNumbers.length === 0) {
    throw new AppError('E_UPLOAD_INVALID_PART', { reason: 'no-parts' })
  }
  if (partNumbers.length > max) {
    throw new AppError('E_UPLOAD_INVALID_PART', {
      reason: 'too-many-parts',
      count: partNumbers.length,
      max,
    })
  }

  const seen = new Set<number>()
  for (const partNumber of partNumbers) {
    const inRange =
      Number.isInteger(partNumber) &&
      partNumber >= 1 &&
      partNumber <= LIMITS.PART_COUNT_MAX
    if (!inRange) {
      throw new AppError('E_UPLOAD_INVALID_PART', {
        reason: 'out-of-range',
        partNumber,
      })
    }
    if (seen.has(partNumber)) {
      throw new AppError('E_UPLOAD_INVALID_PART', {
        reason: 'duplicate-part',
        partNumber,
      })
    }
    seen.add(partNumber)
  }
  return partNumbers
}

/**
 * S3 는 파트를 **번호 순서로** 받아야 한다. 클라이언트는 완료된 순서대로
 * 보내므로 뒤섞여 온다 — 여기서 정렬하지 않으면 `InvalidPartOrder` 가 된다.
 */
export function sortParts(
  parts: readonly CompletedPart[],
): readonly CompletedPart[] {
  return [...parts].sort((left, right) => left.partNumber - right.partNumber)
}

export async function createMultipart(
  bucket: BucketKind,
  key: string,
  contentType: string,
): Promise<CreateMultipartResult> {
  const result = await withS3(() =>
    s3().send(
      new CreateMultipartUploadCommand({
        Bucket: bucketName(bucket),
        Key: key,
        ContentType: contentType,
      }),
    ),
  )
  const uploadId = result.UploadId
  if (uploadId === undefined || uploadId === '') {
    // 성공 응답에 uploadId 가 없으면 이후 모든 파트가 갈 곳이 없다.
    throw new AppError('E_STORAGE_UNAVAILABLE', { reason: 'no-upload-id' })
  }
  return { uploadId, key }
}

export async function signParts(
  bucket: BucketKind,
  key: string,
  uploadId: string,
  partNumbers: readonly number[],
  ttlSec: number,
): Promise<readonly SignedPart[]> {
  assertPartNumbers(partNumbers, MAX_PARTS_PER_SIGN)
  const expiresIn = assertTtl(ttlSec)
  const bucketId = bucketName(bucket)
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  return withS3(() =>
    Promise.all(
      partNumbers.map(async (partNumber) => ({
        partNumber,
        expiresAt,
        url: await getSignedUrl(
          s3(),
          new UploadPartCommand({
            Bucket: bucketId,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
          }),
          { expiresIn },
        ),
      })),
    ),
  )
}

export async function completeMultipart(
  bucket: BucketKind,
  key: string,
  uploadId: string,
  parts: readonly CompletedPart[],
): Promise<CompletedUpload> {
  const ordered = sortParts(parts)
  assertPartNumbers(
    ordered.map((part) => part.partNumber),
    LIMITS.PART_COUNT_MAX,
  )
  const bucketId = bucketName(bucket)

  const completed = await withS3(() =>
    s3().send(
      new CompleteMultipartUploadCommand({
        Bucket: bucketId,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: ordered.map((part) => ({
            PartNumber: part.partNumber,
            ETag: normalizeETag(part.etag),
          })),
        },
      }),
    ),
  )

  /*
    완료 응답에는 크기가 없다. 업로드 총량 회계(06 §2)가 크기를 필요로 하므로
    HeadObject 로 **실제 저장된 값**을 읽는다. 파트 크기의 합을 쓰면
    클라이언트가 신고한 값을 믿는 셈이 된다.
  */
  const head = await withS3(() =>
    s3().send(new HeadObjectCommand({ Bucket: bucketId, Key: key })),
  )

  return {
    etag: completed.ETag ?? head.ETag ?? '',
    sizeBytes: head.ContentLength ?? 0,
  }
}

/**
 * 대상이 이미 없어도 성공으로 본다 — 멱등. 정리 잡이 같은 세션을 두 번
 * 만나는 것은 정상이고, 그때마다 실패하면 잡이 영원히 재시도된다. (T04 §6)
 */
export async function abortMultipart(
  bucket: BucketKind,
  key: string,
  uploadId: string,
): Promise<void> {
  try {
    await withS3(() =>
      s3().send(
        new AbortMultipartUploadCommand({
          Bucket: bucketName(bucket),
          Key: key,
          UploadId: uploadId,
        }),
      ),
    )
  } catch (error: unknown) {
    if (
      error instanceof AppError &&
      error.code === 'E_UPLOAD_SESSION_EXPIRED'
    ) {
      return
    }
    throw error
  }
}

/**
 * 미완료 멀티파트 업로드는 **비용을 계속 발생시킨다.** 정리 잡이 이것으로
 * 찾아 abort 한다. 빼먹으면 몇 달 뒤 원인 불명의 요금이 쌓인다. (06 §2)
 *
 * 페이지네이션을 반드시 따라간다 — 첫 페이지만 보면 쌓인 것을 영원히 놓친다.
 */
export async function listStaleMultipartUploads(
  bucket: BucketKind,
  olderThan: Date,
): Promise<readonly StaleUpload[]> {
  const bucketId = bucketName(bucket)
  const stale: StaleUpload[] = []
  let keyMarker: string | undefined
  let uploadIdMarker: string | undefined

  do {
    const page = await withS3(() =>
      s3().send(
        new ListMultipartUploadsCommand({
          Bucket: bucketId,
          ...(keyMarker === undefined ? {} : { KeyMarker: keyMarker }),
          ...(uploadIdMarker === undefined
            ? {}
            : { UploadIdMarker: uploadIdMarker }),
        }),
      ),
    )

    for (const upload of page.Uploads ?? []) {
      const { Key, UploadId, Initiated } = upload
      if (
        Key === undefined ||
        UploadId === undefined ||
        Initiated === undefined
      ) {
        continue
      }
      if (Initiated.getTime() < olderThan.getTime()) {
        stale.push({ key: Key, uploadId: UploadId, initiated: Initiated })
      }
    }

    keyMarker = page.IsTruncated === true ? page.NextKeyMarker : undefined
    uploadIdMarker =
      page.IsTruncated === true ? page.NextUploadIdMarker : undefined
  } while (keyMarker !== undefined)

  return stale
}
