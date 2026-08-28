'use client'

import type { EpisodeResponse, WorkType } from '@aidream/core'
import { Button, Input, Textarea } from '@aidream/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, {
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
  type SyntheticEvent,
} from 'react'

import type { StudioAssetOption } from '@/src/services/studio/get-studio-dashboard'

import { AiDisclosureField } from './AiDisclosureField'

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '길이 확인 중'
  const minutes = Math.floor(seconds / 60)
  const remainder = String(seconds % 60).padStart(2, '0')
  return `${String(minutes)}:${remainder}`
}

function previewFrameStyles(
  asset: StudioAssetOption,
): readonly CSSProperties[] {
  if (asset.durationSec === null) return []
  const count = Math.max(1, Math.ceil(asset.durationSec / 10))
  const columns = Math.min(10, count)
  const rows = Math.ceil(count / columns)
  const samples = Math.min(5, count)
  return Array.from({ length: samples }, (_, sample) => {
    const index = Math.min(count - 1, Math.floor((sample * count) / samples))
    const column = index % columns
    const row = Math.floor(index / columns)
    return {
      backgroundImage: `url("${asset.spriteUrl}")`,
      backgroundSize: `${String(columns * 100)}% ${String(rows * 100)}%`,
      backgroundPosition: `${columns === 1 ? '0' : String((column / (columns - 1)) * 100)}% ${rows === 1 ? '0' : String((row / (rows - 1)) * 100)}%`,
    }
  })
}

