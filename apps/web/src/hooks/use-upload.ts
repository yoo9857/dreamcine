'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from 'react'

/**
 * 클라이언트 업로드 엔진. (08_UIUX_SPEC.md §4, T05 §5 클라이언트 측)
 *
 * 원본 바이트는 **앱 서버를 통과하지 않는다.** 브라우저가 서명 URL 로 Object
 * Storage 에 직접 PUT 한다. 이 원칙을 어기면 서버가 죽는다 — Caddy 의
 * `max_size 2MB` 가 그것을 구조적으로 막고 있다.
 */

/** 08_UIUX_SPEC.md §4 의 상태 기계. */
export type UploadPhase =
  | 'idle'
  | 'validating'
  | 'creating'
  | 'uploading'
  | 'paused'
  /** 네트워크가 끊겼다. 세션은 살아 있고 이어 올릴 수 있다. */
  | 'resumable'
  | 'completing'
  /** 서버에서 진행된다. 창을 닫아도 계속된다 — 이탈을 경고하지 않는다. */
  | 'transcoding'
  | 'ready'
  | 'error'

export interface UploadState {
  readonly phase: UploadPhase
  readonly uploadId: string | null
  readonly assetId: string | null
  readonly bytesSent: number
  readonly bytesTotal: number
  /** 0-100. 표시 전용 — 판정에 쓰지 않는다. */
  readonly progress: number
  /** 최근 파트들의 이동평균 속도 기반. 초기에는 null. */
  readonly etaSec: number | null
  readonly transcodeProgress: number
  /** 사용자 문구는 `error-messages.ts` 가 코드로부터 만든다. */
  readonly errorCode: string | null
}

export interface UploadApi {
  readonly state: UploadState
  start(file: File): Promise<void>
  /** 진행 중인 파트는 완료시키고 다음 파트를 시작하지 않는다. */
  pause(): void
  resume(): Promise<void>
  abort(): Promise<void>
  retry(): Promise<void>
}

/** 모바일 회선을 고려한 병렬 파트 수. 높이면 오히려 느려진다. (T05 §5) */
export const UPLOAD_CONCURRENCY = 3

/** 파트별 재시도 횟수와 백오프. 1s / 4s / 16s. */
export const PART_RETRY_ATTEMPTS = 3
export const PART_RETRY_BASE_MS = 1_000

/** ETA 이동평균에 쓰는 표본 수. */
export const ETA_SAMPLE_SIZE = 10

/** 재개를 위해 브라우저에 남기는 것. */
export const UPLOAD_STORAGE_KEY = 'aidream:upload'

const TRANSCODE_POLL_MS = 2_000

const INITIAL_STATE: UploadState = {
  phase: 'idle',
  uploadId: null,
  assetId: null,
  bytesSent: 0,
  bytesTotal: 0,
  progress: 0,
  etaSec: null,
  transcodeProgress: 0,
  errorCode: null,
}

/**
 * 재개 시 같은 파일인지 확인하는 근거.
 *
 * 브라우저는 `File` 객체를 복원해 주지 않는다 — 새로고침하면 사라진다.
 * 그래서 사용자에게 **같은 파일을 다시 고르도록** 요청하고, 고른 것이 정말
 * 같은 파일인지 이 세 값으로 확인한다. 다른 파일을 이어 올리면 조각난
 * 영상이 만들어지고, 그 사실은 트랜스코드가 실패할 때야 드러난다.
 */
export interface ResumableSession {
  readonly uploadId: string
  readonly fileName: string
  readonly fileSize: number
  readonly lastModified: number
}

export function isSameFile(saved: ResumableSession, file: File): boolean {
  return (
    saved.fileName === file.name &&
    saved.fileSize === file.size &&
    saved.lastModified === file.lastModified
  )
}

export function readSavedSession(): ResumableSession | null {
  const raw = window.localStorage.getItem(UPLOAD_STORAGE_KEY)
  if (raw === null) {
    return null
  }

  try {
    const value = JSON.parse(raw) as unknown
    if (
      typeof value === 'object' &&
      value !== null &&
      'uploadId' in value &&
      typeof value.uploadId === 'string' &&
      'fileName' in value &&
      typeof value.fileName === 'string' &&
      'fileSize' in value &&
      typeof value.fileSize === 'number' &&
      Number.isSafeInteger(value.fileSize) &&
      'lastModified' in value &&
      typeof value.lastModified === 'number' &&
      Number.isSafeInteger(value.lastModified)
    ) {
      return {
        uploadId: value.uploadId,
        fileName: value.fileName,
        fileSize: value.fileSize,
        lastModified: value.lastModified,
      }
    }
  } catch (error: unknown) {
    if (!(error instanceof SyntaxError)) {
      throw error
    }
    // 망가진 브라우저 상태는 복원할 수 없다. 다음 진입 때 반복하지 않게 지운다.
    window.localStorage.removeItem(UPLOAD_STORAGE_KEY)
    return null
  }

  window.localStorage.removeItem(UPLOAD_STORAGE_KEY)
  return null
}

