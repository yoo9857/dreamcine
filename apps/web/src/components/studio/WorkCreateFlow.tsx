'use client'

import type { EpisodeResponse, SeriesResponse, WorkType } from '@aidream/core'
import { Button } from '@aidream/ui'
import {
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Film,
  FolderOpen,
  ListPlus,
  Plus,
  Search,
  UploadCloud,
} from 'lucide-react'
import Link from 'next/link'
import React, { useMemo, useState, type ReactNode } from 'react'

import { Uploader } from '@/src/components/upload/Uploader'
import { readApiError } from '@/src/lib/error-messages'
import type { StudioAssetOption } from '@/src/services/studio/get-studio-dashboard'

import { CreateEpisodeForm } from './CreateEpisodeForm'
import { CreateSeriesForm } from './CreateSeriesForm'
import { workTypeLabel } from './work-types'

/**
 * 스튜디오의 단일 등록 진입점.
 *
 * 예전에는 "업로드" 와 "새 시리즈" 가 사이드바의 동등한 최상위 항목이었다.
 * 둘은 사실 한 작업의 앞뒤 단계인데 나란히 놓여 있어서, 신규 크리에이터가
 * 어디서 시작해야 하는지 알 수 없다는 피드백이 반복됐다. 여기서는 그 둘을
 * 시리즈 → 영상 → 회차 의 3단계 한 흐름으로 합친다.
 */
type FlowStep = 'WORK' | 'UPLOAD' | 'DETAILS' | 'COMPLETE'

const STEPS = [
  { id: 'WORK', label: '시리즈 선택', icon: Clapperboard },
  { id: 'UPLOAD', label: '영상 업로드', icon: UploadCloud },
  { id: 'DETAILS', label: '회차 정보 · 공개', icon: ListPlus },
] as const

/** 완료 화면은 되돌아갈 수 있는 단계가 아니라 결과다. */
const STEP_ORDER: readonly FlowStep[] = ['WORK', 'UPLOAD', 'DETAILS']

interface SelectedWork {
  readonly id: string
  readonly title: string
  readonly workType: WorkType
}

