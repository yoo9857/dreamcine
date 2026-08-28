'use client'

import type { WorkType } from '@aidream/core'
import { Film, ImagePlus, LoaderCircle } from 'lucide-react'
import React, {
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('invalid image'))
    }
    image.src = url
  })
}

async function cropPoster(file: File, vertical: boolean): Promise<string> {
  const image = await loadImage(file)
  const width = vertical ? 1080 : 1600
  const height = vertical ? 1920 : 900
  const targetRatio = width / height
  const sourceRatio = image.naturalWidth / image.naturalHeight
  const sourceWidth =
    sourceRatio > targetRatio
      ? image.naturalHeight * targetRatio
      : image.naturalWidth
  const sourceHeight =
    sourceRatio > targetRatio
      ? image.naturalHeight
      : image.naturalWidth / targetRatio
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (context === null) throw new Error('canvas unavailable')
  context.drawImage(
    image,
    (image.naturalWidth - sourceWidth) / 2,
    (image.naturalHeight - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
  )
  return canvas.toDataURL('image/webp', 0.86)
}

export function SeriesPosterUploader({
  seriesId,
  workType,
  posterUrl,
}: {
  readonly seriesId: string
  readonly workType: WorkType
  readonly posterUrl?: string
}): ReactNode {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState(posterUrl)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const vertical = workType === 'SHORT_FORM'

  async function change(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0]
    if (file === undefined) return
    setBusy(true)
    setError('')
    try {
      const image = await cropPoster(file, vertical)
      setPreview(image)
      const response = await fetch(`/api/series/${seriesId}/poster`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image }),
      })
      if (!response.ok) throw new Error('upload failed')
      const result = (await response.json()) as { posterUrl?: string }
      if (result.posterUrl !== undefined) setPreview(result.posterUrl)
    } catch {
      setPreview(posterUrl)
      setError(
        '썸네일을 저장하지 못했습니다. JPG, PNG 또는 WebP 파일을 확인해 주세요.',
      )
    } finally {
      setBusy(false)
      event.currentTarget.value = ''
    }
  }

  return (
    <div
      className={
        vertical
          ? 'studio-series-cover is-vertical'
          : 'studio-series-cover is-horizontal'
      }
    >
      {preview === undefined ? (
        <Film aria-hidden="true" />
      ) : (
        <img src={preview} alt="작품 썸네일" />
      )}
      <input
        ref={inputRef}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp"
        aria-label="작품 썸네일 선택"
        onChange={(event) => void change(event)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <LoaderCircle aria-hidden="true" />
        ) : (
          <ImagePlus aria-hidden="true" />
        )}
        <span>{busy ? '저장 중' : '썸네일 변경'}</span>
      </button>
      <small>{vertical ? '숏폼 · 9:16' : '롱폼 · 16:9'}</small>
      {error === '' ? null : <p role="alert">{error}</p>}
    </div>
  )
}
