// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import {
  clearSavedSession,
  isSameFile,
  pollTranscode,
  readSavedSession,
  uploadPart,
  UploadPartError,
  useUpload,
  UPLOAD_STORAGE_KEY,
  type ResumableSession,
} from './use-upload'

class FakeXMLHttpRequest {
  static latest: FakeXMLHttpRequest | null = null
  static onSend: ((xhr: FakeXMLHttpRequest) => void) | null = null

  readonly upload: { onprogress: ((event: ProgressEvent) => void) | null } = {
    onprogress: null,
  }
  status = 0
  etag: string | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  method = ''
  url = ''
  body: Document | XMLHttpRequestBodyInit | null = null

  constructor() {
    FakeXMLHttpRequest.latest = this
  }

  open(method: string, url: string): void {
    this.method = method
    this.url = url
  }

  send(body: Document | XMLHttpRequestBodyInit | null): void {
    this.body = body
    FakeXMLHttpRequest.onSend?.(this)
  }

  abort(): void {
    this.onabort?.()
  }

  getResponseHeader(name: string): string | null {
    return name.toLowerCase() === 'etag' ? this.etag : null
  }
}

function saved(overrides: Partial<ResumableSession> = {}): ResumableSession {
  return {
    uploadId: 'upl_1',
    fileName: 'episode.mp4',
    fileSize: 4,
    lastModified: 1_700_000_000_000,
    ...overrides,
  }
}

function file(name = 'episode.mp4', lastModified = 1_700_000_000_000): File {
  return new File(['test'], name, { type: 'video/mp4', lastModified })
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  return input instanceof URL ? input.href : input.url
}

describe('isSameFile', () => {
  it('이름·크기·수정 시각이 모두 같으면 재개할 수 있다', () => {
    expect(isSameFile(saved(), file())).toBe(true)
  })

  it('이름·크기·수정 시각 중 하나라도 다르면 거부한다', () => {
    expect(isSameFile(saved(), file('other.mp4'))).toBe(false)
    expect(isSameFile(saved({ fileSize: 5 }), file())).toBe(false)
    expect(isSameFile(saved(), file('episode.mp4', 1))).toBe(false)
  })
})

describe('clearSavedSession', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('저장된 재개 정보만 제거한다', () => {
    window.localStorage.setItem(UPLOAD_STORAGE_KEY, JSON.stringify(saved()))
    window.localStorage.setItem('unrelated', 'keep')

    clearSavedSession()

    expect(window.localStorage.getItem(UPLOAD_STORAGE_KEY)).toBeNull()
    expect(window.localStorage.getItem('unrelated')).toBe('keep')
  })
})

describe('readSavedSession', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('저장된 재개 정보를 읽는다', () => {
    window.localStorage.setItem(UPLOAD_STORAGE_KEY, JSON.stringify(saved()))

    expect(readSavedSession()).toEqual(saved())
  })

  it('없거나 망가진 값은 null로 보고 제거한다', () => {
    expect(readSavedSession()).toBeNull()

    window.localStorage.setItem(UPLOAD_STORAGE_KEY, '{broken')
    expect(readSavedSession()).toBeNull()
    expect(window.localStorage.getItem(UPLOAD_STORAGE_KEY)).toBeNull()

    window.localStorage.setItem(
      UPLOAD_STORAGE_KEY,
      JSON.stringify({ ...saved(), fileSize: '4' }),
    )
    expect(readSavedSession()).toBeNull()
    expect(window.localStorage.getItem(UPLOAD_STORAGE_KEY)).toBeNull()
  })
})

