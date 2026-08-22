'use client'

import { NotImplementedError } from '@aidream/core'

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

export function isSameFile(_saved: ResumableSession, _file: File): boolean {
  throw new NotImplementedError('T05:resumeUpload')
}

export function readSavedSession(): ResumableSession | null {
  throw new NotImplementedError('T05:resumeUpload')
}

export function clearSavedSession(): void {
  throw new NotImplementedError('T05:resumeUpload')
}

export interface UploadPartInput {
  readonly url: string
  readonly body: Blob
  readonly signal: AbortSignal
  /** 전송된 누적 바이트. 진행률 계산은 호출자가 한다. */
  onProgress(loaded: number): void
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
export function uploadPart(_input: UploadPartInput): Promise<string> {
  throw new NotImplementedError('T05:uploadPart')
}

/**
 * 자산 상태를 폴링한다. `transcoding` 단계에서만 돈다.
 *
 * react-query 의 기본값(`staleTime` 60초)은 여기에 맞지 않는다 — 트랜스코드
 * 진행률은 초 단위로 바뀐다. 이 훅이 자기 간격을 정한다.
 */
export function pollTranscode(_assetId: string): Promise<number> {
  throw new NotImplementedError('T05:pollTranscode')
}

export function useUpload(): UploadApi {
  throw new NotImplementedError('T05:useUpload')
}
