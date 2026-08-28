'use client'

import type { WorkType } from '@aidream/core'
import { Button } from '@aidream/ui'
import { Plus, UploadCloud, X } from 'lucide-react'
import React, { useCallback, useEffect, useState, type ReactNode } from 'react'

import type { StudioAssetOption } from '@/src/services/studio/get-studio-dashboard'
import { Uploader } from '@/src/components/upload/Uploader'

import { CreateEpisodeForm } from './CreateEpisodeForm'
import { OPEN_EPISODE_CREATOR } from './episode-create-events'

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
  const [tab, setTab] = useState<'UPLOAD' | 'DETAILS'>(
    availableAssets.length === 0 ? 'UPLOAD' : 'DETAILS',
  )
  const episodic = workType === 'SERIES'
  const close = useCallback((): void => {
    setOpen(false)
    if (window.location.hash === '#new-episode') {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}#episodes`,
      )
    }
  }, [])

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
                <p>업로드부터 작품 연결까지 이 화면에서 완료합니다.</p>
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
            </nav>
            <div className="studio-create-workspace-body">
              {tab === 'UPLOAD' ? (
                <Uploader
                  context="episode"
                  onReady={() => {
                    setTab('DETAILS')
                  }}
                />
              ) : (
                <CreateEpisodeForm
                  availableAssets={availableAssets}
                  onCreated={close}
                  seriesId={seriesId}
                  workType={workType}
                />
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
