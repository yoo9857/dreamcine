import { randomBytes, randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { BUCKET, type BucketKind } from './buckets.js'
import { IMMUTABLE_1Y, NO_STORE } from './cache-presets.js'
import { bucketName, resetS3Clients } from './client.js'
import { cdnUrl } from './cdn.js'
import { deleteObject, deletePrefix } from './delete.js'
import { getObjectStream } from './get-object.js'
import {
  abortMultipart,
  completeMultipart,
  createMultipart,
  listStaleMultipartUploads,
  signParts,
  type CompletedPart,
} from './multipart.js'
import { presignGet } from './presign.js'
import { putObject } from './put-object.js'

/**
 * 실제 MinIO 를 요구한다. **모킹하지 않는다** — S3 호환성 문제는 모킹으로
 * 잡히지 않는다 (T04 §7). CI 는 `docker-compose.dev.yml` 로 MinIO 를 띄우므로
 * 항상 실행된다. 로컬에 S3_ENDPOINT 가 없으면 건너뛴다.
 *
 * CI 에서 S3_ENDPOINT 가 비어 있으면 **건너뛰지 않고 실패한다** — 조용히
 * 통과하는 통합 테스트는 하네스를 무력화한다. (ISS-005)
 */
const hasS3 = process.env.S3_ENDPOINT !== undefined
const runningInCi = process.env.CI !== undefined
const skip = !hasS3 && !runningInCi

/** 실행마다 고유한 공간. 재실행이 서로를 지우지 않게 한다. */
const RUN = randomUUID().replaceAll('-', '').slice(0, 12)
const ORIGINALS_PREFIX = `originals/it_${RUN}/`
const HLS_PREFIX = `hls/it_${RUN}/`

/** S3 멀티파트의 마지막 아닌 파트는 5MiB 이상이어야 한다. */
const MIN_PART_BYTES = 5 * 1024 * 1024

async function putPart(url: string, body: Buffer): Promise<string> {
  const response = await fetch(url, { method: 'PUT', body })
  expect(response.status).toBe(200)
  const etag = response.headers.get('etag')
  expect(etag).not.toBeNull()
  return etag ?? ''
}

async function readAll(
  key: string,
  bucket: BucketKind = BUCKET.ORIGINALS,
): Promise<Buffer> {
  const stream = await getObjectStream(bucket, key)
  const chunks: Buffer[] = []
  for await (const chunk of stream.body) {
    chunks.push(Buffer.from(chunk as Uint8Array))
  }
  return Buffer.concat(chunks)
}

interface StagedUpload {
  readonly uploadId: string
  readonly parts: readonly CompletedPart[]
  readonly body: Buffer
}

/** 두 파트를 올려 완료 직전 상태까지 만든다. */
async function uploadTwoParts(key: string): Promise<StagedUpload> {
  const { uploadId } = await createMultipart(BUCKET.ORIGINALS, key, 'video/mp4')
  const first = randomBytes(MIN_PART_BYTES)
  const second = randomBytes(1024)
  const bodies = new Map([
    [1, first],
    [2, second],
  ])

  const signed = await signParts(BUCKET.ORIGINALS, key, uploadId, [1, 2], 600)
  const parts: CompletedPart[] = []
  for (const part of signed) {
    const body = bodies.get(part.partNumber) ?? first
    parts.push({
      partNumber: part.partNumber,
      etag: await putPart(part.url, body),
    })
  }

  return { uploadId, parts, body: Buffer.concat([first, second]) }
}

beforeAll(() => {
  process.env.S3_ENDPOINT ??= 'http://127.0.0.1:9000'
  process.env.S3_REGION ??= 'us-east-1'
  process.env.S3_ACCESS_KEY_ID ??= 'aidream-local'
  process.env.S3_SECRET_ACCESS_KEY ??= 'aidream-local-secret'
  process.env.S3_BUCKET_ORIGINALS ??= 'aidream-originals'
  process.env.S3_BUCKET_HLS ??= 'aidream-hls'
  process.env.S3_BUCKET_THUMBS ??= 'aidream-thumbs'
  process.env.CDN_BASE_URL ??= 'http://127.0.0.1:9000/aidream-hls'
})

afterAll(async () => {
  if (skip) {
    return
  }
  await deletePrefix(BUCKET.ORIGINALS, ORIGINALS_PREFIX)
  await deletePrefix(BUCKET.HLS, HLS_PREFIX)
  resetS3Clients()
})

describe.skipIf(skip)('멀티파트 왕복', () => {
  it('create → sign → PUT → complete 가 원본과 같은 바이트를 만든다', async () => {
    const key = `${ORIGINALS_PREFIX}roundtrip.mp4`
    const staged = await uploadTwoParts(key)

    const completed = await completeMultipart(
      BUCKET.ORIGINALS,
      key,
      staged.uploadId,
      staged.parts,
    )

    expect(completed.sizeBytes).toBe(staged.body.byteLength)
    expect(completed.etag).not.toBe('')
    // 스트림으로 읽어 바이트가 정확히 같은지 본다.
    expect(await readAll(key)).toEqual(staged.body)
  }, 120_000)

  it('파트 순서를 뒤섞어 보내도 성공한다', async () => {
    // 클라이언트는 완료된 순서대로 보내므로 뒤섞여 온다. 정렬하지 않으면
    // InvalidPartOrder 가 된다.
    const key = `${ORIGINALS_PREFIX}shuffled.mp4`
    const staged = await uploadTwoParts(key)

    const completed = await completeMultipart(
      BUCKET.ORIGINALS,
      key,
      staged.uploadId,
      [...staged.parts].reverse(),
    )

    expect(completed.sizeBytes).toBe(staged.body.byteLength)
  }, 120_000)

  it('ETag 에 인용부호가 없어도 완료된다', async () => {
    // 어떤 클라이언트는 헤더 값의 인용부호를 벗겨 보낸다. 정규화가 실제로
    // 통하는지는 여기서만 확인된다. (T04 §5 ETag 함정)
    const key = `${ORIGINALS_PREFIX}bare-etag.mp4`
    const staged = await uploadTwoParts(key)

    const completed = await completeMultipart(
      BUCKET.ORIGINALS,
      key,
      staged.uploadId,
      staged.parts.map((part) => ({
        partNumber: part.partNumber,
        etag: part.etag.replaceAll('"', ''),
      })),
    )

    expect(completed.sizeBytes).toBe(staged.body.byteLength)
  }, 120_000)

  it('올리지 않은 파트를 포함하면 파트 누락으로 거부된다', async () => {
    const key = `${ORIGINALS_PREFIX}missing-part.mp4`
    const staged = await uploadTwoParts(key)

    await expect(
      completeMultipart(BUCKET.ORIGINALS, key, staged.uploadId, [
        ...staged.parts,
        { partNumber: 3, etag: '"0123456789abcdef0123456789abcdef"' },
      ]),
    ).rejects.toMatchObject({ code: 'E_UPLOAD_PART_MISSING' })

    await abortMultipart(BUCKET.ORIGINALS, key, staged.uploadId)
  }, 120_000)

  it('ETag 가 틀리면 파트 누락으로 거부된다', async () => {
    const key = `${ORIGINALS_PREFIX}bad-etag.mp4`
    const staged = await uploadTwoParts(key)

    await expect(
      completeMultipart(
        BUCKET.ORIGINALS,
        key,
        staged.uploadId,
        staged.parts.map((part) => ({
          partNumber: part.partNumber,
          etag: '"ffffffffffffffffffffffffffffffff"',
        })),
      ),
    ).rejects.toMatchObject({ code: 'E_UPLOAD_PART_MISSING' })

    await abortMultipart(BUCKET.ORIGINALS, key, staged.uploadId)
  }, 120_000)
})

describe.skipIf(skip)('멀티파트 중단과 정리', () => {
  it('abort 후 complete 는 세션 만료다', async () => {
    const key = `${ORIGINALS_PREFIX}aborted.mp4`
    const staged = await uploadTwoParts(key)

    await abortMultipart(BUCKET.ORIGINALS, key, staged.uploadId)

    await expect(
      completeMultipart(BUCKET.ORIGINALS, key, staged.uploadId, staged.parts),
    ).rejects.toMatchObject({ code: 'E_UPLOAD_SESSION_EXPIRED' })
  }, 120_000)

  it('abort 를 두 번 해도 성공한다', async () => {
    // 정리 잡이 같은 세션을 두 번 만나는 것은 정상이다. 실패하면 잡이
    // 영원히 재시도된다.
    const key = `${ORIGINALS_PREFIX}double-abort.mp4`
    const { uploadId } = await createMultipart(
      BUCKET.ORIGINALS,
      key,
      'video/mp4',
    )

    await abortMultipart(BUCKET.ORIGINALS, key, uploadId)
    await expect(
      abortMultipart(BUCKET.ORIGINALS, key, uploadId),
    ).resolves.toBeUndefined()
  }, 60_000)

  it('미완료 업로드를 정리 대상으로 찾아낸다', async () => {
    // 미완료 멀티파트는 비용을 계속 발생시킨다. 찾지 못하면 몇 달 뒤
    // 원인 불명의 요금이 쌓인다. (06 §2)
    const key = `${ORIGINALS_PREFIX}stale.mp4`
    const { uploadId } = await createMultipart(
      BUCKET.ORIGINALS,
      key,
      'video/mp4',
    )

    const stale = await listStaleMultipartUploads(
      BUCKET.ORIGINALS,
      new Date(Date.now() + 60_000),
    )
    const found = stale.find((entry) => entry.uploadId === uploadId)

    expect(found).toBeDefined()
    expect(found?.key).toBe(key)

    await abortMultipart(BUCKET.ORIGINALS, key, uploadId)
  }, 60_000)

  it('기준 시각보다 최근인 업로드는 대상이 아니다', async () => {
    const key = `${ORIGINALS_PREFIX}fresh.mp4`
    const { uploadId } = await createMultipart(
      BUCKET.ORIGINALS,
      key,
      'video/mp4',
    )

    const stale = await listStaleMultipartUploads(
      BUCKET.ORIGINALS,
      new Date(Date.now() - 60_000),
    )

    expect(stale.some((entry) => entry.uploadId === uploadId)).toBe(false)

    await abortMultipart(BUCKET.ORIGINALS, key, uploadId)
  }, 60_000)
})

describe.skipIf(skip)('putObject 와 캐시 헤더', () => {
  it('Cache-Control 이 실제로 저장된다', async () => {
    // 빠뜨리면 CDN 이 캐시하지 않아 오리진 비용이 조용히 늘어난다.
    const key = `${HLS_PREFIX}master.m3u8`
    await putObject({
      bucket: BUCKET.HLS,
      key,
      body: Buffer.from('#EXTM3U\n'),
      contentType: 'application/vnd.apple.mpegurl',
      cacheControl: IMMUTABLE_1Y,
    })

    const response = await fetch(cdnUrl(key), { method: 'HEAD' })

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe(IMMUTABLE_1Y)
    expect(response.headers.get('content-type')).toBe(
      'application/vnd.apple.mpegurl',
    )
  }, 60_000)

  it('NO_STORE 도 그대로 저장된다', async () => {
    const key = `${HLS_PREFIX}no-store.txt`
    await putObject({
      bucket: BUCKET.HLS,
      key,
      body: Buffer.from('x'),
      contentType: 'text/plain',
      cacheControl: NO_STORE,
    })

    const response = await fetch(cdnUrl(key), { method: 'HEAD' })

    expect(response.headers.get('cache-control')).toBe(NO_STORE)
  }, 60_000)

  it('길이를 준 스트림은 업로드된다', async () => {
    const payload = Buffer.from('#EXTM3U\n#EXT-X-VERSION:3\n')
    const key = `${HLS_PREFIX}from-stream.m3u8`

    await putObject({
      bucket: BUCKET.HLS,
      key,
      body: Readable.from([payload]),
      contentType: 'application/vnd.apple.mpegurl',
      cacheControl: IMMUTABLE_1Y,
      contentLength: payload.byteLength,
    })

    expect(await readAll(key, BUCKET.HLS)).toEqual(payload)
  }, 60_000)
})

describe.skipIf(skip)('공개·비공개 경계', () => {
  it('원본은 익명으로 읽을 수 없다', async () => {
    // 07_AUTH_SECURITY §4 — 원본은 사용자에게 절대 노출하지 않는다.
    const key = `${ORIGINALS_PREFIX}private.txt`
    await putObject({
      bucket: BUCKET.ORIGINALS,
      key,
      body: Buffer.from('secret-original-bytes'),
      contentType: 'text/plain',
      cacheControl: NO_STORE,
    })

    const endpoint = process.env.S3_ENDPOINT ?? ''
    const response = await fetch(
      `${endpoint}/${bucketName(BUCKET.ORIGINALS)}/${key}`,
    )

    expect(response.ok).toBe(false)
    expect(await response.text()).not.toContain('secret-original-bytes')
  }, 60_000)

  it('HLS 는 익명으로 읽을 수 있다', async () => {
    // 서명 없이 읽혀야 CDN 캐시가 의미를 갖는다 (07 §4). 이것이 깨지면
    // 재생이 전부 실패한다.
    const key = `${HLS_PREFIX}public.m3u8`
    const payload = '#EXTM3U\n#EXT-X-ENDLIST\n'
    await putObject({
      bucket: BUCKET.HLS,
      key,
      body: Buffer.from(payload),
      contentType: 'application/vnd.apple.mpegurl',
      cacheControl: IMMUTABLE_1Y,
    })

    const response = await fetch(cdnUrl(key))

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(payload)
  }, 60_000)
})

describe.skipIf(skip)('서명 GET URL', () => {
  it('서명 URL 로 원본을 내려받을 수 있다', async () => {
    const key = `${ORIGINALS_PREFIX}signed.txt`
    const payload = 'signed-download'
    await putObject({
      bucket: BUCKET.ORIGINALS,
      key,
      body: Buffer.from(payload),
      contentType: 'text/plain',
      cacheControl: NO_STORE,
    })

    const { url } = await presignGet(BUCKET.ORIGINALS, key, 300)
    const response = await fetch(url)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(payload)
  }, 60_000)

  it('만료된 서명 URL 은 거부된다', async () => {
    const key = `${ORIGINALS_PREFIX}expiring.txt`
    await putObject({
      bucket: BUCKET.ORIGINALS,
      key,
      body: Buffer.from('x'),
      contentType: 'text/plain',
      cacheControl: NO_STORE,
    })

    const { url } = await presignGet(BUCKET.ORIGINALS, key, 1)
    await new Promise((resolve) => {
      setTimeout(resolve, 2500)
    })
    const response = await fetch(url)

    expect(response.ok).toBe(false)
    expect(response.status).toBe(403)
  }, 60_000)
})

describe.skipIf(skip)('삭제', () => {
  it('단일 삭제는 없는 키에도 성공한다 (멱등)', async () => {
    await expect(
      deleteObject(BUCKET.ORIGINALS, `${ORIGINALS_PREFIX}never-existed.txt`),
    ).resolves.toBeUndefined()
  }, 60_000)

  it('프리픽스 삭제는 형제 프리픽스를 건드리지 않는다', async () => {
    // 'x/a' 로 지우면 'x/a10/…' 까지 사라진다. 슬래시 가드가 그것을 막는다.
    const sibling = `${HLS_PREFIX}ast_10/seg.ts`
    const target = `${HLS_PREFIX}ast_1/seg.ts`
    for (const key of [sibling, target]) {
      await putObject({
        bucket: BUCKET.HLS,
        key,
        body: Buffer.from('x'),
        contentType: 'video/mp2t',
        cacheControl: IMMUTABLE_1Y,
      })
    }

    const result = await deletePrefix(BUCKET.HLS, `${HLS_PREFIX}ast_1/`)

    expect(result.deleted).toBe(1)
    expect(result.failed).toEqual([])
    expect((await fetch(cdnUrl(sibling))).status).toBe(200)
    expect((await fetch(cdnUrl(target))).status).toBe(404)
  }, 120_000)

  it('1000개를 넘으면 페이지를 따라가며 전부 지운다', async () => {
    // 첫 페이지만 보면 쌓인 것을 영원히 놓친다. S3 는 1000개에서 자른다.
    const prefix = `${HLS_PREFIX}bulk/`
    const total = 1001
    const concurrency = 25

    for (let start = 0; start < total; start += concurrency) {
      const size = Math.min(concurrency, total - start)
      await Promise.all(
        Array.from({ length: size }, (_, offset) =>
          putObject({
            bucket: BUCKET.HLS,
            key: `${prefix}seg_${String(start + offset).padStart(5, '0')}.ts`,
            body: Buffer.from('x'),
            contentType: 'video/mp2t',
            cacheControl: IMMUTABLE_1Y,
          }),
        ),
      )
    }

    const result = await deletePrefix(BUCKET.HLS, prefix)

    expect(result.deleted).toBe(total)
    expect(result.failed).toEqual([])
  }, 300_000)
})

describe.skipIf(skip)('CORS — 브라우저 직접 업로드의 전제', () => {
  /*
    브라우저가 파트를 PUT 하고 응답의 `ETag` 를 읽어야 멀티파트를 완료할 수
    있다. 버킷 CORS 에 `ExposeHeaders: ETag` 가 없으면 브라우저가 그 헤더를
    가려버려 **완료가 영구히 불가능**하다. (T05 §5)

    `scripts/ops/verify-infra.sh` 가 같은 단정을 갖고 있지만 CI 에서 실행되지
    않는다 — 존재하지만 돌지 않는 검사다. 게이트가 실제로 도는 자리로 옮긴다.
    (OBS-017)

    주의: 이것은 **개발/CI 스택**(MinIO)을 검증한다. 프로덕션(Linode Object
    Storage)의 버킷 CORS 는 배포 런북의 수동 항목이며 아직 자동화되어 있지
    않다. 초록을 프로덕션 증명으로 읽지 않는다.
  */
  const ORIGIN = 'http://127.0.0.1:3000'

  it('ETag 를 브라우저에 노출한다', async () => {
    const key = `${HLS_PREFIX}cors-probe.txt`
    await putObject({
      bucket: BUCKET.HLS,
      key,
      body: Buffer.from('probe'),
      contentType: 'text/plain',
      cacheControl: NO_STORE,
    })

    const response = await fetch(cdnUrl(key), { headers: { Origin: ORIGIN } })
    const exposed = response.headers.get('access-control-expose-headers') ?? ''

    expect(response.status).toBe(200)
    expect(exposed.toLowerCase()).toContain('etag')
  }, 60_000)

  it('앱 출처를 허용한다', async () => {
    const key = `${HLS_PREFIX}cors-origin.txt`
    await putObject({
      bucket: BUCKET.HLS,
      key,
      body: Buffer.from('probe'),
      contentType: 'text/plain',
      cacheControl: NO_STORE,
    })

    const response = await fetch(cdnUrl(key), { headers: { Origin: ORIGIN } })
    const allowed = response.headers.get('access-control-allow-origin') ?? ''

    expect([ORIGIN, '*']).toContain(allowed)
  }, 60_000)

  it('서명 URL 로의 PUT 이 CORS 를 통과한다', async () => {
    // 실제 업로드 경로다 — 브라우저가 서명 URL 로 직접 PUT 한다.
    const key = `${ORIGINALS_PREFIX}cors-put.bin`
    const { uploadId } = await createMultipart(
      BUCKET.ORIGINALS,
      key,
      'application/octet-stream',
    )
    const [part] = await signParts(BUCKET.ORIGINALS, key, uploadId, [1], 600)

    const response = await fetch(part?.url ?? '', {
      method: 'PUT',
      body: randomBytes(1024),
      headers: { Origin: ORIGIN },
    })

    expect(response.status).toBe(200)
    // 이 헤더를 못 읽으면 완료를 만들 수 없다.
    expect(response.headers.get('etag')).not.toBeNull()

    await abortMultipart(BUCKET.ORIGINALS, key, uploadId)
  }, 60_000)
})
