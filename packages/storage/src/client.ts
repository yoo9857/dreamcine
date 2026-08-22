import { NotImplementedError } from '@aidream/core'
import type { S3Client } from '@aws-sdk/client-s3'

import type { BucketKind } from './buckets.js'

/**
 * 일반 요청용 클라이언트. 재시도 3회 + 요청 타임아웃 30초. (T04 §6)
 *
 * `S3Client` 는 **배럴에서 내보내지 않는다.** 밖으로 새면 이 패키지를
 * 우회해 버킷 이름과 키를 조립하는 코드가 생긴다.
 */
export function s3(): S3Client {
  throw new NotImplementedError('T04:client')
}

/**
 * 대용량 스트리밍 다운로드 전용. **요청 타임아웃이 없다.**
 *
 * 일반 클라이언트로 원본을 내려받으면 30초에 끊긴다 — 20분 영상 원본은
 * 그보다 오래 걸린다. 이것을 놓치면 트랜스코드가 큰 파일에서만 실패한다.
 * (T04 §6 주의)
 */
export function s3Streaming(): S3Client {
  throw new NotImplementedError('T04:client')
}

/** 논리 버킷 → env 의 실제 버킷 이름. env 참조를 여기 한 곳에 모은다. */
export function bucketName(_kind: BucketKind): string {
  throw new NotImplementedError('T04:client')
}
