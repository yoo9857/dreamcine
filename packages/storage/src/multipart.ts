import { NotImplementedError } from '@aidream/core'

import type { BucketKind } from './buckets.js'
import type { PresignedUrl } from './presign.js'

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

/** 한 번에 서명하는 파트 수 상한. 그 이상은 추가 발급으로 나눈다. (06 §2) */
export const MAX_PARTS_PER_SIGN = 100

export function createMultipart(
  _bucket: BucketKind,
  _key: string,
  _contentType: string,
): Promise<CreateMultipartResult> {
  throw new NotImplementedError('T04:createMultipart')
}

export function signParts(
  _bucket: BucketKind,
  _key: string,
  _uploadId: string,
  _partNumbers: readonly number[],
  _ttlSec: number,
): Promise<readonly SignedPart[]> {
  throw new NotImplementedError('T04:signParts')
}

export function completeMultipart(
  _bucket: BucketKind,
  _key: string,
  _uploadId: string,
  _parts: readonly CompletedPart[],
): Promise<CompletedUpload> {
  throw new NotImplementedError('T04:completeMultipart')
}

/** 대상이 이미 없어도 성공으로 본다 — 멱등. (T04 §6) */
export function abortMultipart(
  _bucket: BucketKind,
  _key: string,
  _uploadId: string,
): Promise<void> {
  throw new NotImplementedError('T04:abortMultipart')
}

/**
 * 미완료 멀티파트 업로드는 **비용을 계속 발생시킨다.** 정리 잡이 이것으로
 * 찾아 abort 한다. 빼먹으면 몇 달 뒤 원인 불명의 요금이 쌓인다. (06 §2)
 */
export function listStaleMultipartUploads(
  _bucket: BucketKind,
  _olderThan: Date,
): Promise<readonly StaleUpload[]> {
  throw new NotImplementedError('T04:listStaleMultipartUploads')
}