export function clearSavedSession(): void {
  window.localStorage.removeItem(UPLOAD_STORAGE_KEY)
}

export interface UploadPartInput {
  readonly url: string
  readonly body: Blob
  readonly signal: AbortSignal
  /** 전송된 누적 바이트. 진행률 계산은 호출자가 한다. */
  onProgress(loaded: number): void
}

export class UploadPartError extends Error {
  constructor(
    readonly status: number,
    message = `part upload failed with status ${String(status)}`,
  ) {
    super(message)
    this.name = 'UploadPartError'
  }
}

class UploadApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code)
    this.name = 'UploadApiError'
  }
}

interface SignedPartResponse {
  readonly partNumber: number
  readonly url: string
}

interface CreateUploadResponse {
  readonly uploadId: string
  readonly partSize: number
  readonly totalParts: number
  readonly parts: readonly SignedPartResponse[]
}

interface UploadSessionResponse {
  readonly uploadId: string
  readonly status: string
  readonly fileName: string
  readonly fileSize: number
  readonly partSize: number
  readonly totalParts: number
  readonly completedParts: readonly number[]
}

interface CompleteUploadResponse {
  readonly assetId: string
  readonly status: string
}

interface ActiveUpload {
  readonly uploadId: string
  readonly partSize: number
  readonly totalParts: number
  readonly urls: Map<number, string>
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function apiErrorCode(body: unknown): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'object' &&
    body.error !== null &&
    'code' in body.error &&
    typeof body.error.code === 'string'
  ) {
    return body.error.code
  }
  return 'E_INTERNAL'
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('accept', 'application/json')
  if (init.body !== undefined) {
    headers.set('content-type', 'application/json')
  }
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers,
  })
  const body: unknown = await response.json().catch((error: unknown) => {
    if (error instanceof SyntaxError) return null
    throw error
  })
  if (!response.ok) {
    throw new UploadApiError(response.status, apiErrorCode(body))
  }
  return body as T
}

function partBytes(
  fileSize: number,
  partSize: number,
  partNumber: number,
): number {
  const start = (partNumber - 1) * partSize
  return Math.max(0, Math.min(partSize, fileSize - start))
}

function errorCodeOf(error: unknown): string {
  if (error instanceof UploadApiError) return error.code
  if (error instanceof Error && /^E_[A-Z0-9_]+$/u.test(error.message)) {
    return error.message
  }
  return 'E_STORAGE_UNAVAILABLE'
}

function canResumeAfter(error: unknown): boolean {
  if (error instanceof UploadApiError) {
    return ![
      'E_UPLOAD_SESSION_EXPIRED',
      'E_UPLOAD_SESSION_NOT_FOUND',
      'E_UPLOAD_ABORTED',
      'E_PERM_NOT_OWNER',
    ].includes(error.code)
  }
  return error instanceof UploadPartError || error instanceof TypeError
}

/**
 * 파트 하나를 PUT 한다.
 *
 * **`fetch` 가 아니라 `XMLHttpRequest` 다.** fetch 는 업로드 진행률을 주지
 * 않는다 — `ReadableStream` 요청 본문은 지원이 고르지 않고, 그것 없이는
 * 몇 GB 를 올리는 동안 화면이 멈춘 것처럼 보인다.
 *
 * 응답의 `ETag` 헤더를 돌려준다. 버킷 CORS 에 `ExposeHeaders: ETag` 가
 * 없으면 브라우저가 이 헤더를 가려 **완료가 영구히 불가능**하다. (OBS-017)
 */
