'use client'

import { SeriesResponseSchema, type WorkType } from '@aidream/core'
import { Button, Input, Textarea } from '@aidream/ui'
import { ChevronDown, Clapperboard } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, {
  useRef,
  useId,
  useEffect,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from 'react'

import { WORK_TYPE_OPTIONS } from './work-types'
import { readApiError } from '@/src/lib/error-messages'

/** 식별자는 검증하고 기존 최소 응답의 제목·형식은 제출 값으로 보완한다. */
const createdSeriesSchema = SeriesResponseSchema.pick({
  id: true,
  title: true,
  workType: true,
}).partial({ title: true, workType: true })

export function CreateSeriesForm({
  onCreated,
  submitLabel = '시리즈 만들기',
  onWorkTypeChange,
  onBusyChange,
  formId,
  hideSubmit = false,
}: {
  /**
   * 시리즈를 만든 뒤 이동 대신 호출할 콜백. 단일 페이지 편집기를 유지한다.
   */
  readonly onCreated?: (series: {
    id: string
    title: string
    workType: WorkType
  }) => void
  readonly submitLabel?: string
  readonly onWorkTypeChange?: (workType: WorkType) => void
  readonly onBusyChange?: (busy: boolean) => void
  readonly formId?: string
  readonly hideSubmit?: boolean
} = {}): ReactNode {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const [workType, setWorkType] = useState<WorkType>('SERIES')
  const formatHintId = useId()
  const errorRef = useRef<HTMLParagraphElement>(null)
  const selectedFormat = WORK_TYPE_OPTIONS.find(
    (option) => option.value === workType,
  )
  useEffect(() => {
    if (error !== null) errorRef.current?.focus()
  }, [error])

  const submit = async (
    event: SyntheticEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault()
    if (submitting.current) return
    const form = event.currentTarget
    const data = new FormData(form)
    const submittedTitle = data.get('title')
    const title =
      typeof submittedTitle === 'string' ? submittedTitle.trim() : ''
    if (title === '') {
      setError('시리즈 제목을 입력해 주세요. 공백만으로는 만들 수 없습니다.')
      return
    }
    submitting.current = true
    setBusy(true)
    onBusyChange?.(true)
    setError(null)
    const synopsis = data.get('synopsis')
    try {
      const response = await fetch('/api/series', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          workType,
          ...(typeof synopsis === 'string' && synopsis !== ''
            ? { synopsis }
            : {}),
          ageRating: data.get('ageRating'),
        }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        setError(
          readApiError(payload)?.message ??
            '시리즈를 만들지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.',
        )
        return
      }
      const parsed = createdSeriesSchema.safeParse(payload)
      if (!parsed.success) {
        setError(
          '등록 결과를 확인하지 못했습니다. 입력은 유지됩니다. 콘텐츠 목록에서 저장 여부를 확인해 주세요.',
        )
        return
      }
      const series = parsed.data
      if (onCreated !== undefined) {
        onCreated({
          id: series.id,
          title: series.title ?? title,
          workType: series.workType ?? workType,
        })
        form.reset()
        setWorkType('SERIES')
        onWorkTypeChange?.('SERIES')
        return
      }
      router.push(`/studio/series/${series.id}`)
      router.refresh()
    } catch {
      setError(
        '네트워크 연결을 확인해 주세요. 입력은 유지됩니다. 콘텐츠 목록에서 저장 여부를 확인한 뒤 다시 시도해 주세요.',
      )
    } finally {
      setBusy(false)
      submitting.current = false
      onBusyChange?.(false)
    }
  }

  return (
    <form
      id={formId}
      onSubmit={(event) => void submit(event)}
      className="studio-series-form"
      aria-busy={busy}
    >
      <div className="studio-series-primary">
        <div className="studio-format-field">
          <label className="studio-field-label">
            <span>시리즈 형식</span>
            <span className="studio-format-select">
              <Clapperboard aria-hidden="true" />
              <select
                name="workType"
                value={workType}
                disabled={busy}
                aria-describedby={formatHintId}
                onChange={(event) => {
                  const option = WORK_TYPE_OPTIONS.find(
                    (item) => item.value === event.target.value,
                  )
                  if (option === undefined) return
                  setWorkType(option.value)
                  onWorkTypeChange?.(option.value)
                }}
              >
                {WORK_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" />
            </span>
          </label>
          <p id={formatHintId} className="studio-format-hint">
            {selectedFormat?.description}
          </p>
        </div>
        <Input
          label="시리즈 제목"
          name="title"
          required
          maxLength={120}
          disabled={busy}
        />
      </div>
      <details className="studio-series-options">
        <summary>
          소개·기본 관람 등급 <span>선택 사항</span>
        </summary>
        <Textarea
          label="시리즈 소개"
          name="synopsis"
          maxLength={2000}
          disabled={busy}
        />
        <label className="studio-field-label">
          관람 등급
          <select
            name="ageRating"
            defaultValue="ALL"
            disabled={busy}
            className="h-10 rounded-md border border-border bg-bg-elevated px-3 text-fg"
          >
            <option value="ALL">전체 관람가</option>
            <option value="A12">12세 이상</option>
            <option value="A15">15세 이상</option>
            <option value="A19">19세 이상</option>
          </select>
        </label>
      </details>
      {error === null ? null : (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="studio-registration-error"
        >
          {error}
        </p>
      )}
      {hideSubmit ? null : (
        <Button type="submit" disabled={busy}>
          {busy ? '만드는 중…' : submitLabel}
        </Button>
      )}
    </form>
  )
}