function StepNav({
  step,
  onSelect,
}: {
  readonly step: FlowStep
  readonly onSelect: (next: FlowStep) => void
}): ReactNode {
  const currentIndex = STEP_ORDER.indexOf(step)
  return (
    <nav className="studio-create-tabs" aria-label="시리즈 등록 단계">
      {STEPS.map((item, index) => {
        const Icon = item.icon
        // 완료 화면에서는 어떤 단계도 되돌리지 않는다.
        const reachable = step !== 'COMPLETE' && index < currentIndex
        return (
          <button
            key={item.id}
            type="button"
            aria-current={step === item.id ? 'step' : undefined}
            disabled={!reachable}
            onClick={() => {
              onSelect(item.id)
            }}
          >
            <Icon aria-hidden="true" />
            <span>
              <small>STEP {index + 1}</small>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

/** 검색창을 띄울 기준. 이보다 적으면 눈으로 훑는 편이 빠르다. */
const SEARCH_THRESHOLD = 6

function WorkRow({
  work,
  onSelect,
}: {
  readonly work: SeriesResponse
  readonly onSelect: (work: SelectedWork) => void
}): ReactNode {
  const empty = work.episodeCount === 0
  return (
    <li>
      <button
        type="button"
        onClick={() => {
          onSelect({
            id: work.id,
            title: work.title,
            workType: work.workType,
          })
        }}
      >
        <span className="studio-series-poster" aria-hidden="true">
          {work.posterUrl === undefined ? (
            <Film />
          ) : (
            <img src={work.posterUrl} alt="" />
          )}
        </span>
        <span className="studio-work-picker-text">
          {/* 제목이 먼저다. 크리에이터는 형식이 아니라 이름으로 찾는다. */}
          <strong>{work.title}</strong>
          <small>
            {workTypeLabel(work.workType)} ·{' '}
            {empty ? '아직 영상 없음' : `${String(work.episodeCount)}편`}
          </small>
        </span>
        {/* 비어 있는 시리즈가 지금 채우려는 대상이다. 수치로 묻지 않는다. */}
        {empty ? (
          <span className="studio-work-picker-flag">비어 있음</span>
        ) : null}
        <ArrowRight aria-hidden="true" />
      </button>
    </li>
  )
}

function WorkStep({
  works,
  onSelect,
}: {
  readonly works: readonly SeriesResponse[]
  readonly onSelect: (work: SelectedWork) => void
}): ReactNode {
  // 시리즈가 하나도 없으면 고를 것이 없다. 선택지를 보여주는 대신 바로
  // 만들기로 연다 — 첫 크리에이터에게 빈 목록은 막다른 길로 읽힌다.
  const [mode, setMode] = useState<'EXISTING' | 'NEW'>(
    works.length === 0 ? 'NEW' : 'EXISTING',
  )
  const [query, setQuery] = useState('')

  // 방금 손댄 시리즈에 이어 붙이는 경우가 가장 흔하다. 최근 수정순이 기본이다.
  const sorted = useMemo(
    () =>
      [...works].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      ),
    [works],
  )
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR')
    if (normalized === '') return sorted
    return sorted.filter((work) =>
      work.title.toLocaleLowerCase('ko-KR').includes(normalized),
    )
  }, [sorted, query])

  return (
    <div className="studio-work-step">
      {works.length === 0 ? null : (
        <div
          className="studio-work-mode"
          role="radiogroup"
          aria-label="등록할 위치"
        >
          <label>
            <input
              type="radio"
              name="workMode"
              checked={mode === 'EXISTING'}
              onChange={() => {
                setMode('EXISTING')
              }}
            />
            <span>
              <FolderOpen aria-hidden="true" />
              <strong>기존 시리즈에 추가</strong>
              <small>이미 만든 시리즈에 회차·영상을 이어 붙입니다</small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="workMode"
              checked={mode === 'NEW'}
              onChange={() => {
                setMode('NEW')
              }}
            />
            <span>
              <Plus aria-hidden="true" />
              <strong>새 시리즈 만들기</strong>
              <small>시리즈·영화·숏폼·광고 등 형식을 먼저 정합니다</small>
            </span>
          </label>
        </div>
      )}

      {mode === 'EXISTING' ? (
        <div className="studio-work-browse">
          {works.length > SEARCH_THRESHOLD ? (
            <label className="studio-work-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                value={query}
                placeholder="시리즈 검색"
                aria-label="시리즈 검색"
                onChange={(event) => {
                  setQuery(event.currentTarget.value)
                }}
              />
            </label>
          ) : null}
          {visible.length === 0 ? (
            <p className="studio-work-picker-empty" role="status">
              “{query}”와 일치하는 시리즈가 없습니다.
            </p>
          ) : (
            <ul className="studio-work-picker" aria-label="내 시리즈">
              {visible.map((work) => (
                <WorkRow key={work.id} work={work} onSelect={onSelect} />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="studio-work-new">
          <CreateSeriesForm
            submitLabel="시리즈 만들고 계속"
            onCreated={(series) => {
              onSelect({
                id: series.id,
                title: series.title,
                workType: series.workType,
              })
            }}
          />
        </div>
      )}
    </div>
  )
}

export function WorkCreateFlow({
  works,
  availableAssets,
}: {
  readonly works: readonly SeriesResponse[]
  readonly availableAssets: readonly StudioAssetOption[]
}): ReactNode {
  const [step, setStep] = useState<FlowStep>('WORK')
  const [work, setWork] = useState<SelectedWork>()
  const [assets, setAssets] =
    useState<readonly StudioAssetOption[]>(availableAssets)
  const [preferredAssetId, setPreferredAssetId] = useState<string>()
  const [createdEpisode, setCreatedEpisode] = useState<EpisodeResponse>()
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [publishError, setPublishError] = useState<string>()

  const useUploadedAsset = async (assetId: string): Promise<void> => {
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
    setStep('DETAILS')
  }

  const publishCreatedEpisode = async (): Promise<void> => {
    if (createdEpisode === undefined) return
    setPublishing(true)
    setPublishError(undefined)
    try {
      const response = await fetch(
        `/api/episodes/${createdEpisode.id}/publish`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'PUBLISH' }),
        },
      )
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null)
        const apiError = readApiError(payload)
        setPublishError(
          apiError?.message ??
            '공개하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        )
        return
      }
      setPublished(true)
    } catch {
      setPublishError('네트워크 연결을 확인한 뒤 다시 시도해 주세요.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <section className="studio-create-flow">
      <StepNav step={step} onSelect={setStep} />

      <div className="studio-create-flow-body">
        {step === 'WORK' ? (
          <WorkStep
            works={works}
            onSelect={(selected) => {
              setWork(selected)
              // 준비된 영상이 이미 있으면 업로드를 강제하지 않는다.
              setStep(assets.length === 0 ? 'UPLOAD' : 'DETAILS')
            }}
          />
        ) : null}

        {step === 'UPLOAD' ? (
          <div className="studio-create-upload">
            <Uploader context="episode" onReady={useUploadedAsset} />
            {assets.length === 0 ? null : (
              <button
                type="button"
                className="studio-create-skip"
                onClick={() => {
                  setStep('DETAILS')
                }}
              >
                이미 올린 영상 {assets.length}개 중에서 고르기{' '}
                <ArrowRight aria-hidden="true" />
              </button>
            )}
          </div>
        ) : null}

        {step === 'DETAILS' && work !== undefined ? (
          <div className="studio-create-details">
            <p className="studio-create-target" role="status">
              <Clapperboard aria-hidden="true" />
              <strong>{work.title}</strong>
              <span>{workTypeLabel(work.workType)}</span>
            </p>
            {assets.length === 0 ? (
              <div className="studio-asset-picker-empty">
                <strong>연결할 준비 완료 영상이 없습니다</strong>
                <p>업로드와 변환이 끝나면 이곳에서 바로 선택할 수 있습니다.</p>
                <button
                  type="button"
                  onClick={() => {
                    setStep('UPLOAD')
                  }}
                >
                  영상 업로드로 이동
                </button>
              </div>
            ) : (
              <CreateEpisodeForm
                availableAssets={assets}
                onCreated={(episode) => {
                  setCreatedEpisode(episode)
                  setPublished(false)
                  setPublishError(undefined)
                  setStep('COMPLETE')
                }}
                {...(preferredAssetId === undefined
                  ? {}
                  : { preferredAssetId })}
                seriesId={work.id}
                workType={work.workType}
              />
            )}
          </div>
        ) : null}

        {step === 'COMPLETE' ? (
          <section className="studio-registration-complete" role="status">
            <CheckCircle2 aria-hidden="true" />
            <span>REGISTRATION COMPLETE</span>
            <h2>
              {published
                ? '영상 공개가 완료되었습니다'
                : '영상 등록이 완료되었습니다'}
            </h2>
            <strong>{createdEpisode?.title}</strong>
            <p>
              {published
                ? '이제 모든 시청자가 재생 페이지에서 영상을 볼 수 있습니다.'
                : '시리즈의 콘텐츠 목록에 초안으로 저장했습니다. 지금 공개하거나 목록에서 예약·수정 상태를 이어서 관리할 수 있습니다.'}
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
              {work === undefined ? null : (
                <Button asChild variant="secondary">
                  <Link href={`/studio/series/${work.id}`}>시리즈 관리로</Link>
                </Button>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  )
}
