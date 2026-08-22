import {
  AppError,
  decideComplete,
  type CompleteUploadInput,
  type CompleteUploadResult,
} from '@aidream/core'
import {
  createAsset,
  findAssetByUploadId,
  updateUploadStatus,
} from '@aidream/db'
import { QUEUE, enqueue } from '@aidream/queue'
import { BUCKET, completeMultipart } from '@aidream/storage'

import { getLogger } from '@/src/lib/logger'
import type { RouteSession } from '@/src/auth/types'

import {
  assertNotExpired,
  loadOwnedSession,
  requireS3UploadId,
} from './session-access'

/**
 * 멀티파트를 완료하고 자산을 만든 뒤 트랜스코드 잡을 발행한다.
 * (T05 §5 `completeUpload` 순서)
 *
 * **멱등성이 핵심이다.** 네트워크 재시도로 완료가 두 번 호출되는 일은 실제로
 * 자주 일어난다. 그때 자산이 두 개 생기면 트랜스코드 비용이 두 배가 된다.
 */
export async function completeUpload(
  session: RouteSession,
  uploadId: string,
  input: CompleteUploadInput,
): Promise<CompleteUploadResult> {
  const upload = await loadOwnedSession(session, uploadId)

  // 2·3. 이미 끝났는가, 되돌릴 수 없는 상태인가.
  const decision = decideComplete(upload.status)
  if (decision.kind === 'already-completed') {
    return alreadyCompleted(uploadId)
  }
  if (decision.kind === 'rejected') {
    throw new AppError(
      decision.code === 'ABORTED'
        ? 'E_UPLOAD_ABORTED'
        : 'E_UPLOAD_ALREADY_COMPLETED',
      { uploadId, status: upload.status },
    )
  }

  // 4. 만료
  assertNotExpired(upload)

  // 5. 파트가 다 있는가 — 없는 번호를 detail 로 알려줘야 그것만 다시 올린다.
  assertAllParts(input, upload.totalParts, uploadId)

  // 6. S3 완료
  const s3UploadId = requireS3UploadId(upload)
  const completed = await completeMultipartIdempotently(
    upload.objectKey,
    s3UploadId,
    input,
    uploadId,
  )
  if (completed === 'already-completed') {
    return alreadyCompleted(uploadId)
  }

  // 7. 세션 상태 + 자산 생성
  await updateUploadStatus(uploadId, 'UPLOADED')
  const asset = await createAsset({
    uploadId,
    originalKey: upload.objectKey,
    sizeBytes: BigInt(completed.sizeBytes),
  })

  // 8. 트랜스코드 발행 — jobId 를 assetId 로 고정해 중복을 막는다.
  await enqueueTranscode(asset.id)

  return { assetId: asset.id, status: asset.status }
}

async function alreadyCompleted(
  uploadId: string,
): Promise<CompleteUploadResult> {
  const asset = await findAssetByUploadId(uploadId)
  if (asset === null) {
    /*
      세션은 UPLOADED 인데 자산이 없다. 7번 트랜잭션이 반쪽만 반영된 것으로,
      여기서 새로 만들면 나중에 진짜 자산이 생겼을 때 둘이 된다.
      사람이 봐야 하는 상태다.
    */
    throw new AppError('E_INTERNAL', {
      reason: 'uploaded-without-asset',
      uploadId,
    })
  }
  return { assetId: asset.id, status: asset.status }
}

function assertAllParts(
  input: CompleteUploadInput,
  totalParts: number,
  uploadId: string,
): void {
  const present = new Set(input.parts.map((part) => part.partNumber))
  const missing: number[] = []
  for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
    if (!present.has(partNumber)) {
      missing.push(partNumber)
    }
  }
  if (missing.length > 0) {
    throw new AppError('E_UPLOAD_PART_MISSING', {
      uploadId,
      // 목록이 길어질 수 있다. 앞쪽만 보여도 사용자가 할 일은 같다.
      missingParts: missing.slice(0, 50),
      missingCount: missing.length,
    })
  }
}

/**
 * S3 완료. **410 을 곧이곧대로 믿지 않는다.**
 *
 * 완료 응답에는 크기가 없어 storage 계층이 직후 HeadObject 를 부른다. 완료는
 * 성공했는데 그 조회가 일시적으로 실패하면 호출자에게는 실패로 보이고,
 * 재시도하면 uploadId 가 이미 사라져 `NoSuchUpload` → 410 이 된다.
 * **성공한 업로드가 "세션 만료" 로 끝난다.** (OBS-015)
 *
 * 그래서 410 을 받으면 자산이 이미 있는지 먼저 본다. 있으면 멱등 처리다.
 */
async function completeMultipartIdempotently(
  objectKey: string,
  s3UploadId: string,
  input: CompleteUploadInput,
  uploadId: string,
): Promise<{ sizeBytes: number } | 'already-completed'> {
  try {
    return await completeMultipart(
      BUCKET.ORIGINALS,
      objectKey,
      s3UploadId,
      input.parts,
    )
  } catch (error: unknown) {
    const expired =
      error instanceof AppError && error.code === 'E_UPLOAD_SESSION_EXPIRED'
    if (expired && (await findAssetByUploadId(uploadId)) !== null) {
      return 'already-completed'
    }
    throw error
  }
}

/**
 * 발행 실패는 완료를 실패시키지 않는다.
 *
 * 사용자에게 실패라고 말하면 처음부터 다시 올리게 되고, 그게 더 나쁘다.
 * 자산은 PENDING 으로 남고 T06 의 복구 잡이 "10분 넘게 PENDING 인 자산" 을
 * 다시 발행한다. (T05 §5)
 */
async function enqueueTranscode(assetId: string): Promise<void> {
  try {
    await enqueue(QUEUE.VIDEO_TRANSCODE, { assetId }, { jobId: assetId })
  } catch (error: unknown) {
    getLogger().error(
      { err: error, assetId },
      'transcode enqueue failed; recovery job will pick it up',
    )
  }
}
