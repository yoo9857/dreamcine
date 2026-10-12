'use client'

import type { EpisodeResponse, SeriesResponse, WorkType } from '@aidream/core'
import { Button } from '@aidream/ui'
import {
  ArrowRight,
  CheckCircle2,
  ArrowLeft,
  ArrowDown,
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
 * 단계별로 넓은 입력 공간을 제공하고 이전 단계의 DOM과 업로더를 유지한다.
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
  onModeChange,
}: {
  readonly works: readonly WorkOption[]
  readonly onSelect: (work: SelectedWork) => void
  readonly onCreated: (work: SelectedWork) => void
  readonly selectedId: string | undefined
  readonly onWorkTypeChange: (workType: WorkType) => void
  readonly onChooseNew: () => void
  readonly onBusyChange: (busy: boolean) => void
  readonly onModeChange: (mode: 'EXISTING' | 'NEW') => void
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
                onModeChange('EXISTING')
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
                onModeChange('NEW')
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
          formId="studio-registration-series"
          hideSubmit
          onWorkTypeChange={onWorkTypeChange}
          onBusyChange={onBusyChange}
          onCreated={(series) => {
            onCreated({
              id: series.id,
              title: series.title,
              workType: series.workType,
            })
            setMode('EXISTING')
            onModeChange('EXISTING')
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
  const rootRef = useRef<HTMLElement>(null)
  const [mode, setMode] = useState<'EXISTING' | 'NEW'>(
    works.length === 0 ? 'NEW' : 'EXISTING',
  )
  const [notice, setNotice] = useState<{ message: string; selector: string }>()
  const guide = (
    nextStep: 1 | 2 | 3,
    selector: string,
    message: string,
  ): void => {
    setStep(nextStep)
    setNotice({ selector, message })
  }
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const stepHeadingRef = useRef<HTMLHeadingElement>(null)
  const previousStep = useRef(step)
  useEffect(() => {
    if (previousStep.current === step) return
    previousStep.current = step
    stepHeadingRef.current?.focus({ preventScroll: true })
    stepHeadingRef.current?.scrollIntoView({ block: 'start' })
  }, [step])
  useEffect(() => {
    if (notice === undefined) return
    const target = rootRef.current?.querySelector<HTMLElement>(notice.selector)
    target?.scrollIntoView({ block: 'center' })
    target?.focus({ preventScroll: true })
  }, [notice])
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
    setNotice(undefined)
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
  const canRegister =
    work !== undefined &&
    selectedAsset !== undefined &&
    draft.title.trim() !== '' &&
    draft.aiDisclosure.trim() !== ''
  const locked = registering || creatingSeries
  const titleReady = draft.title.trim() !== ''
  const aiReady = draft.aiDisclosure.trim() !== ''
  const guideWork = (): void => {
    guide(
      1,
      mode === 'NEW'
        ? '#studio-registration-series input[name="title"]'
        : '.studio-work-picker button',
      mode === 'NEW'
        ? '새 작품의 제목을 입력한 뒤 하단의 만들고 다음 버튼을 눌러주세요.'
        : '목록에서 등록할 작품을 하나 선택해 주세요. 새 작품이라면 새 시리즈 만들기를 선택하세요.',
    )
  }
  const guideMedia = (): void => {
    const upload = rootRef.current?.querySelector<HTMLDetailsElement>(
      '.studio-registration-upload',
    )
    if (assets.length === 0 && upload !== null && upload !== undefined)
      upload.open = true
    guide(
      2,
      assets.length === 0
        ? '.studio-registration-upload summary'
        : '.studio-asset-choice input',
      assets.length === 0
        ? '새 영상 업로드를 열었습니다. 파일을 올리고 변환이 끝나면 영상을 선택해 주세요.'
        : '사용할 영상 왼쪽의 선택 버튼을 눌러주세요.',
    )
  }
  const navigate = (nextStep: 1 | 2 | 3): void => {
    if (nextStep > 1 && work === undefined) {
      guideWork()
      return
    }
    if (nextStep === 3 && selectedAsset === undefined) {
      guideMedia()
      return
    }
    setNotice(undefined)
    setStep(nextStep)
  }
  const guideDetails = (): void => {
    guide(
      3,
      !titleReady
        ? '#studio-registration-episode input[name="title"]'
        : '.studio-ai-tool-options button',
      !titleReady
        ? '영상 제목을 입력해 주세요. 아래의 AI 도구 선택까지 마치면 등록할 수 있습니다.'
        : '사용한 AI 도구를 선택하거나 목록에 없는 도구를 직접 입력해 주세요.',
    )
  }
  const actionHint =
    step === 1
      ? mode === 'NEW'
        ? '형식과 제목 입력 → 만들고 다음'
        : work === undefined
          ? '작품 하나를 선택하면 다음으로 진행합니다'
          : '작품 선택 완료 · 다음은 영상 준비'
      : step === 2
        ? selectedAsset === undefined
          ? assets.length === 0
            ? '업로드 → 변환 완료 → 영상 선택'
            : '아래 준비된 영상 중 하나를 선택하세요'
          : '영상 선택 완료 · 다음은 제목과 AI 도구 입력'
        : !titleReady
          ? aiReady
            ? '남은 필수 입력: 영상 제목'
            : '남은 필수 입력: 영상 제목 · AI 도구'
          : !aiReady
            ? '남은 필수 입력: AI 도구 선택 또는 직접 입력'
            : '필수 입력 완료 · 초안 저장 후 공개할 수 있습니다'
  const steps = [
    {
      title: '작품 선택',
      description: '어디에 담을까요?',
      heading: '어떤 작품에 등록할까요?',
      hint: '기존 시리즈를 선택하거나 새 작품의 형식과 이름을 정하세요.',
    },
    {
      title: '영상 준비',
      description: '영상을 연결해요',
      heading: '이야기를 담은 영상을 준비하세요',
      hint: '새 영상을 업로드하거나 변환이 완료된 영상을 선택하세요.',
    },
    {
      title: '정보 입력',
      description: '마지막으로 다듬어요',
      heading: '작품을 소개해 주세요',
      hint: '제목과 사용한 AI 도구를 알려주세요. 저장 후 공개할 수 있습니다.',
    },
  ] as const
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
      ref={rootRef}
      className="studio-registration-layout studio-wizard"
      aria-label="시리즈와 영상 등록"
    >
      {createdEpisode === undefined ? (
        <>
          <nav className="studio-wizard-steps" aria-label="시리즈 등록 단계">
            <ol>
              {steps.map((item, index) => {
                const number = (index + 1) as 1 | 2 | 3
                const done =
                  number === 1
                    ? work !== undefined
                    : number === 2
                      ? selectedAsset !== undefined
                      : false
                return (
                  <li key={item.title}>
                    <button
                      type="button"
                      aria-label={`${String(number)}. ${item.title}`}
                      aria-current={step === number ? 'step' : undefined}
                      disabled={locked}
                      onClick={() => {
                        navigate(number)
                      }}
                    >
                      <span className="studio-wizard-step-number">
                        {done && step !== number ? (
                          <CheckCircle2 aria-hidden="true" />
                        ) : (
                          number
                        )}
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.description}</small>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>
          <header className="studio-wizard-heading">
            <span>STEP 0{step} / 03</span>
            <h2 ref={stepHeadingRef} tabIndex={-1}>
              {steps[step - 1]?.heading}
            </h2>
            <p>{steps[step - 1]?.hint}</p>
            <p
              className="studio-wizard-action-hint"
              id="studio-wizard-action-hint"
              role="status"
            >
              {notice?.message ?? actionHint}
            </p>
          </header>
          {step === 1 || work === undefined ? null : (
            <div className="studio-wizard-context">
              <span>{workTypeLabel(work.workType)}</span>
              <strong title={work.title}>{work.title}</strong>
              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  setStep(1)
                }}
              >
                변경
              </button>
              {step !== 3 || selectedAsset === undefined ? null : (
                <>
                  <span>영상</span>
                  <strong title={selectedAsset.fileName}>
                    {selectedAsset.fileName}
                  </strong>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      setStep(2)
                    }}
                  >
                    변경
                  </button>
                </>
              )}
            </div>
          )}
        </>
      ) : null}
      <div className="studio-registration-main">
        <div hidden={createdEpisode !== undefined}>
          <section
            hidden={step !== 1}
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
                onModeChange={(nextMode) => {
                  setMode(nextMode)
                  setNotice(undefined)
                }}
                onSelect={(nextWork) => {
                  setWork(nextWork)
                  setNotice(undefined)
                }}
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
                  setStep(2)
                }}
              />
            </fieldset>
          </section>
          {step !== 3 ? null : (
            <div className="studio-wizard-required" aria-label="필수 입력 항목">
              <button
                type="button"
                aria-label="영상 제목 입력으로 이동"
                disabled={locked}
                onClick={() => {
                  guide(
                    3,
                    '#studio-registration-episode input[name="title"]',
                    '목록에 표시할 영상 제목을 입력하세요.',
                  )
                }}
                data-complete={titleReady}
              >
                <span>1</span>
                <strong>영상 제목</strong>
                <small>
                  {titleReady ? '입력 완료' : '입력 필요'}{' '}
                  <ArrowDown aria-hidden="true" />
                </small>
              </button>
              <button
                type="button"
                aria-label="AI 도구 선택으로 이동"
                disabled={locked}
                onClick={() => {
                  guide(
                    3,
                    '.studio-ai-tool-options button',
                    '사용한 AI 도구를 선택하거나 아래에 직접 입력하세요.',
                  )
                }}
                data-complete={aiReady}
              >
                <span>2</span>
                <strong>AI 도구</strong>
                <small>
                  {aiReady ? '입력 완료' : '아래에서 선택'}{' '}
                  <ArrowDown aria-hidden="true" />
                </small>
              </button>
            </div>
          )}
          <section
            hidden={step === 1}
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
              activeSection={step === 2 ? 'media' : 'details'}
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
                type="button"
                variant="ghost"
                disabled={publishing}
                onClick={() => {
                  setCreatedEpisode(undefined)
                  setStep(2)
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
      {createdEpisode === undefined ? (
        <footer className="studio-wizard-footer">
          <div className="studio-wizard-footer-note" aria-live="polite">
            <strong>{actionHint}</strong>
          </div>
          <div className="studio-wizard-footer-actions">
            {step === 1 ? null : (
              <Button
                key="previous"
                type="button"
                variant="ghost"
                disabled={locked}
                onClick={() => {
                  navigate(step === 3 ? 2 : 1)
                }}
              >
                <ArrowLeft aria-hidden="true" /> 이전
              </Button>
            )}
            {step === 1 && mode === 'NEW' ? (
              <Button
                key="create-series"
                form="studio-registration-series"
                type="submit"
                disabled={locked}
                loading={creatingSeries}
              >
                만들고 다음 <ArrowRight aria-hidden="true" />
              </Button>
            ) : step === 3 && canRegister ? (
              <Button
                key="register"
                form="studio-registration-episode"
                type="submit"
                disabled={locked}
                loading={registering}
              >
                초안으로 등록 <ArrowRight aria-hidden="true" />
              </Button>
            ) : (
              <Button
                key="continue"
                type="button"
                disabled={locked}
                onClick={(event) => {
                  event.preventDefault()
                  if (step === 1 && work === undefined) {
                    guideWork()
                    return
                  }
                  if (step === 2 && selectedAsset === undefined) {
                    guideMedia()
                    return
                  }
                  if (step === 3) {
                    guideDetails()
                    return
                  }
                  navigate(step === 1 ? 2 : 3)
                }}
              >
                {step === 1
                  ? work === undefined
                    ? '작품 선택하기'
                    : '다음 · 영상 준비'
                  : step === 2
                    ? selectedAsset === undefined
                      ? assets.length === 0
                        ? '영상 업로드하기'
                        : '영상 선택하기'
                      : '다음 · 정보 입력'
                    : !titleReady
                      ? '제목 입력하기'
                      : 'AI 도구 선택하기'}{' '}
                <ArrowRight aria-hidden="true" />
              </Button>
            )}
          </div>
        </footer>
      ) : null}
    </section>
  )
}
