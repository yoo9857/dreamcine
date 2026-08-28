'use client'

import type { EpisodeResponse, WorkType } from '@aidream/core'
import { Button } from '@aidream/ui'
import { ArrowRight, CheckCircle2, Plus, UploadCloud, X } from 'lucide-react'
import Link from 'next/link'
import React, { useCallback, useEffect, useState, type ReactNode } from 'react'

import { Uploader } from '@/src/components/upload/Uploader'
import type { StudioAssetOption } from '@/src/services/studio/get-studio-dashboard'

import { CreateEpisodeForm } from './CreateEpisodeForm'
import { OPEN_EPISODE_CREATOR } from './episode-create-events'

type CreatorStep = 'UPLOAD' | 'DETAILS' | 'COMPLETE'

export function EpisodeCreateWorkspace({
  availableAssets,
  seriesId,
  workType,
}: {
  readonly availableAssets: readonly StudioAssetOption[]
  readonly seriesId: string
  readonly workType: WorkType
}): ReactNode {
  const [open, setOpen] = useState(false)
  const [assets, setAssets] =
    useState<readonly StudioAssetOption[]>(availableAssets)
  const [tab, setTab] = useState<CreatorStep>(
    availableAssets.length === 0 ? 'UPLOAD' : 'DETAILS',
  )
  const [preferredAssetId, setPreferredAssetId] = useState<string>()
  const [createdEpisode, setCreatedEpisode] = useState<EpisodeResponse>()
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [publishError, setPublishError] = useState<string>()
  const episodic = workType === 'SERIES'

  useEffect(() => {
    setAssets(availableAssets)
  }, [availableAssets])

  const close = useCallback((): void => {
    setOpen(false)
    setCreatedEpisode(undefined)
    setPreferredAssetId(undefined)
    setPublishing(false)
    setPublished(false)
    setPublishError(undefined)
    setTab(assets.length === 0 ? 'UPLOAD' : 'DETAILS')
    if (window.location.hash === '#new-episode') {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}#episodes`,
      )
    }
  }, [assets.length])

  const openUploadedAsset = async (assetId: string): Promise<void> => {
    const response = await fetch('/api/studio/assets/available', {
      cache: 'no-store',
    })
    if (!response.ok) throw new Error('asset-sync-failed')
    const nextAssets = (await response.json()) as StudioAssetOption[]
    if (!nextAssets.some((asset) => asset.id === assetId)) {
      throw new Error('uploaded-asset-missing')
    }
    setAssets(nextAssets)
    setPreferredAssetId(assetId)
    setTab('DETAILS')
  }

  const publishCreatedEpisode = async (): Promise<void> => {
    if (createdEpisode === undefined) return
    setPublishing(true)
    setPublishError(undefined)
    const response = await fetch(`/api/episodes/${createdEpisode.id}/publish`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'PUBLISH' }),
    })
    setPublishing(false)
    if (!response.ok) {
      setPublishError(
        '공개하지 못했습니다. 영상 변환 상태와 AI 제작 표기를 확인해 주세요.',
      )
      return
    }
    setPublished(true)
  }

  useEffect(() => {
    const show = (): void => {
      setOpen(true)
    }
    const showFromHash = (): void => {
      if (window.location.hash === '#new-episode') show()
    }
    window.addEventListener(OPEN_EPISODE_CREATOR, show)
    window.addEventListener('hashchange', showFromHash)
    showFromHash()
    return () => {
      window.removeEventListener(OPEN_EPISODE_CREATOR, show)
      window.removeEventListener('hashchange', showFromHash)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    document.body.classList.add('studio-modal-open')
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.classList.remove('studio-modal-open')
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [close, open])

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
      >
        <Plus aria-hidden="true" /> {episodic ? '회차 추가' : '영상 추가'}
      </Button>
      {open ? (
        <div
          className="studio-create-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close()
          }}
        >
          <section
            className="studio-create-workspace"
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-create-title"
          >
            <header className="studio-create-workspace-header">
              <div>
                <span>CREATE CONTENT</span>
                <h2 id="studio-create-title">
                  {episodic ? '새 회차 만들기' : '새 영상 연결하기'}
                </h2>
                <p>업로드부터 작품 연결 확인까지 이 화면에서 완료합니다.</p>
              </div>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => {
                  close()
                }}
              >
                <X aria-hidden="true" />
              </button>
            </header>
            <nav className="studio-create-tabs" aria-label="콘텐츠 등록 단계">
              <button
                type="button"
                aria-current={tab === 'UPLOAD' ? 'step' : undefined}
                disabled={tab === 'COMPLETE'}
                onClick={() => {
                  setTab('UPLOAD')
                }}
              >
                <UploadCloud aria-hidden="true" />
                <span>
                  <small>STEP 1</small>영상 업로드
                </span>
              </button>
              <button
                type="button"
                aria-current={tab === 'DETAILS' ? 'step' : undefined}
                disabled={tab === 'COMPLETE'}
                onClick={() => {
                  setTab('DETAILS')
                }}
              >
                <Plus aria-hidden="true" />
                <span>
                  <small>STEP 2</small>
                  {episodic ? '회차 정보' : '영상 정보'}
                </span>
              </button>
              <button
                type="button"
                aria-current={tab === 'COMPLETE' ? 'step' : undefined}
                disabled={tab !== 'COMPLETE'}
              >
                <CheckCircle2 aria-hidden="true" />
                <span>
                  <small>STEP 3</small>등록 완료
                </span>
              </button>
            </nav>
            <div className="studio-create-workspace-body">
              {tab === 'UPLOAD' ? (
                <Uploader context="episode" onReady={openUploadedAsset} />
              ) : tab === 'DETAILS' ? (
                <CreateEpisodeForm
                  availableAssets={assets}
                  onCreated={(episode) => {
                    setCreatedEpisode(episode)
                    setPublished(false)
                    setPublishError(undefined)
                    setTab('COMPLETE')
                  }}
                  {...(preferredAssetId === undefined
                    ? {}
                    : { preferredAssetId })}
                  seriesId={seriesId}
                  workType={workType}
                />
              ) : (
                <section className="studio-registration-complete" role="status">
                  <CheckCircle2 aria-hidden="true" />
                  <span>REGISTRATION COMPLETE</span>
                  <h3>
                    {published
                      ? '영상 공개가 완료되었습니다'
                      : '영상 등록이 완료되었습니다'}
                  </h3>
                  <strong>{createdEpisode?.title}</strong>
                  <p>
                    {published
                      ? '이제 모든 시청자가 재생 페이지에서 영상을 볼 수 있습니다.'
                      : '작품의 콘텐츠 목록에 초안으로 안전하게 저장했습니다. 지금 공개하거나 목록에서 예약·수정 상태를 이어서 관리할 수 있습니다.'}
                  </p>
                  {publishError === undefined ? null : (
                    <small role="alert">{publishError}</small>
                  )}
                  <div className="studio-registration-actions">
                    {published && createdEpisode !== undefined ? (
                      <Button asChild>
                        <Link href={`/watch/${createdEpisode.id}`}>
                          재생 페이지 열기 <ArrowRight aria-hidden="true" />
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        loading={publishing}
                        onClick={() => void publishCreatedEpisode()}
                      >
                        지금 공개
                      </Button>
                    )}
                    <Button type="button" variant="secondary" onClick={close}>
                      콘텐츠 목록으로
                    </Button>
                  </div>
                </section>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
