import { AppError, type UploadSession } from '@aidream/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'

const mocks = vi.hoisted(() => ({
  findUploadSessionById: vi.fn(),
  createUploadSession: vi.fn(),
  updateUploadStatus: vi.fn(),
  updateCompletedParts: vi.fn(),
  sumUploadBytesSince: vi.fn(),
  createAsset: vi.fn(),
  findAssetByUploadId: vi.fn(),
  createMultipart: vi.fn(),
  signParts: vi.fn(),
  completeMultipart: vi.fn(),
  abortMultipart: vi.fn(),
  listUploadedParts: vi.fn(),
  enqueue: vi.fn(),
}))

vi.mock('@aidream/db', () => ({
  findUploadSessionById: mocks.findUploadSessionById,
  createUploadSession: mocks.createUploadSession,
  updateUploadStatus: mocks.updateUploadStatus,
  updateCompletedParts: mocks.updateCompletedParts,
  sumUploadBytesSince: mocks.sumUploadBytesSince,
  createAsset: mocks.createAsset,
  findAssetByUploadId: mocks.findAssetByUploadId,
}))

vi.mock('@aidream/storage', async () => {
  const actual =
    await vi.importActual<typeof import('@aidream/storage')>('@aidream/storage')
  return {
    ...actual,
    createMultipart: mocks.createMultipart,
    signParts: mocks.signParts,
    completeMultipart: mocks.completeMultipart,
    abortMultipart: mocks.abortMultipart,
    listUploadedParts: mocks.listUploadedParts,
  }
})

vi.mock('@aidream/queue', async () => {
  const actual =
    await vi.importActual<typeof import('@aidream/queue')>('@aidream/queue')
  return { ...actual, enqueue: mocks.enqueue }
})

const { createUploadSession } = await import('./create-upload-session')
const { completeUpload } = await import('./complete-upload')
const { abortUpload } = await import('./abort-upload')
const { getUploadSession } = await import('./get-upload-session')
const { signMoreParts } = await import('./sign-more-parts')

const MIB = 1024 ** 2

function routeSession(
  overrides: Partial<RouteSession['user']> = {},
): RouteSession {
  return {
    userId: 'usr_1',
    expiresAt: new Date(Date.now() + 60_000),
    user: {
      id: 'usr_1',
      handle: 'creator',
      email: 'c@example.com',
      displayName: '제작자',
      role: 'CREATOR',
      status: 'ACTIVE',
      emailVerified: true,
      ...overrides,
    },
  }
}

