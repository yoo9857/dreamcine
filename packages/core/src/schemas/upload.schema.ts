import { z } from 'zod'

import { LIMITS } from '../limits.js'
import { ALLOWED_UPLOAD_MIME } from '../rules/upload-policy.js'

/**
 * 업로드 API 의 입출력 계약. (05_API_CONTRACT.md §3)
 *
 * **용량 상한은 여기서 검사하지 않는다.** 상한이 티어에 따라 달라지는데
 * (11_CAPACITY_TIERS.md §3) zod 스키마는 모듈 로드 시점에 고정된다. 여기에
 * 상한을 박으면 T0→T1 승급 때 스키마를 고쳐야 하고, 그것이 06 §2 가 금지하는
 * "리터럴로 박기" 다. 상한 판정은 `assertUploadAllowed(request, capacity)` 가
 * 한다 — 스키마는 **모양**만 본다.
 */
export const CreateUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  /** 하한만 본다. 상한은 capacity 가 판정한다. */
  fileSize: z.number().int().min(LIMITS.UPLOAD_MIN_BYTES),
  mimeType: z.enum(ALLOWED_UPLOAD_MIME),
  /** 참고용. 서버는 신뢰하지 않는다. */
  checksum: z.string().max(128).optional(),
})

export type CreateUploadInput = z.infer<typeof CreateUploadSchema>

export const SignedPartSchema = z.object({
  partNumber: z.number().int().min(1).max(LIMITS.PART_COUNT_MAX),
  url: z.string().url(),
  expiresAt: z.string().datetime(),
})

export const CreateUploadResultSchema = z.object({
  uploadId: z.string(),
  partSize: z.number().int().positive(),
  totalParts: z.number().int().min(1).max(LIMITS.PART_COUNT_MAX),
  parts: z.array(SignedPartSchema),
  expiresAt: z.string().datetime(),
})

export type CreateUploadResult = z.infer<typeof CreateUploadResultSchema>

/** 추가 파트 서명 요청. 한 번에 받는 수는 storage 계층이 제한한다. */
export const SignPartsSchema = z.object({
  partNumbers: z.array(z.number().int().min(1).max(LIMITS.PART_COUNT_MAX)),
})

export type SignPartsInput = z.infer<typeof SignPartsSchema>

export const CompletedPartSchema = z.object({
  partNumber: z.number().int().min(1).max(LIMITS.PART_COUNT_MAX),
  /**
   * 브라우저가 PUT 응답 헤더에서 읽은 값. 인용부호가 있을 수도 없을 수도
   * 있으므로 여기서 모양을 강제하지 않는다 — 정규화는 storage 계층의
   * `normalizeETag` 가 단일 지점으로 담당한다.
   */
  etag: z.string().min(1).max(256),
})

/** 순서는 무관하다. 서버가 정렬한다. (05_API_CONTRACT.md §3) */
export const CompleteUploadSchema = z.object({
  parts: z.array(CompletedPartSchema).min(1),
})

export type CompleteUploadInput = z.infer<typeof CompleteUploadSchema>

export const CompleteUploadResultSchema = z.object({
  assetId: z.string(),
  status: z.string(),
})

export type CompleteUploadResult = z.infer<typeof CompleteUploadResultSchema>

/**
 * 재개용 상태 조회 결과.
 *
 * `completedParts` 를 돌려주는 것이 재개의 핵심이다 — 클라이언트는 이것을
 * 보고 **누락분만** 다시 올린다. 없으면 처음부터 올려야 한다.
 */
export const UploadSessionStateSchema = z.object({
  uploadId: z.string(),
  status: z.string(),
  fileName: z.string(),
  fileSize: z.number().int(),
  partSize: z.number().int().positive(),
  totalParts: z.number().int().min(1),
  completedParts: z.array(z.number().int().min(1)),
  expiresAt: z.string().datetime(),
})

export type UploadSessionState = z.infer<typeof UploadSessionStateSchema>
