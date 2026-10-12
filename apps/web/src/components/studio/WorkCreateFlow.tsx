'use client'

import type { EpisodeResponse, SeriesResponse, WorkType } from '@aidream/core'
import { Button } from '@aidream/ui'
import {
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Film,
  FolderOpen,
  Plus,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { Uploader } from '@/src/components/upload/Uploader'
import { readApiError } from '@/src/lib/error-messages'
import type { StudioAssetOption } from '@/src/services/studio/get-studio-dashboard'

import {
  CreateEpisodeForm,
  type EpisodeDraftSummary,
} from './CreateEpisodeForm'
import { CreateSeriesForm } from './CreateSeriesForm'
import { workTypeLabel } from './work-types'

/**
 * 스튜디오의 단일 등록 진입점.
 *
 * 시리즈 선택, 영상 연결, 상세 입력을 한 페이지에 두고
 * 필수 항목이 준비되면 초안으로 저장한다. 업로더는 선택 변경 중에도 유지한다.
 */
interface SelectedWork {
  readonly id: string
  readonly title: string
  readonly workType: WorkType
}

/** 1단계 목록이 그리는 데 필요한 필드만. 흐름 안에서 만든 시리즈도 담는다. */
type WorkOption = Pick<
  SeriesResponse,
  'id' | 'title' | 'workType' | 'posterUrl' | 'episodeCount' | 'updatedAt'
>

/** 검색창을 띄울 기준. 이보다 적으면 눈으로 훑는 편이 빠르다. */
const SEARCH_THRESHOLD = 6

function WorkRow({
  work,
  onSelect,
  selected,
}: {
  readonly work: WorkOption
  readonly onSelect: (work: SelectedWork) => void
  readonly selected: boolean
}): ReactNode {
  const empty = work.episodeCount === 0
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
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
          <strong title={work.title}>{work.title}</strong>
          <small>
            {workTypeLabel(work.workType)} ·{' '}
            {empty ? '아직 영상 없음' : `${String(work.episodeCount)}편`}
          </small>
        </span>
        {/* 비어 있는 시리즈가 지금 채우려는 대상이다. 수치로 묻지 않는다. */}
        {empty ? (
          <span className="studio-work-picker-flag">비어 있음</span>
        ) : null}
        {selected ? (
          <CheckCircle2 aria-hidden="true" />
        ) : (
          <ArrowRight aria-hidden="true" />
        )}
      </button>
    </li>
  )
}

