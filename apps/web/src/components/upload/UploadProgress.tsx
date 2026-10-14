import { Progress } from '@aidream/ui'
import * as React from 'react'
import type { ReactNode } from 'react'

import type { UploadState } from '@/src/hooks/use-upload'

const PHASE_LABEL: Readonly<Record<UploadState['phase'], string>> = {
  idle: '업로드할 파일을 선택해 주세요',
  validating: '파일을 확인하고 있습니다',
  creating: '업로드를 준비하고 있습니다',
  uploading: '영상을 업로드하고 있습니다',
  paused: '업로드가 일시정지되었습니다',
  resumable: '이어서 올릴 수 있습니다',
  completing: '업로드를 완료하고 있습니다',
  transcoding: '재생 가능한 영상으로 변환하고 있습니다',
  ready: '영상 준비가 완료되었습니다',
  error: '영상 준비를 완료하지 못했습니다',
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)}GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)}MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${String(bytes)}B`
}

export interface UploadProgressProps {
  readonly state: UploadState
}

export function UploadProgress({ state }: UploadProgressProps): ReactNode {
  const isTranscoding =
    state.assetId !== null ||
    state.phase === 'transcoding' ||
    state.phase === 'ready'
  const value = isTranscoding ? state.transcodeProgress : state.progress
  const label = isTranscoding ? '영상 변환 진행률' : '파일 업로드 진행률'

  return (
    <section
      aria-live="polite"
      className="flex flex-col gap-3 rounded-lg border border-border bg-bg-elevated p-4"
    >
      <p className="font-medium text-fg">{PHASE_LABEL[state.phase]}</p>
      <Progress value={value} label={label} />
      <div className="studio-upload-quality" aria-label="영상 화질 준비 상태">
        {(['SD', 'HD'] as const).map((quality) => {
          const names = quality === 'SD' ? ['360p', '480p'] : ['720p', '1080p']
          const ready =
            state.renditions?.some((name) => names.includes(name)) === true
          const text =
            state.phase === 'ready'
              ? state.renditions === undefined
                ? '화질 확인 중'
                : ready
                  ? '준비 완료'
                  : '원본·설정에 따라 제공하지 않음'
              : state.phase === 'error'
                ? '준비 중단'
                : isTranscoding
                  ? '변환 중'
                  : '업로드 후 확인'
          return (
            <span key={quality} data-ready={ready}>
              <strong>{quality}</strong> {text}
            </span>
          )
        })}
      </div>
      {state.phase !== 'transcoding' ? null : (
        <p className="text-sm text-fg-muted">
          변환은 서버에서 계속됩니다. 모든 화질이 준비되면 영상이 연결됩니다.
        </p>
      )}
      {state.bytesTotal <= 0 || isTranscoding ? null : (
        <p className="text-sm text-fg-muted">
          {formatBytes(state.bytesSent)} / {formatBytes(state.bytesTotal)}
          {state.etaSec === null
            ? null
            : ` · 약 ${String(state.etaSec)}초 남음`}
        </p>
      )}
    </section>
  )
}
