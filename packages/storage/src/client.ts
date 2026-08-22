import { ServerEnvSchema } from '@aidream/core'
import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3'

import { BUCKET, type BucketKind } from './buckets.js'

/** T04 §6 — SDK 재시도 3회. */
const MAX_ATTEMPTS = 3

const CONNECTION_TIMEOUT_MS = 5_000
const REQUEST_TIMEOUT_MS = 30_000

export type ClientMode = 'default' | 'streaming'

/**
 * env 는 필요한 항목만 읽는다. 스토리지가 동작하기 위해 SMTP 설정까지
 * 갖춰져 있어야 할 이유는 없다.
 */
function credentials(): {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
} {
  const shape = ServerEnvSchema.shape
  return {
    endpoint: shape.S3_ENDPOINT.parse(process.env.S3_ENDPOINT),
    region: shape.S3_REGION.parse(process.env.S3_REGION),
    accessKeyId: shape.S3_ACCESS_KEY_ID.parse(process.env.S3_ACCESS_KEY_ID),
    secretAccessKey: shape.S3_SECRET_ACCESS_KEY.parse(
      process.env.S3_SECRET_ACCESS_KEY,
    ),
  }
}

/**
 * 설정 조립을 순수 함수로 떼어 둔다. `s3()` 와 `s3Streaming()` 의 차이가
 * 주석이 아니라 **테스트로 고정**되어야 하기 때문이다.
 *
 * `streaming` 에는 `requestTimeout` 이 없다. 일반 설정(30초)으로 원본을
 * 내려받으면 20분 영상에서 끊긴다 — 큰 파일에서만 실패하는 버그가 된다.
 * (T04 §6 주의)
 *
 * `forcePathStyle` 은 항상 켠다. MinIO 는 path-style 을 요구하고 Linode
 * Object Storage 는 둘 다 지원하므로, 켜 두면 개발·CI·프로덕션이 같은
 * 방식으로 말한다. 서명 URL 도 `{endpoint}/{bucket}/{key}` 한 형태로 나온다.
 */
export function buildS3Config(mode: ClientMode): S3ClientConfig {
  const { endpoint, region, accessKeyId, secretAccessKey } = credentials()
  return {
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    maxAttempts: MAX_ATTEMPTS,
    requestHandler: {
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      ...(mode === 'streaming' ? {} : { requestTimeout: REQUEST_TIMEOUT_MS }),
    },
  }
}

const clients = new Map<ClientMode, S3Client>()

/**
 * 요청마다 새로 만들지 않는다 — 클라이언트마다 커넥션 풀을 들고 있다.
 * `S3Client` 는 배럴에서 내보내지 않는다. 밖으로 새면 이 패키지를 우회해
 * 버킷 이름과 키를 조립하는 코드가 생긴다.
 */
function client(mode: ClientMode): S3Client {
  const existing = clients.get(mode)
  if (existing !== undefined) {
    return existing
  }
  const created = new S3Client(buildS3Config(mode))
  clients.set(mode, created)
  return created
}

export function s3(): S3Client {
  return client('default')
}

/** 대용량 스트리밍 다운로드 전용. 요청 타임아웃이 없다. */
export function s3Streaming(): S3Client {
  return client('streaming')
}

/** 테스트가 env 를 바꿔 가며 확인할 수 있도록 캐시를 비운다. */
export function resetS3Clients(): void {
  for (const instance of clients.values()) {
    instance.destroy()
  }
  clients.clear()
}

const BUCKET_ENV: Readonly<Record<BucketKind, string>> = {
  [BUCKET.ORIGINALS]: 'S3_BUCKET_ORIGINALS',
  [BUCKET.HLS]: 'S3_BUCKET_HLS',
  [BUCKET.THUMBS]: 'S3_BUCKET_THUMBS',
}

/**
 * 논리 버킷 → env 의 실제 이름. 버킷 이름 문자열이 코드에 박히지 않게
 * 하는 유일한 통로다.
 */
export function bucketName(kind: BucketKind): string {
  const variable = BUCKET_ENV[kind]
  const shape = ServerEnvSchema.shape
  switch (kind) {
    case BUCKET.ORIGINALS:
      return shape.S3_BUCKET_ORIGINALS.parse(process.env[variable])
    case BUCKET.HLS:
      return shape.S3_BUCKET_HLS.parse(process.env[variable])
    case BUCKET.THUMBS:
      return shape.S3_BUCKET_THUMBS.parse(process.env[variable])
  }
}
