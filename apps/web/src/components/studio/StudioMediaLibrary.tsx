'use client'

import { Button } from '@aidream/ui'
import {
  CheckCircle2,
  CircleAlert,
  Clapperboard,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState, type ReactNode } from 'react'

import type { StudioMediaItem } from '@/src/services/studio/get-studio-dashboard'

const STATUS = {
  PENDING: { label: '변환 대기', icon: LoaderCircle },
  PROBING: { label: '영상 분석', icon: LoaderCircle },
  TRANSCODING: { label: '변환 중', icon: LoaderCircle },
  READY: { label: '사용 가능', icon: CheckCircle2 },
  FAILED: { label: '변환 실패', icon: CircleAlert },
} as const

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '길이 확인 중'
  const minutes = Math.floor(seconds / 60)
  const remainder = String(seconds % 60).padStart(2, '0')
  return `${String(minutes)}:${remainder}`
}

export function StudioMediaLibrary({
  assets,
}: {
  readonly assets: readonly StudioMediaItem[]
}): ReactNode {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function retry(assetId: string): Promise<void> {
    setBusyId(assetId)
    setError('')
    const response = await fetch(`/api/assets/${assetId}/retry`, {
      method: 'POST',
    })
    setBusyId(null)
    if (!response.ok) {
      setError(
        '영상 변환을 다시 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
      return
    }
    router.refresh()
  }

  if (assets.length === 0) {
    return (
      <div className="studio-media-empty">
        <Clapperboard aria-hidden="true" />
        <strong>아직 업로드한 영상이 없습니다</strong>
        <p>위 업로더에서 첫 원본 영상을 등록해 보세요.</p>
      </div>
    )
  }

  return (
    <div className="studio-media-library">
      {error === '' ? null : <p role="alert">{error}</p>}
      <div className="studio-media-toolbar">
        <span>
          전체 <strong>{assets.length}</strong>
        </span>
        <span>
          사용 가능{' '}
          <strong>
            {assets.filter((asset) => asset.status === 'READY').length}
          </strong>
        </span>
        <span>
          처리 중{' '}
          <strong>
            {
              assets.filter((asset) =>
                ['PENDING', 'PROBING', 'TRANSCODING'].includes(asset.status),
              ).length
            }
          </strong>
        </span>
        <button
          type="button"
          onClick={() => {
            router.refresh()
          }}
        >
          <RefreshCw aria-hidden="true" /> 상태 새로고침
        </button>
      </div>
      <div className="studio-media-list">
        {assets.map((asset) => {
          const status = STATUS[asset.status]
          const StatusIcon = status.icon
          return (
            <article key={asset.id}>
              <span className="studio-media-poster">
                {asset.posterUrl === null ? (
                  <Clapperboard aria-hidden="true" />
                ) : (
                  <img src={asset.posterUrl} alt="" />
                )}
              </span>
              <div className="studio-media-copy">
                <strong>{asset.fileName}</strong>
                <span>
                  {formatDuration(asset.durationSec)}
                  {asset.width === null || asset.height === null
                    ? ''
                    : ` · ${String(asset.width)}×${String(asset.height)}`}
                  {' · '}
                  {new Intl.DateTimeFormat('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                  }).format(new Date(asset.createdAt))}
                </span>
              </div>
              <span className="studio-media-status" data-status={asset.status}>
                <StatusIcon aria-hidden="true" /> {status.label}
              </span>
              <div className="studio-media-link">
                {asset.episode === null ? (
                  asset.status === 'READY' ? (
                    <span>연결 대기</span>
                  ) : null
                ) : (
                  <Link href={`/studio/series/${asset.episode.seriesId}`}>
                    {asset.episode.title}
                  </Link>
                )}
                {asset.status === 'FAILED' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === asset.id}
                    onClick={() => void retry(asset.id)}
                  >
                    <RefreshCw aria-hidden="true" />
                    {busyId === asset.id ? '재시도 중…' : '변환 재시도'}
                  </Button>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