function uploadRow(overrides: Partial<UploadSession> = {}): UploadSession {
  return {
    id: 'upl_1',
    userId: 'usr_1',
    status: 'UPLOADING',
    fileName: 'drama.mp4',
    fileSize: 100n * BigInt(MIB),
    mimeType: 'video/mp4',
    checksum: null,
    objectKey: 'originals/usr_1/upl_1/drama.mp4',
    s3UploadId: 's3-upload-1',
    partSize: 32 * MIB,
    totalParts: 4,
    completedParts: [],
    errorCode: null,
    expiresAt: new Date(Date.now() + 3_600_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as UploadSession
}

beforeEach(() => {
  process.env.CAPACITY_TIER = 'T0'
  process.env.S3_BUCKET_ORIGINALS = 'aidream-originals'
  for (const mock of Object.values(mocks)) {
    mock.mockReset()
  }
  mocks.sumUploadBytesSince.mockResolvedValue(0n)
  mocks.createMultipart.mockResolvedValue({
    uploadId: 's3-upload-1',
    key: 'k',
  })
  mocks.signParts.mockResolvedValue([
    { partNumber: 1, url: 'https://s3/part1', expiresAt: new Date() },
  ])
  mocks.createUploadSession.mockResolvedValue(uploadRow())
  mocks.updateUploadStatus.mockResolvedValue(uploadRow())
  mocks.updateCompletedParts.mockResolvedValue(uploadRow())
  mocks.listUploadedParts.mockResolvedValue([])
  mocks.enqueue.mockResolvedValue(undefined)
})

describe('createUploadSession — 순서와 권한', () => {
  const input = {
    fileName: 'drama.mp4',
    fileSize: 100 * MIB,
    mimeType: 'video/mp4' as const,
  }

  it('정상 요청은 세션과 첫 파트를 돌려준다', async () => {
    const result = await createUploadSession(routeSession(), input)

    expect(result.uploadId).toMatch(/^[0-9a-f-]{36}$/u)
    expect(result.totalParts).toBeGreaterThan(0)
    expect(result.parts).toHaveLength(1)
  })

  it('VIEWER 는 업로드할 수 없다', async () => {
    await expect(
      createUploadSession(routeSession({ role: 'VIEWER' }), input),
    ).rejects.toMatchObject({ code: 'E_PERM_DENIED' })
    expect(mocks.createMultipart).not.toHaveBeenCalled()
  })

  it('이메일 미인증은 전용 코드로 거부한다', async () => {
    // "권한이 없습니다" 와 "메일 인증을 마쳐주세요" 는 할 일이 다르다.
    await expect(
      createUploadSession(routeSession({ emailVerified: false }), input),
    ).rejects.toMatchObject({ code: 'E_AUTH_EMAIL_NOT_VERIFIED' })
  })

  it('일일 총량을 넘기면 S3 를 건드리지 않는다', async () => {
    mocks.sumUploadBytesSince.mockResolvedValue(BigInt(10 * 1024 ** 3))

    await expect(
      createUploadSession(routeSession(), input),
    ).rejects.toMatchObject({ code: 'E_UPLOAD_QUOTA_EXCEEDED' })
    expect(mocks.createMultipart).not.toHaveBeenCalled()
  })

  it('남은 양과 초기화 시각을 알려준다', async () => {
    mocks.sumUploadBytesSince.mockResolvedValue(BigInt(10 * 1024 ** 3))

    let caught: unknown
    try {
      await createUploadSession(routeSession(), input)
    } catch (error: unknown) {
      caught = error
    }

    expect((caught as AppError).detail).toMatchObject({
      remainingBytes: expect.any(String) as unknown as string,
      resetsAt: expect.any(String) as unknown as string,
    })
  })

  it('티어 상한을 넘긴 파일은 S3 를 건드리지 않는다', async () => {
    await expect(
      createUploadSession(routeSession(), {
        ...input,
        fileSize: 3 * 1024 ** 3,
      }),
    ).rejects.toMatchObject({ code: 'E_UPLOAD_TOO_LARGE' })
    expect(mocks.createMultipart).not.toHaveBeenCalled()
  })

  it('S3 를 DB 보다 먼저 부른다', async () => {
    // 반대로 하면 s3UploadId 가 없는 세션이 남고, 그 세션이 가리키는
    // 멀티파트가 있는지조차 알 수 없다.
    const order: string[] = []
    mocks.createMultipart.mockImplementation(() => {
      order.push('s3')
      return Promise.resolve({ uploadId: 's3-upload-1', key: 'k' })
    })
    mocks.createUploadSession.mockImplementation(() => {
      order.push('db')
      return Promise.resolve(uploadRow())
    })

    await createUploadSession(routeSession(), input)

    expect(order).toEqual(['s3', 'db'])
  })

  it('세션 id 가 객체 키에 들어간다', async () => {
    const result = await createUploadSession(routeSession(), input)
    const inserted = mocks.createUploadSession.mock.calls[0]?.[0] as {
      id: string
      objectKey: string
      s3UploadId: string
    }

    expect(inserted.id).toBe(result.uploadId)
    expect(inserted.objectKey).toBe(
      `originals/usr_1/${result.uploadId}/drama.mp4`,
    )
    expect(inserted.s3UploadId).toBe('s3-upload-1')
  })

  it('파일명을 새니타이즈해 키에 넣는다', async () => {
    await createUploadSession(routeSession(), {
      ...input,
      fileName: '../../etc/passwd.mp4',
    })
    const inserted = mocks.createUploadSession.mock.calls[0]?.[0] as {
      objectKey: string
    }

    expect(inserted.objectKey).not.toContain('..')
    expect(inserted.objectKey.split('/')).toHaveLength(4)
  })

  it('첫 배치는 100개를 넘지 않는다', async () => {
    await createUploadSession(routeSession(), {
      ...input,
      fileSize: 2 * 1024 ** 3,
    })
    const numbers = mocks.signParts.mock.calls[0]?.[3] as number[]

    expect(numbers.length).toBeLessThanOrEqual(100)
    expect(numbers[0]).toBe(1)
  })
})

describe('completeUpload — 멱등성', () => {
  const parts = [
    { partNumber: 1, etag: '"a"' },
    { partNumber: 2, etag: '"b"' },
    { partNumber: 3, etag: '"c"' },
    { partNumber: 4, etag: '"d"' },
  ]

  beforeEach(() => {
    mocks.findUploadSessionById.mockResolvedValue(uploadRow())
    mocks.completeMultipart.mockResolvedValue({
      etag: '"x"',
      sizeBytes: 104_857_600,
    })
    mocks.createAsset.mockResolvedValue({ id: 'ast_1', status: 'PENDING' })
  })

  it('정상 완료는 자산을 만들고 잡을 발행한다', async () => {
    const result = await completeUpload(routeSession(), 'upl_1', { parts })

    expect(result).toEqual({
      result: { assetId: 'ast_1', status: 'PENDING' },
      replayed: false,
    })
    expect(mocks.enqueue).toHaveBeenCalledWith(
      'video.transcode',
      { assetId: 'ast_1' },
      {
        jobId: 'ast_1',
        attempts: 3,
        backoff: { type: 'transcode' },
      },
    )
  })

  it('재개 전 저장된 ETag와 새 ETag를 병합해 완료한다', async () => {
    mocks.findUploadSessionById.mockResolvedValue(
      uploadRow({
        completedParts: parts.slice(0, 3),
      }),
    )

    await completeUpload(routeSession(), 'upl_1', {
      parts: [parts[3] ?? { partNumber: 4, etag: 'd' }],
    })

    expect(mocks.completeMultipart).toHaveBeenCalledWith(
      'originals',
      'originals/usr_1/upl_1/drama.mp4',
      's3-upload-1',
      parts,
    )
  })

  it('모든 파트가 이전 탭에서 완료됐으면 빈 배열로 완료한다', async () => {
    mocks.findUploadSessionById.mockResolvedValue(
      uploadRow({ completedParts: parts }),
    )

    await expect(
      completeUpload(routeSession(), 'upl_1', { parts: [] }),
    ).resolves.toEqual({
      result: { assetId: 'ast_1', status: 'PENDING' },
      replayed: false,
    })
    expect(mocks.completeMultipart).toHaveBeenCalledWith(
      'originals',
      'originals/usr_1/upl_1/drama.mp4',
      's3-upload-1',
      parts,
    )
  })

  it('이미 완료된 세션은 같은 자산을 돌려준다 (재처리 없음)', async () => {
    // 재시도로 두 번 오는 일은 자주 있다. 자산이 두 개 생기면 트랜스코드
    // 비용이 두 배가 된다. (T05 §7 ★)
    mocks.findUploadSessionById.mockResolvedValue(
      uploadRow({ status: 'UPLOADED' }),
    )
    mocks.findAssetByUploadId.mockResolvedValue({
      id: 'ast_1',
      status: 'READY',
    })

    const result = await completeUpload(routeSession(), 'upl_1', { parts })

    expect(result).toEqual({
      result: { assetId: 'ast_1', status: 'READY' },
      replayed: true,
    })
    expect(mocks.completeMultipart).not.toHaveBeenCalled()
    expect(mocks.createAsset).not.toHaveBeenCalled()
    expect(mocks.enqueue).not.toHaveBeenCalled()
  })

  it('완료했는데 자산이 없으면 조용히 새로 만들지 않는다', async () => {
    // 여기서 만들면 나중에 진짜 자산이 생겼을 때 둘이 된다.
    mocks.findUploadSessionById.mockResolvedValue(
      uploadRow({ status: 'UPLOADED' }),
    )
    mocks.findAssetByUploadId.mockResolvedValue(null)

    await expect(
      completeUpload(routeSession(), 'upl_1', { parts }),
    ).rejects.toMatchObject({ code: 'E_INTERNAL' })
    expect(mocks.createAsset).not.toHaveBeenCalled()
  })

  it('S3 가 410 을 줘도 자산이 있으면 멱등 처리한다', async () => {
    // 완료는 성공했는데 직후 HeadObject 가 실패한 경우다. 재시도하면
    // uploadId 가 사라져 410 이 온다 — 성공한 업로드가 "만료" 로 끝나면 안 된다.
    // (OBS-015)
    mocks.completeMultipart.mockRejectedValue(
      new AppError('E_UPLOAD_SESSION_EXPIRED'),
    )
    mocks.findAssetByUploadId.mockResolvedValue({
      id: 'ast_1',
      status: 'PENDING',
    })

    await expect(
      completeUpload(routeSession(), 'upl_1', { parts }),
    ).resolves.toEqual({
      result: { assetId: 'ast_1', status: 'PENDING' },
      replayed: true,
    })
  })

  it('410 인데 자산도 없으면 그대로 던진다', async () => {
    mocks.completeMultipart.mockRejectedValue(
      new AppError('E_UPLOAD_SESSION_EXPIRED'),
    )
    mocks.findAssetByUploadId.mockResolvedValue(null)

    await expect(
      completeUpload(routeSession(), 'upl_1', { parts }),
    ).rejects.toMatchObject({ code: 'E_UPLOAD_SESSION_EXPIRED' })
  })

  it('잡 발행이 실패해도 완료는 성공이다', async () => {
    // 실패라고 말하면 사용자가 처음부터 다시 올린다. 그게 더 나쁘다.
    // 자산은 PENDING 으로 남고 복구 잡이 다시 발행한다.
    mocks.enqueue.mockRejectedValue(new Error('redis down'))

    await expect(
      completeUpload(routeSession(), 'upl_1', { parts }),
    ).resolves.toEqual({
      result: { assetId: 'ast_1', status: 'PENDING' },
      replayed: false,
    })
  })
})

describe('completeUpload — 거부', () => {
  const parts = [
    { partNumber: 1, etag: 'a' },
    { partNumber: 2, etag: 'b' },
    { partNumber: 3, etag: 'c' },
    { partNumber: 4, etag: 'd' },
  ]

  it('없는 세션', async () => {
    mocks.findUploadSessionById.mockResolvedValue(null)

    await expect(
      completeUpload(routeSession(), 'upl_x', { parts }),
    ).rejects.toMatchObject({ code: 'E_UPLOAD_SESSION_NOT_FOUND' })
  })

  it('남의 세션', async () => {
    mocks.findUploadSessionById.mockResolvedValue(
      uploadRow({ userId: 'usr_other' }),
    )

    await expect(
      completeUpload(routeSession(), 'upl_1', { parts }),
    ).rejects.toMatchObject({ code: 'E_PERM_NOT_OWNER' })
  })

  it('중단된 세션', async () => {
    mocks.findUploadSessionById.mockResolvedValue(
      uploadRow({ status: 'ABORTED' }),
    )

    await expect(
      completeUpload(routeSession(), 'upl_1', { parts }),
    ).rejects.toMatchObject({ code: 'E_UPLOAD_ABORTED' })
  })

  it('만료된 세션', async () => {
    mocks.findUploadSessionById.mockResolvedValue(
      uploadRow({ expiresAt: new Date(Date.now() - 1000) }),
    )

    await expect(
      completeUpload(routeSession(), 'upl_1', { parts }),
    ).rejects.toMatchObject({ code: 'E_UPLOAD_SESSION_EXPIRED' })
  })

  it('파트가 빠지면 어느 번호인지 알려준다', async () => {
    mocks.findUploadSessionById.mockResolvedValue(uploadRow())

    let caught: unknown
    try {
      await completeUpload(routeSession(), 'upl_1', {
        parts: [parts[0] ?? { partNumber: 1, etag: 'a' }],
      })
    } catch (error: unknown) {
      caught = error
    }

    expect((caught as AppError).code).toBe('E_UPLOAD_PART_MISSING')
    expect((caught as AppError).detail).toMatchObject({
      missingParts: [2, 3, 4],
    })
    expect(mocks.completeMultipart).not.toHaveBeenCalled()
  })
})

describe('signMoreParts', () => {
  beforeEach(() => {
    mocks.findUploadSessionById.mockResolvedValue(uploadRow())
  })

  it('요청한 파트를 서명해 준다', async () => {
    const parts = await signMoreParts(routeSession(), 'upl_1', {
      partNumbers: [2, 3],
    })

    expect(parts).toHaveLength(1)
    expect(mocks.signParts).toHaveBeenCalledWith(
      'originals',
      'originals/usr_1/upl_1/drama.mp4',
      's3-upload-1',
      [2, 3],
      expect.any(Number) as unknown as number,
    )
  })

  it('세션 범위 밖의 파트 번호를 거부한다', async () => {
    // S3 는 범위 밖 번호도 받아들이고 완료 시점에야 터진다 — 원인에서 먼 실패다.
    await expect(
      signMoreParts(routeSession(), 'upl_1', { partNumbers: [1, 99] }),
    ).rejects.toMatchObject({ code: 'E_UPLOAD_INVALID_PART' })
    expect(mocks.signParts).not.toHaveBeenCalled()
  })

  it('만료된 세션에는 발급하지 않는다', async () => {
    mocks.findUploadSessionById.mockResolvedValue(
      uploadRow({ expiresAt: new Date(Date.now() - 1000) }),
    )

    await expect(
      signMoreParts(routeSession(), 'upl_1', { partNumbers: [1] }),
    ).rejects.toMatchObject({ code: 'E_UPLOAD_SESSION_EXPIRED' })
  })

  it('남의 세션에는 발급하지 않는다', async () => {
    mocks.findUploadSessionById.mockResolvedValue(
      uploadRow({ userId: 'usr_other' }),
    )

    await expect(
      signMoreParts(routeSession(), 'upl_1', { partNumbers: [1] }),
    ).rejects.toMatchObject({ code: 'E_PERM_NOT_OWNER' })
  })
})

describe('abortUpload', () => {
  it('S3 를 정리하고 상태를 바꾼다', async () => {
    mocks.findUploadSessionById.mockResolvedValue(uploadRow())

    await abortUpload(routeSession(), 'upl_1')

    expect(mocks.abortMultipart).toHaveBeenCalled()
    expect(mocks.updateUploadStatus).toHaveBeenCalledWith('upl_1', 'ABORTED')
  })

  it('이미 끝난 세션은 건드리지 않는다', async () => {
    // UPLOADED 를 ABORTED 로 되돌리면 자산과 어긋난다.
    mocks.findUploadSessionById.mockResolvedValue(
      uploadRow({ status: 'UPLOADED' }),
    )

    await expect(abortUpload(routeSession(), 'upl_1')).resolves.toBeUndefined()
    expect(mocks.abortMultipart).not.toHaveBeenCalled()
    expect(mocks.updateUploadStatus).not.toHaveBeenCalled()
  })

  it('이미 중단된 세션도 성공으로 본다 (멱등)', async () => {
    mocks.findUploadSessionById.mockResolvedValue(
      uploadRow({ status: 'ABORTED' }),
    )

    await expect(abortUpload(routeSession(), 'upl_1')).resolves.toBeUndefined()
  })
})

describe('getUploadSession — 재개', () => {
  it('완료된 파트 번호를 정렬해 돌려준다', async () => {
    mocks.findUploadSessionById.mockResolvedValue(uploadRow())
    mocks.listUploadedParts.mockResolvedValue([
      { partNumber: 1, etag: 'a' },
      { partNumber: 3, etag: 'c' },
    ])

    const state = await getUploadSession(routeSession(), 'upl_1')

    expect(state.completedParts).toEqual([1, 3])
    expect(state.totalParts).toBe(4)
    expect(mocks.updateCompletedParts).toHaveBeenCalledWith('upl_1', [
      { partNumber: 1, etag: 'a' },
      { partNumber: 3, etag: 'c' },
    ])
  })

  it('중복 번호를 하나로 만든다', async () => {
    mocks.findUploadSessionById.mockResolvedValue(
      uploadRow({
        status: 'UPLOADED',
        completedParts: [
          { partNumber: 1, etag: 'a' },
          { partNumber: 1, etag: 'a2' },
        ],
      }),
    )

    expect(
      (await getUploadSession(routeSession(), 'upl_1')).completedParts,
    ).toEqual([1])
  })

  it('망가진 JSON 은 빈 목록으로 본다', async () => {
    // 잘못된 값이 새면 클라이언트가 이미 올린 파트를 건너뛰고, 그 사실은
    // 완료 시점의 InvalidPart 로만 드러난다.
    for (const broken of [null, 'nope', 42, [{ nope: 1 }], [1, 2]]) {
      mocks.findUploadSessionById.mockResolvedValue(
        uploadRow({ status: 'UPLOADED', completedParts: broken as never }),
      )

      expect(
        (await getUploadSession(routeSession(), 'upl_1')).completedParts,
      ).toEqual([])
    }
  })

  it('Object Storage 조회 실패를 빈 목록으로 숨기지 않는다', async () => {
    mocks.findUploadSessionById.mockResolvedValue(uploadRow())
    mocks.listUploadedParts.mockRejectedValue(
      new AppError('E_STORAGE_UNAVAILABLE'),
    )

    await expect(
      getUploadSession(routeSession(), 'upl_1'),
    ).rejects.toMatchObject({ code: 'E_STORAGE_UNAVAILABLE' })
    expect(mocks.updateCompletedParts).not.toHaveBeenCalled()
  })
})