export function CreateEpisodeForm({
  availableAssets = [],
  onCreated,
  preferredAssetId,
  seriesId,
  workType = 'SERIES',
}: {
  readonly availableAssets?: readonly StudioAssetOption[]
  readonly onCreated?: (episode: EpisodeResponse) => void
  readonly preferredAssetId?: string
  readonly seriesId: string
  readonly workType?: WorkType
}): ReactNode {
  const router = useRouter()
  const [aiDisclosure, setAiDisclosure] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState(preferredAssetId ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const episodic = workType === 'SERIES'
  const shortForm = workType === 'SHORT_FORM'
  const selectedAsset = availableAssets.find(
    (asset) => asset.id === selectedAssetId,
  )
  const frames = useMemo(
    () =>
      selectedAsset === undefined ? [] : previewFrameStyles(selectedAsset),
    [selectedAsset],
  )

  const submit = async (
    event: SyntheticEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault()
    if (aiDisclosure.trim() === '') {
      setError('AI 제작 표기를 입력해 주세요.')
      return
    }
    setBusy(true)
    setError(null)
    const form = event.currentTarget
    const data = new FormData(form)
    const description = data.get('description')
    const tagsValue = data.get('tags')
    const response = await fetch('/api/episodes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        seriesId,
        seasonNumber: Number(data.get('seasonNumber')),
        number: Number(data.get('number')),
        title: data.get('title'),
        ...(typeof description === 'string' && description !== ''
          ? { description }
          : {}),
        assetId: data.get('assetId'),
        ageRating: data.get('ageRating'),
        aiDisclosure,
        tags: (typeof tagsValue === 'string' ? tagsValue : '')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      }),
    })
    if (!response.ok) {
      setError(
        '콘텐츠를 만들지 못했습니다. 영상 연결과 회차 정보를 확인해 주세요.',
      )
      setBusy(false)
      return
    }
    const episode = (await response.json()) as EpisodeResponse
    form.reset()
    setSelectedAssetId('')
    setAiDisclosure('')
    setBusy(false)
    router.refresh()
    onCreated?.(episode)
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="studio-episode-form"
    >
      <div className="studio-episode-form-main">
        <section className="studio-episode-form-section">
          <header className="studio-episode-form-heading">
            <span>01</span>
            <div>
              <h3>{episodic ? '회차 정보' : '영상 정보'}</h3>
              <p>목록에서 바로 구분할 수 있는 위치와 제목을 정합니다.</p>
            </div>
          </header>
          <div className="studio-episode-identity-grid">
            <div className="studio-episode-position-fields">
              {episodic ? (
                <Input
                  label="시즌"
                  name="seasonNumber"
                  type="number"
                  min={1}
                  defaultValue={1}
                  required
                />
              ) : (
                <input type="hidden" name="seasonNumber" value="1" />
              )}
              <Input
                label={episodic ? '회차' : '영상 순서'}
                name="number"
                type="number"
                min={1}
                defaultValue={1}
                required
              />
            </div>
            <Input
              label={episodic ? '회차 제목' : '영상 제목'}
              name="title"
              required
              maxLength={160}
              placeholder={episodic ? '예: 첫 번째 여정' : '예: 메인 필름'}
            />
            <Textarea
              label="설명"
              name="description"
              maxLength={2000}
              placeholder="내용을 짧고 명확하게 소개해 주세요."
            />
          </div>
        </section>

        <section className="studio-episode-form-section">
          <header className="studio-episode-form-heading">
            <span>02</span>
            <div>
              <h3>분류와 공개 정보</h3>
              <p>검색과 관람 안내에 사용되는 정보입니다.</p>
            </div>
          </header>
          <div className="studio-episode-meta-grid">
            <Input
              label="태그"
              name="tags"
              placeholder="예: 판타지, 모험, 독립영화"
              hint="쉼표로 구분하며 최대 10개까지 입력할 수 있습니다."
            />
            <label className="studio-field-label">
              <span>관람 등급</span>
              <select name="ageRating" defaultValue="ALL">
                <option value="ALL">전체 관람가</option>
                <option value="A12">12세 이상</option>
                <option value="A15">15세 이상</option>
                <option value="A19">19세 이상</option>
              </select>
            </label>
            <div className="studio-episode-ai-field">
              <AiDisclosureField
                value={aiDisclosure}
                onChange={setAiDisclosure}
                {...(error === null ? {} : { error })}
              />
            </div>
          </div>
        </section>
      </div>

      <aside className="studio-episode-media-workspace">
        <header className="studio-episode-form-heading">
          <span>03</span>
          <div>
            <h3>재생 영상</h3>
            <p>{shortForm ? '세로형' : '가로형'} 썸네일 기준으로 확인합니다.</p>
          </div>
        </header>
        {availableAssets.length === 0 ? (
          <div className="studio-asset-picker-empty">
            <strong>연결할 준비 완료 영상이 없습니다</strong>
            <p>업로드와 변환이 끝나면 이곳에서 바로 선택할 수 있습니다.</p>
            <Link href="/studio/upload">영상 업로드</Link>
          </div>
        ) : (
          <div
            className="studio-asset-choice-list"
            role="radiogroup"
            aria-label="업로드 완료 영상"
          >
            {availableAssets.map((asset) => (
              <label key={asset.id} className="studio-asset-choice">
                <input
                  type="radio"
                  name="assetId"
                  value={asset.id}
                  required
                  checked={selectedAssetId === asset.id}
                  onChange={() => {
                    setSelectedAssetId(asset.id)
                  }}
                />
                <span
                  className={shortForm ? 'is-vertical' : 'is-horizontal'}
                  aria-hidden="true"
                >
                  <img
                    src={
                      shortForm
                        ? (asset.posterUrl ?? asset.thumbnailUrl)
                        : asset.thumbnailUrl
                    }
                    alt=""
                  />
                </span>
                <span>
                  <strong>{asset.fileName}</strong>
                  <small>{formatDuration(asset.durationSec)} · 변환 완료</small>
                </span>
              </label>
            ))}
          </div>
        )}
        {selectedAsset === undefined ? (
          <p className="studio-asset-choice-hint">
            영상을 선택하면 자동 추출한 장면을 미리 볼 수 있습니다.
          </p>
        ) : (
          <div className="studio-frame-preview">
            <div>
              <strong>장면 미리보기</strong>
              <small>영상 전체에서 일정 간격으로 추출</small>
            </div>
            <div className="studio-frame-strip">
              {frames.map((style, index) => (
                <span key={index} style={style} aria-hidden="true" />
              ))}
            </div>
          </div>
        )}
      </aside>

      <footer className="studio-episode-form-footer">
        <p>
          추가 후 콘텐츠 목록에서 공개 상태와 세부 정보를 수정할 수 있습니다.
        </p>
        <Button type="submit" disabled={busy || availableAssets.length === 0}>
          {busy ? '추가 중…' : episodic ? '회차 추가' : '영상 추가'}
        </Button>
      </footer>
    </form>
  )
}