export function uploadPart(input: UploadPartInput): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    let settled = false

    const cleanup = (): void => {
      input.signal.removeEventListener('abort', handleSignalAbort)
    }
    const succeed = (etag: string): void => {
      if (settled) return
      settled = true
      cleanup()
      resolve(etag)
    }
    const fail = (error: Error): void => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }
    const handleSignalAbort = (): void => {
      xhr.abort()
    }

    xhr.open('PUT', input.url)
    xhr.upload.onprogress = (event) => {
      input.onProgress(event.loaded)
    }
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        fail(new UploadPartError(xhr.status))
        return
      }
      const etag = xhr.getResponseHeader('ETag')
      if (etag === null || etag === '') {
        fail(
          new UploadPartError(
            xhr.status,
            'part upload response did not expose ETag',
          ),
        )
        return
      }
      succeed(etag)
    }
    xhr.onerror = () => {
      fail(new UploadPartError(0, 'part upload network error'))
    }
    xhr.onabort = () => {
      fail(new DOMException('part upload was aborted', 'AbortError'))
    }

    input.signal.addEventListener('abort', handleSignalAbort, { once: true })
    if (input.signal.aborted) {
      handleSignalAbort()
      return
    }
    xhr.send(input.body)
  })
}

/**
 * 자산 상태를 폴링한다. `transcoding` 단계에서만 돈다.
 *
 * react-query 의 기본값(`staleTime` 60초)은 여기에 맞지 않는다 — 트랜스코드
 * 진행률은 초 단위로 바뀐다. 이 훅이 자기 간격을 정한다.
 */