function WorkStep({
  works,
  onSelect,
  onCreated,
  selectedId,
  onWorkTypeChange,
  onChooseNew,
  onBusyChange,
}: {
  readonly works: readonly WorkOption[]
  readonly onSelect: (work: SelectedWork) => void
  readonly onCreated: (work: SelectedWork) => void
  readonly selectedId: string | undefined
  readonly onWorkTypeChange: (workType: WorkType) => void
  readonly onChooseNew: () => void
  readonly onBusyChange: (busy: boolean) => void
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
                onChooseNew()
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

      <div className="studio-work-browse" hidden={mode !== 'EXISTING'}>
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
              <WorkRow
                key={work.id}
                work={work}
                onSelect={onSelect}
                selected={work.id === selectedId}
              />
            ))}
          </ul>
        )}
      </div>
      <div className="studio-work-new" hidden={mode !== 'NEW'}>
        <CreateSeriesForm
          submitLabel="이 시리즈로 등록 준비"
          onWorkTypeChange={onWorkTypeChange}
          onBusyChange={onBusyChange}
          onCreated={(series) => {
            onCreated({
              id: series.id,
              title: series.title,
              workType: series.workType,
            })
            setMode('EXISTING')
          }}
        />
      </div>
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
  const [work, setWork] = useState<SelectedWork>()
  const [newWorkType, setNewWorkType] = useState<WorkType>('SERIES')
  const [workOptions, setWorkOptions] = useState<readonly WorkOption[]>(works)
  const [assets, setAssets] =
    useState<readonly StudioAssetOption[]>(availableAssets)
  const [preferredAssetId, setPreferredAssetId] = useState<string>()
  const [draft, setDraft] = useState<EpisodeDraftSummary>({
    title: '',
    assetId: '',
    aiDisclosure: '',
    ageRating: 'ALL',
  })
  const onDraftChange = useCallback((value: EpisodeDraftSummary): void => {
    setDraft(value)
  }, [])
  const [registering, setRegistering] = useState(false)
  const [creatingSeries, setCreatingSeries] = useState(false)
  const [createdEpisode, setCreatedEpisode] = useState<EpisodeResponse>()
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [publishError, setPublishError] = useState<string>()
  const publishLock = useRef(false)
  const completeHeadingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (createdEpisode !== undefined) completeHeadingRef.current?.focus()
  }, [createdEpisode])
  const selectedAsset = assets.find((asset) => asset.id === draft.assetId)
  const checks = [
    {
      label: '등록할 시리즈',
      done: work !== undefined,
      value: work?.title ?? '선택해 주세요',
    },
    {
      label: '재생 영상',
      done: selectedAsset !== undefined,
      value: selectedAsset?.fileName ?? '준비된 영상을 선택해 주세요',
    },
    {
      label: '영상 제목',
      done: draft.title.trim() !== '',
      value: draft.title.trim() || '제목을 입력해 주세요',
    },
    {
      label: 'AI 제작 표기',
      done: draft.aiDisclosure.trim() !== '',
      value:
        draft.aiDisclosure.trim() !== ''
          ? draft.aiDisclosure.trim().split('\n')[0]
          : '도구를 선택하거나 직접 입력해 주세요',
    },
  ]
  const completeCount = checks.filter((check) => check.done).length
  const useUploadedAsset = async (assetId: string): Promise<void> => {
    const response = await fetch('/api/studio/assets/available', {
      cache: 'no-store',
    })
    if (!response.ok) throw new Error('asset-sync-failed')
    const nextAssets = (await response.json()) as StudioAssetOption[]
    if (!nextAssets.some((asset) => asset.id === assetId))
      throw new Error('uploaded-asset-missing')
    setAssets(nextAssets)
    setPreferredAssetId(assetId)
  }
  async function publishCreatedEpisode(): Promise<void> {
    if (createdEpisode === undefined || publishLock.current) return
    publishLock.current = true
    setPublishing(true)
    setPublishError(undefined)
    try {
      const response = await fetch(
        '/api/episodes/' + encodeURIComponent(createdEpisode.id) + '/publish',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'PUBLISH' }),
        },
      )
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null)
        setPublishError(
          readApiError(payload)?.message ??
            '공개하지 못했습니다. 초안은 저장되어 있으니 다시 시도해 주세요.',
        )
        return
      }
      setPublished(true)
    } catch {
      setPublishError(
        '네트워크 연결을 확인한 뒤 다시 시도해 주세요. 초안은 저장되어 있습니다.',
      )
    } finally {
      publishLock.current = false
      setPublishing(false)
    }
  }
  return (
    <section
      className="studio-registration-layout"
      aria-label="시리즈와 영상 등록"
    >
      <div className="studio-registration-main">
        <div hidden={createdEpisode !== undefined}>
          <section
            id="registration-series"
            className="studio-registration-panel"
            aria-labelledby="registration-series-heading"
          >
            <header className="studio-registration-panel-heading">
              <span>01</span>
              <div>
                <h2 id="registration-series-heading">
                  어떤 시리즈에 등록할까요?
                </h2>
                <p>
                  기존 시리즈를 선택하거나 새 작품의 형식과 이름을 정하세요.
                </p>
              </div>
              {work === undefined ? null : (
                <CheckCircle2 aria-label="시리즈 선택 완료" />
              )}
            </header>
            <fieldset
              className="studio-registration-controls"
              disabled={registering || creatingSeries}
            >
              <WorkStep
                works={workOptions}
                onSelect={setWork}
                selectedId={work?.id}
                onWorkTypeChange={setNewWorkType}
                onBusyChange={setCreatingSeries}
                onChooseNew={() => {
                  setWork(undefined)
                }}
                onCreated={(created) => {
                  setWorkOptions((current) => [
                    {
                      ...created,
                      episodeCount: 0,
                      updatedAt: new Date().toISOString(),
                    },
                    ...current.filter((option) => option.id !== created.id),
                  ])
                  setWork(created)
                }}
              />
            </fieldset>
          </section>
          <section
            id="registration-content"
            className="studio-registration-panel"
            aria-labelledby="registration-content-heading"
          >
            <header className="studio-registration-panel-heading">
              <span>02</span>
              <div>
                <h2 id="registration-content-heading">
                  영상과 정보를 준비해 주세요
                </h2>
                <p>입력 중 시리즈를 바꿔도 작성 내용과 업로드는 유지됩니다.</p>
              </div>
            </header>
            <CreateEpisodeForm
              formId="studio-registration-episode"
              seriesId={work?.id ?? ''}
              workType={work?.workType ?? newWorkType}
              availableAssets={assets}
              hideFooter
              onDraftChange={onDraftChange}
              onBusyChange={setRegistering}
              {...(preferredAssetId === undefined ? {} : { preferredAssetId })}
              mediaTools={
                <details
                  className="studio-registration-upload"
                  open={assets.length === 0}
                >
                  <summary>
                    새 영상 업로드 <span>기존 영상을 선택해도 됩니다</span>
                  </summary>
                  <Uploader context="episode" onReady={useUploadedAsset} />
                </details>
              }
              onCreated={(episode) => {
                setCreatedEpisode(episode)
                setPublished(false)
                setPublishError(undefined)
                setAssets((current) =>
                  current.filter((asset) => asset.id !== episode.assetId),
                )
                setPreferredAssetId(undefined)
              }}
            />
          </section>
        </div>
        {createdEpisode === undefined ? null : (
          <section
            className="studio-registration-complete"
            aria-labelledby="registration-complete-heading"
          >
            <CheckCircle2 aria-hidden="true" />
            <span>{published ? 'PUBLISHED' : 'DRAFT SAVED'}</span>
            <h2
              id="registration-complete-heading"
              ref={completeHeadingRef}
              tabIndex={-1}
            >
              {published
                ? '영상 공개가 완료되었습니다'
                : '초안으로 안전하게 저장했습니다'}
            </h2>
            <strong>{createdEpisode.title}</strong>
            <p>
              {published
                ? '이제 재생 페이지에서 작품을 확인할 수 있습니다.'
                : '등록은 끝났습니다. 내용을 확인한 뒤 지금 공개하거나 시리즈 관리에서 이어서 편집하세요.'}
            </p>
            {publishError === undefined ? null : (
              <p role="alert">{publishError}</p>
            )}
            <div className="studio-registration-actions">
              {published ? (
                <Button asChild>
                  <Link href={'/watch/' + createdEpisode.id}>
                    재생 페이지 열기 <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <Button
                  loading={publishing}
                  onClick={() => {
                    void publishCreatedEpisode()
                  }}
                >
                  지금 공개
                </Button>
              )}
              {work === undefined ? null : (
                <Button asChild variant="secondary">
                  <Link href={'/studio/series/' + work.id}>시리즈 관리로</Link>
                </Button>
              )}
              <Button
                variant="ghost"
                disabled={publishing}
                onClick={() => {
                  setCreatedEpisode(undefined)
                  setPublished(false)
                  setPublishError(undefined)
                }}
              >
                다른 영상 계속 등록
              </Button>
            </div>
          </section>
        )}
      </div>
      <aside
        className="studio-registration-summary"
        aria-labelledby="registration-summary-heading"
      >
        <span className="studio-registration-eyebrow">REGISTRATION</span>
        <h2 id="registration-summary-heading">등록 내용 확인</h2>
        <p>공개 전까지 초안으로 보관됩니다.</p>
        <div className="studio-registration-progress">
          <span>
            {createdEpisode === undefined ? completeCount : 4} / 4 준비 완료
          </span>
          <progress
            max={4}
            value={createdEpisode === undefined ? completeCount : 4}
            aria-label="등록 준비 상태"
          />
        </div>
        <details className="studio-registration-review">
          <summary>선택 내용 상세 보기</summary>
          <ol>
            {checks.map((check) => (
              <li
                key={check.label}
                data-complete={check.done || createdEpisode !== undefined}
              >
                <CheckCircle2 aria-hidden="true" />
                <div>
                  <strong>{check.label}</strong>
                  <span>
                    {createdEpisode === undefined
                      ? check.value
                      : check.label === '영상 제목'
                        ? createdEpisode.title
                        : '확인 완료'}
                  </span>
                </div>
              </li>
            ))}
          </ol>
          {work === undefined ? null : (
            <div className="studio-registration-format">
              <Clapperboard aria-hidden="true" />
              {workTypeLabel(work.workType)}
              <span>
                {(createdEpisode?.ageRating ?? draft.ageRating) === 'ALL'
                  ? '전체 관람가'
                  : (createdEpisode?.ageRating ?? draft.ageRating).slice(1) +
                    '세 이상'}
              </span>
            </div>
          )}
        </details>
        {createdEpisode === undefined ? (
          <>
            <div className="studio-registration-submit-bar">
              <span>{completeCount} / 4 준비 완료</span>
              <Button
                form="studio-registration-episode"
                type="submit"
                disabled={completeCount < 4 || registering || creatingSeries}
                loading={registering}
                fullWidth
              >
                초안으로 등록 <ArrowRight aria-hidden="true" />
              </Button>
            </div>
            <p className="studio-registration-help">
              시리즈 생성과 영상 등록은 별도로 저장됩니다. 등록 버튼을 눌러도
              바로 공개되지 않습니다.
            </p>
          </>
        ) : (
          <p role="status" className="studio-registration-saved">
            <CheckCircle2 aria-hidden="true" />
            {published ? '공개 완료' : '초안 저장 완료'}
          </p>
        )}
      </aside>
    </section>
  )
}