describe('uploadPart', () => {
  beforeEach(() => {
    FakeXMLHttpRequest.latest = null
    FakeXMLHttpRequest.onSend = null
    vi.stubGlobal(
      'XMLHttpRequest',
      FakeXMLHttpRequest as unknown as typeof XMLHttpRequest,
    )
  })

  it('XHR PUT 진행률과 ETag를 전달한다', async () => {
    const onProgress = vi.fn()
    const request = uploadPart({
      url: 'https://storage.example/part-1',
      body: new Blob(['part']),
      signal: new AbortController().signal,
      onProgress,
    })
    const xhr = FakeXMLHttpRequest.latest
    expect(xhr).not.toBeNull()
    if (xhr === null) return

    xhr.upload.onprogress?.(new ProgressEvent('progress', { loaded: 4 }))
    xhr.status = 200
    xhr.etag = '"etag-1"'
    xhr.onload?.()

    await expect(request).resolves.toBe('"etag-1"')
    expect(xhr.method).toBe('PUT')
    expect(xhr.url).toBe('https://storage.example/part-1')
    expect(onProgress).toHaveBeenCalledWith(4)
  })

  it('HTTP 실패와 노출되지 않은 ETag를 거부한다', async () => {
    const failed = uploadPart({
      url: 'https://storage.example/part-1',
      body: new Blob(),
      signal: new AbortController().signal,
      onProgress: () => undefined,
    })
    const first = FakeXMLHttpRequest.latest
    if (first === null) return
    first.status = 403
    first.onload?.()
    await expect(failed).rejects.toEqual(
      expect.objectContaining({ status: 403 }),
    )

    const missingEtag = uploadPart({
      url: 'https://storage.example/part-2',
      body: new Blob(),
      signal: new AbortController().signal,
      onProgress: () => undefined,
    })
    const second = FakeXMLHttpRequest.latest
    if (second === null) return
    second.status = 200
    second.onload?.()
    await expect(missingEtag).rejects.toBeInstanceOf(UploadPartError)
  })

  it('AbortSignal이 취소되면 XHR도 취소한다', async () => {
    const controller = new AbortController()
    const request = uploadPart({
      url: 'https://storage.example/part-1',
      body: new Blob(),
      signal: controller.signal,
      onProgress: () => undefined,
    })

    controller.abort()

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('useUpload', () => {
  beforeEach(() => {
    window.localStorage.clear()
    FakeXMLHttpRequest.latest = null
    FakeXMLHttpRequest.onSend = null
    vi.stubGlobal(
      'XMLHttpRequest',
      FakeXMLHttpRequest as unknown as typeof XMLHttpRequest,
    )
  })

  it('파트 3개를 병렬 업로드하고 완료·트랜스코드까지 전이한다', async () => {
    let inFlight = 0
    let maxInFlight = 0
    let etag = 0
    FakeXMLHttpRequest.onSend = (xhr) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      queueMicrotask(() => {
        xhr.upload.onprogress?.(new ProgressEvent('progress', { loaded: 4 }))
        xhr.status = 200
        xhr.etag = `"etag-${String(++etag)}"`
        inFlight -= 1
        xhr.onload?.()
      })
    }

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input)
      if (url === '/api/uploads' && init?.method === 'POST') {
        return Promise.resolve(
          Response.json({
            uploadId: 'upl_1',
            partSize: 4,
            totalParts: 3,
            parts: [1, 2, 3].map((partNumber) => ({
              partNumber,
              url: `https://storage/part-${String(partNumber)}`,
            })),
          }),
        )
      }
      if (url.endsWith('/complete')) {
        return Promise.resolve(
          Response.json(
            { assetId: 'ast_1', status: 'PENDING' },
            { status: 202 },
          ),
        )
      }
      if (url === '/api/assets/ast_1') {
        return Promise.resolve(
          Response.json({ status: 'READY', progress: 100 }),
        )
      }
      return Promise.resolve(
        Response.json({ error: { code: 'E_INTERNAL' } }, { status: 500 }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useUpload())

    await act(async () => {
      await result.current.start(
        new File(['abcdefghijkl'], 'episode.mp4', {
          type: 'video/mp4',
          lastModified: 1,
        }),
      )
    })

    expect(result.current.state).toMatchObject({
      phase: 'ready',
      uploadId: 'upl_1',
      assetId: 'ast_1',
      bytesSent: 12,
      progress: 100,
      transcodeProgress: 100,
    })
    expect(maxInFlight).toBe(3)
    expect(window.localStorage.getItem(UPLOAD_STORAGE_KEY)).toBeNull()
    const completeCall = fetchMock.mock.calls.find(([url]) =>
      requestUrl(url).endsWith('/complete'),
    )
    const completeBody = completeCall?.[1]?.body
    expect(
      JSON.parse(typeof completeBody === 'string' ? completeBody : ''),
    ).toMatchObject({
      parts: expect.arrayContaining([
        { partNumber: 1, etag: expect.any(String) as unknown as string },
        { partNumber: 2, etag: expect.any(String) as unknown as string },
        { partNumber: 3, etag: expect.any(String) as unknown as string },
      ]) as unknown,
    })
  })

  it('재개 정보와 다른 파일은 업로드하지 않고 검증 오류로 전이한다', async () => {
    window.localStorage.setItem(UPLOAD_STORAGE_KEY, JSON.stringify(saved()))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useUpload())

    await act(async () => {
      await result.current.start(file('other.mp4'))
    })

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        phase: 'error',
        errorCode: 'E_VALIDATION',
      })
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('서버의 완료 파트를 건너뛰고 누락된 파트만 재개한다', async () => {
    const resumedFile = new File(['abcdefghijkl'], 'episode.mp4', {
      type: 'video/mp4',
      lastModified: 7,
    })
    window.localStorage.setItem(
      UPLOAD_STORAGE_KEY,
      JSON.stringify({
        uploadId: 'upl_1',
        fileName: resumedFile.name,
        fileSize: resumedFile.size,
        lastModified: resumedFile.lastModified,
      }),
    )
    const uploadedUrls: string[] = []
    FakeXMLHttpRequest.onSend = (xhr) => {
      uploadedUrls.push(xhr.url)
      queueMicrotask(() => {
        xhr.status = 200
        xhr.etag = `"${xhr.url}"`
        xhr.onload?.()
      })
    }
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input)
      if (url === '/api/uploads/upl_1' && init?.method === 'GET') {
        return Promise.resolve(
          Response.json({
            uploadId: 'upl_1',
            status: 'UPLOADING',
            fileName: resumedFile.name,
            fileSize: resumedFile.size,
            partSize: 4,
            totalParts: 3,
            completedParts: [1],
          }),
        )
      }
      if (url.endsWith('/parts')) {
        const request = JSON.parse(
          typeof init?.body === 'string' ? init.body : '',
        ) as { partNumbers: number[] }
        return Promise.resolve(
          Response.json(
            request.partNumbers.map((partNumber) => ({
              partNumber,
              url: `https://storage/part-${String(partNumber)}`,
            })),
          ),
        )
      }
      if (url.endsWith('/complete')) {
        return Promise.resolve(
          Response.json(
            { assetId: 'ast_1', status: 'PENDING' },
            { status: 202 },
          ),
        )
      }
      if (url === '/api/assets/ast_1') {
        return Promise.resolve(
          Response.json({ status: 'READY', progress: 100 }),
        )
      }
      return Promise.resolve(Response.json({}, { status: 500 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useUpload())

    await act(async () => {
      await result.current.start(resumedFile)
    })

    expect(result.current.state.phase).toBe('ready')
    expect(uploadedUrls).toEqual([
      'https://storage/part-2',
      'https://storage/part-3',
    ])
    const completeCall = fetchMock.mock.calls.find(([url]) =>
      requestUrl(url).endsWith('/complete'),
    )
    const body = completeCall?.[1]?.body
    expect(JSON.parse(typeof body === 'string' ? body : '')).toEqual({
      parts: [
        { partNumber: 2, etag: '"https://storage/part-2"' },
        { partNumber: 3, etag: '"https://storage/part-3"' },
      ],
    })
  })

  it('파트 URL이 403이면 새 서명을 받아 자동으로 계속한다', async () => {
    let sendCount = 0
    FakeXMLHttpRequest.onSend = (xhr) => {
      sendCount += 1
      queueMicrotask(() => {
        xhr.status = sendCount === 1 ? 403 : 200
        xhr.etag = sendCount === 1 ? null : '"fresh-etag"'
        xhr.onload?.()
      })
    }
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input)
      if (url === '/api/uploads') {
        return Promise.resolve(
          Response.json({
            uploadId: 'upl_1',
            partSize: 4,
            totalParts: 1,
            parts: [{ partNumber: 1, url: 'https://storage/expired' }],
          }),
        )
      }
      if (url.endsWith('/parts')) {
        return Promise.resolve(
          Response.json([
            { partNumber: 1, url: 'https://storage/fresh-part-1' },
          ]),
        )
      }
      if (url.endsWith('/complete')) {
        return Promise.resolve(
          Response.json(
            { assetId: 'ast_1', status: 'PENDING' },
            { status: 202 },
          ),
        )
      }
      if (url === '/api/assets/ast_1') {
        return Promise.resolve(
          Response.json({ status: 'READY', progress: 100 }),
        )
      }
      return Promise.resolve(
        Response.json({ error: { code: 'E_INTERNAL' } }, { status: 500 }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useUpload())

    await act(async () => {
      await result.current.start(file())
    })

    expect(result.current.state.phase).toBe('ready')
    expect(sendCount).toBe(2)
    expect(
      fetchMock.mock.calls.some(([url]) => requestUrl(url).endsWith('/parts')),
    ).toBe(true)
  })
})

describe('pollTranscode', () => {
  it('진행률을 읽고 READY는 100으로 정규화한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'TRANSCODING', progress: 42 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'READY', progress: 99 }), {
          status: 200,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(pollTranscode('asset/1')).resolves.toBe(42)
    await expect(pollTranscode('asset/1')).resolves.toBe(100)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/assets/asset%2F1',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('HTTP 실패와 잘못된 진행률을 거부한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    )
    await expect(pollTranscode('ast_1')).rejects.toMatchObject({ status: 503 })

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ status: 'TRANSCODING', progress: 101 }),
            { status: 200 },
          ),
        ),
    )
    await expect(pollTranscode('ast_1')).rejects.toThrow(
      'asset progress response is invalid',
    )
  })
})