export async function pollTranscode(assetId: string): Promise<number> {
  const response = await fetch(`/api/assets/${encodeURIComponent(assetId)}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  })
  if (!response.ok) {
    throw new UploadPartError(response.status, 'asset status request failed')
  }

  const body = (await response.json()) as unknown
  if (typeof body !== 'object' || body === null || !('status' in body)) {
    throw new Error('asset status response is invalid')
  }
  if (body.status === 'READY') {
    return 100
  }
  if (body.status === 'FAILED') {
    const code =
      'errorCode' in body && typeof body.errorCode === 'string'
        ? body.errorCode
        : 'E_MEDIA_TRANSCODE_FAILED'
    throw new Error(code)
  }
  if (
    !('progress' in body) ||
    typeof body.progress !== 'number' ||
    !Number.isFinite(body.progress) ||
    body.progress < 0 ||
    body.progress > 100
  ) {
    throw new Error('asset progress response is invalid')
  }
  return body.progress
}

export function useUpload(): UploadApi {
  const [state, setState] = useState<UploadState>(INITIAL_STATE)
  const fileRef = useRef<File | null>(null)
  const activeRef = useRef<ActiveUpload | null>(null)
  const completedNumbersRef = useRef(new Set<number>())
  const completedPartsRef = useRef(new Map<number, string>())
  const controllerRef = useRef<AbortController | null>(null)
  const pausedRef = useRef(false)
  const runRef = useRef(0)
  const speedSamplesRef = useRef<number[]>([])

  const updateState = useCallback(
    (action: SetStateAction<UploadState>): void => {
      setState(action)
    },
    [],
  )

  const setPhase = useCallback(
    (phase: UploadPhase, patch: Partial<UploadState> = {}): void => {
      updateState((current) => ({
        ...current,
        phase,
        errorCode: null,
        ...patch,
      }))
    },
    [updateState],
  )

  const fail = useCallback(
    (error: unknown, resumable: boolean): void => {
      updateState((current) => ({
        ...current,
        phase: resumable ? 'resumable' : 'error',
        errorCode: resumable ? null : errorCodeOf(error),
        etaSec: null,
      }))
    },
    [updateState],
  )

  const signPartNumbers = useCallback(
    async (
      active: ActiveUpload,
      partNumbers: readonly number[],
    ): Promise<void> => {
      if (partNumbers.length === 0) return
      const parts = await requestJson<readonly SignedPartResponse[]>(
        `/api/uploads/${encodeURIComponent(active.uploadId)}/parts`,
        { method: 'POST', body: JSON.stringify({ partNumbers }) },
      )
      for (const part of parts) active.urls.set(part.partNumber, part.url)
    },
    [],
  )

  const uploadOne = useCallback(
    async (
      active: ActiveUpload,
      file: File,
      partNumber: number,
      controller: AbortController,
      loadedByPart: Map<number, number>,
      onBytes: () => void,
    ): Promise<void> => {
      const startByte = (partNumber - 1) * active.partSize
      const body = file.slice(startByte, startByte + active.partSize)

      for (let retry = 0; retry <= PART_RETRY_ATTEMPTS; retry += 1) {
        if (!active.urls.has(partNumber)) {
          await signPartNumbers(active, [partNumber])
        }
        const url = active.urls.get(partNumber)
        if (url === undefined) throw new Error('E_STORAGE_UNAVAILABLE')

        const startedAt = performance.now()
        try {
          const etag = await uploadPart({
            url,
            body,
            signal: controller.signal,
            onProgress: (loaded) => {
              loadedByPart.set(partNumber, loaded)
              onBytes()
            },
          })
          loadedByPart.delete(partNumber)
          completedNumbersRef.current.add(partNumber)
          completedPartsRef.current.set(partNumber, etag)
          const elapsedSec = Math.max(
            (performance.now() - startedAt) / 1000,
            0.001,
          )
          speedSamplesRef.current.push(body.size / elapsedSec)
          speedSamplesRef.current =
            speedSamplesRef.current.slice(-ETA_SAMPLE_SIZE)
          onBytes()
          return
        } catch (error: unknown) {
          loadedByPart.delete(partNumber)
          if (controller.signal.aborted) throw error
          if (error instanceof UploadPartError && error.status === 403) {
            active.urls.delete(partNumber)
          }
          if (retry === PART_RETRY_ATTEMPTS) throw error
          await sleep(PART_RETRY_BASE_MS * 4 ** retry)
        }
      }
    },
    [signPartNumbers],
  )

  const pollUntilReady = useCallback(
    async (assetId: string, runId: number): Promise<void> => {
      while (runRef.current === runId) {
        const progress = await pollTranscode(assetId)
        if (runRef.current !== runId) return
        if (progress >= 100) {
          setPhase('ready', { transcodeProgress: 100, progress: 100 })
          return
        }
        updateState((current) => ({
          ...current,
          transcodeProgress: progress,
        }))
        await sleep(TRANSCODE_POLL_MS)
      }
    },
    [setPhase, updateState],
  )

  const runUpload = useCallback(
    async (file: File, active: ActiveUpload, runId: number): Promise<void> => {
      const controller = new AbortController()
      controllerRef.current = controller
      const loadedByPart = new Map<number, number>()
      pausedRef.current = false
      let uploadingParts = true

      const updateBytes = (): void => {
        const completedBytes = [...completedNumbersRef.current].reduce(
          (total, partNumber) =>
            total + partBytes(file.size, active.partSize, partNumber),
          0,
        )
        const activeBytes = [...loadedByPart.values()].reduce(
          (total, loaded) => total + loaded,
          0,
        )
        const bytesSent = Math.min(file.size, completedBytes + activeBytes)
        const samples = speedSamplesRef.current
        const bytesPerSec =
          samples.length === 0
            ? 0
            : samples.reduce((total, value) => total + value, 0) /
              samples.length
        updateState((current) => ({
          ...current,
          bytesSent,
          progress: file.size === 0 ? 0 : (bytesSent / file.size) * 100,
          etaSec:
            bytesPerSec <= 0
              ? null
              : Math.max(0, Math.ceil((file.size - bytesSent) / bytesPerSec)),
        }))
      }

      setPhase('uploading', { bytesTotal: file.size })
      updateBytes()
      const missing = Array.from(
        { length: active.totalParts },
        (_, index) => index + 1,
      ).filter((partNumber) => !completedNumbersRef.current.has(partNumber))
      let cursor = 0

      const worker = async (): Promise<'done' | 'paused' | 'cancelled'> => {
        for (;;) {
          if (pausedRef.current) return 'paused'
          if (runRef.current !== runId) return 'cancelled'
          const index = cursor
          cursor += 1
          const partNumber = missing[index]
          if (partNumber === undefined) return 'done'
          await uploadOne(
            active,
            file,
            partNumber,
            controller,
            loadedByPart,
            updateBytes,
          )
        }
      }

      try {
        const results = await Promise.all(
          Array.from({ length: UPLOAD_CONCURRENCY }, () => worker()),
        )
        if (runRef.current !== runId) return
        if (results.includes('paused')) {
          setPhase('paused', { etaSec: null })
          return
        }

        uploadingParts = false
        setPhase('completing', {
          bytesSent: file.size,
          progress: 100,
          etaSec: 0,
        })
        const completed = await requestJson<CompleteUploadResponse>(
          `/api/uploads/${encodeURIComponent(active.uploadId)}/complete`,
          {
            method: 'POST',
            body: JSON.stringify({
              parts: [...completedPartsRef.current.entries()].map(
                ([partNumber, etag]) => ({ partNumber, etag }),
              ),
            }),
          },
        )
        clearSavedSession()
        setPhase('transcoding', {
          assetId: completed.assetId,
          transcodeProgress: 0,
        })
        await pollUntilReady(completed.assetId, runId)
      } catch (error: unknown) {
        if (runRef.current !== runId) return
        fail(error, uploadingParts && canResumeAfter(error))
      }
    },
    [fail, pollUntilReady, setPhase, updateState, uploadOne],
  )

  const restore = useCallback(
    async (saved: ResumableSession, file: File): Promise<ActiveUpload> => {
      if (!isSameFile(saved, file)) {
        activeRef.current = {
          uploadId: saved.uploadId,
          partSize: 1,
          totalParts: 1,
          urls: new Map(),
        }
        throw new UploadApiError(400, 'E_VALIDATION')
      }
      const remote = await requestJson<UploadSessionResponse>(
        `/api/uploads/${encodeURIComponent(saved.uploadId)}`,
        { method: 'GET' },
      )
      const active: ActiveUpload = {
        uploadId: remote.uploadId,
        partSize: remote.partSize,
        totalParts: remote.totalParts,
        urls: new Map(),
      }
      completedNumbersRef.current = new Set(remote.completedParts)
      completedPartsRef.current.clear()
      return active
    },
    [],
  )

  const create = useCallback(async (file: File): Promise<ActiveUpload> => {
    const created = await requestJson<CreateUploadResponse>('/api/uploads', {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      }),
    })
    const active: ActiveUpload = {
      uploadId: created.uploadId,
      partSize: created.partSize,
      totalParts: created.totalParts,
      urls: new Map(created.parts.map((part) => [part.partNumber, part.url])),
    }
    completedNumbersRef.current.clear()
    completedPartsRef.current.clear()
    window.localStorage.setItem(
      UPLOAD_STORAGE_KEY,
      JSON.stringify({
        uploadId: created.uploadId,
        fileName: file.name,
        fileSize: file.size,
        lastModified: file.lastModified,
      } satisfies ResumableSession),
    )
    return active
  }, [])

  const start = useCallback(
    async (file: File): Promise<void> => {
      const runId = runRef.current + 1
      runRef.current = runId
      fileRef.current = file
      speedSamplesRef.current = []
      setPhase('validating', {
        bytesSent: 0,
        bytesTotal: file.size,
        progress: 0,
        etaSec: null,
        assetId: null,
        transcodeProgress: 0,
      })
      try {
        const saved = readSavedSession()
        setPhase(saved === null ? 'creating' : 'resumable')
        const active =
          saved === null ? await create(file) : await restore(saved, file)
        activeRef.current = active
        updateState((current) => ({
          ...current,
          uploadId: active.uploadId,
        }))
        await runUpload(file, active, runId)
      } catch (error: unknown) {
        if (runRef.current === runId) fail(error, false)
      }
    },
    [create, fail, restore, runUpload, setPhase, updateState],
  )

  const pause = useCallback((): void => {
    if (state.phase !== 'uploading') return
    pausedRef.current = true
    setPhase('paused', { etaSec: null })
  }, [setPhase, state.phase])

  const resume = useCallback(async (): Promise<void> => {
    const file = fileRef.current
    const active = activeRef.current
    if (file === null || active === null) {
      setPhase('resumable', { errorCode: null })
      return
    }
    const runId = runRef.current + 1
    runRef.current = runId
    pausedRef.current = false
    try {
      const remote = await requestJson<UploadSessionResponse>(
        `/api/uploads/${encodeURIComponent(active.uploadId)}`,
        { method: 'GET' },
      )
      completedNumbersRef.current = new Set(remote.completedParts)
      active.urls.clear()
      await runUpload(file, active, runId)
    } catch (error: unknown) {
      fail(error, canResumeAfter(error))
    }
  }, [fail, runUpload, setPhase])

  const abort = useCallback(async (): Promise<void> => {
    runRef.current += 1
    pausedRef.current = false
    controllerRef.current?.abort()
    const uploadId = activeRef.current?.uploadId ?? readSavedSession()?.uploadId
    try {
      if (uploadId !== undefined) {
        await requestJson<unknown>(
          `/api/uploads/${encodeURIComponent(uploadId)}/abort`,
          { method: 'POST', body: JSON.stringify({}) },
        )
      }
      clearSavedSession()
      activeRef.current = null
      fileRef.current = null
      completedNumbersRef.current.clear()
      completedPartsRef.current.clear()
      updateState(INITIAL_STATE)
    } catch (error: unknown) {
      fail(error, false)
    }
  }, [fail, updateState])

  const retry = useCallback(async (): Promise<void> => {
    const file = fileRef.current
    if (activeRef.current === null && file !== null) {
      await start(file)
      return
    }
    await resume()
  }, [resume, start])

  useEffect(() => {
    if (state.phase !== 'uploading') return
    const warn = (event: BeforeUnloadEvent): void => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
    }
  }, [state.phase])

  useEffect(
    () => () => {
      runRef.current += 1
      controllerRef.current?.abort()
    },
    [],
  )

  return { state, start, pause, resume, abort, retry }
}
