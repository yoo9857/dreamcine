import type { UploadSessionState } from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

import { loadOwnedSession } from './session-access'

/**
 * 재개용 상태 조회.
 *
 * `completedParts` 가 재개의 전부다 — 클라이언트는 이것을 보고 **누락분만**
 * 다시 올린다. 돌려주지 않으면 처음부터 올려야 하고, 그러면 재개라고
 * 부를 수 없다.
 */
export async function getUploadSession(
  session: RouteSession,
  uploadId: string,
): Promise<UploadSessionState> {
  const upload = await loadOwnedSession(session, uploadId)

  return {
    uploadId: upload.id,
    status: upload.status,
    fileName: upload.fileName,
    fileSize: Number(upload.fileSize),
    partSize: upload.partSize,
    totalParts: upload.totalParts,
    completedParts: completedPartNumbers(upload.completedParts),
    expiresAt: upload.expiresAt.toISOString(),
  }
}

/**
 * `completedParts` 는 스키마상 Json 이라 `unknown` 으로 온다.
 *
 * 모양을 믿지 않고 걸러 낸다 — 여기서 잘못된 값이 새면 클라이언트가 이미
 * 올린 파트를 건너뛰고, 그 사실은 완료 시점의 InvalidPart 로만 드러난다.
 */
function completedPartNumbers(raw: unknown): number[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const numbers = raw
    .map((entry) =>
      typeof entry === 'object' && entry !== null && 'partNumber' in entry
        ? (entry as { partNumber: unknown }).partNumber
        : undefined,
    )
    .filter(
      (value): value is number =>
        typeof value === 'number' && Number.isInteger(value) && value >= 1,
    )
  return [...new Set(numbers)].sort((left, right) => left - right)
}
