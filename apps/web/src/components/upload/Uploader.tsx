'use client'

import { ERROR_CODES, type ErrorCode } from '@aidream/core'
import { Button, ErrorState } from '@aidream/ui'
import {
  ArrowRight,
  CheckCircle2,
  Library,
  Plus,
  UploadCloud,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from 'react'

import { useUpload } from '@/src/hooks/use-upload'
import { staticMessageFor } from '@/src/lib/error-messages'

import { UploadProgress } from './UploadProgress'

const ACCEPTED_VIDEO_TYPES =
  'video/mp4,video/quicktime,video/x-matroska,video/webm'

function knownErrorCode(value: string | null): ErrorCode {
  return value !== null && ERROR_CODES.some((code) => code === value)
    ? (value as ErrorCode)
    : 'E_INTERNAL'
}

export function Uploader({
  context = 'library',
  onReady,
}: {
  readonly context?: 'library' | 'episode'
  readonly onReady?: () => void
} = {}): ReactNode {
  const upload = useUpload()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const isBusy = [
    'validating',
    'creating',
    'uploading',
    'completing',
    'transcoding',
  ].includes(upload.state.phase)

  useEffect(() => {
    if (upload.state.phase === 'ready') {
      router.refresh()
      onReady?.()
    }
  }, [onReady, router, upload.state.phase])

  const choose = (next: File | null): void => {
    if (next === null || isBusy) return
    setFile(next)
    void upload.start(next)
  }
  const onChange = (event: ChangeEvent<HTMLInputElement>): void => {
    choose(event.target.files?.[0] ?? null)
  }
  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    choose(event.dataTransfer.files[0] ?? null)
  }
  const openPicker = (): void => {
    inputRef.current?.click()
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        onDragOver={(event) => {
          event.preventDefault()
        }}
        onDrop={onDrop}
        className="flex min-h-52 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border bg-bg-elevated p-8 text-center"
      >
        <UploadCloud aria-hidden="true" className="size-10 text-accent" />
        <div>
          <p className="font-semibold text-fg">영상 파일을 놓아주세요</p>
          <p className="mt-1 text-sm text-fg-muted">
            MP4, MOV, MKV, WebM · 파일은 앱 서버를 거치지 않고 바로 저장됩니다.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_VIDEO_TYPES}
          onChange={onChange}
          className="sr-only"
          aria-label="업로드할 영상 선택"
          disabled={isBusy}
        />
        <Button onClick={openPicker} disabled={isBusy}>
          {file === null ? '파일 선택' : '다른 파일 선택'}
        </Button>
        {file === null ? null : (
          <p className="max-w-full truncate text-sm text-fg-secondary">
            선택한 파일: {file.name}
          </p>
        )}
      </div>

      {upload.state.phase === 'idle' ? null : (
        <UploadProgress state={upload.state} />
      )}

      {upload.state.phase === 'error' ? (
        <ErrorState
          code={knownErrorCode(upload.state.errorCode)}
          description={staticMessageFor(knownErrorCode(upload.state.errorCode))}
          onRetry={() => {
            void upload.retry()
          }}
        />
      ) : null}

      {upload.state.phase === 'ready' && context === 'library' ? (
        <section
          className="studio-upload-next"
          aria-labelledby="upload-next-title"
        >
          <CheckCircle2 aria-hidden="true" />
          <div>
            <span>NEXT STEP</span>
            <h2 id="upload-next-title">이제 영상을 작품에 연결하세요</h2>
            <p>
              준비된 영상은 미디어 보관함에 저장되었습니다. 기존 작품의 회차나
              본편으로 연결하거나 새 작품을 만들 수 있습니다.
            </p>
            <div>
              <Link href="/studio/content" className="studio-button primary">
                작품 선택 <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                href="/studio/series/new"
                className="studio-button secondary"
              >
                <Plus aria-hidden="true" /> 새 작품 만들기
              </Link>
              <a href="#library" className="studio-upload-library-link">
                <Library aria-hidden="true" /> 미디어 보관함 확인
              </a>
            </div>
          </div>
        </section>
      ) : null}

      {upload.state.phase === 'ready' && context === 'episode' ? (
        <section className="studio-upload-inline-ready" role="status">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <strong>영상 준비가 완료되었습니다</strong>
            <p>회차 정보 단계로 이동해 방금 올린 영상을 연결합니다.</p>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {upload.state.phase === 'uploading' ? (
          <Button
            variant="secondary"
            onClick={() => {
              upload.pause()
            }}
          >
            일시정지
          </Button>
        ) : null}
        {upload.state.phase === 'paused' ||
        upload.state.phase === 'resumable' ? (
          <Button
            onClick={() => {
              if (file === null) openPicker()
              else void upload.resume()
            }}
          >
            {file === null ? '같은 파일 다시 선택' : '이어서 올리기'}
          </Button>
        ) : null}
        {upload.state.uploadId === null ||
        upload.state.phase === 'ready' ? null : (
          <Button
            variant="danger"
            onClick={() => {
              void upload.abort()
            }}
          >
            업로드 취소
          </Button>
        )}
      </div>
    </div>
  )
}
