'use client'

import type { SeriesResponse } from '@aidream/core'
import { Button, Input, Textarea } from '@aidream/ui'
import { Check, Save, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useState, type ReactNode, type SyntheticEvent } from 'react'

export function EditSeriesForm({
  series,
}: {
  readonly series: SeriesResponse
}): ReactNode {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    const data = new FormData(event.currentTarget)
    const response = await fetch(`/api/series/${series.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: data.get('title'),
        synopsis: data.get('synopsis'),
        ageRating: data.get('ageRating'),
        isCompleted: data.get('isCompleted') === 'on',
        commentsOff: data.get('commentsOff') === 'on',
      }),
    })
    setSaving(false)
    if (!response.ok) {
      setError('작품 정보를 저장하지 못했습니다. 입력 내용을 확인해 주세요.')
      return
    }
    setMessage('작품 정보가 저장되었습니다.')
    router.refresh()
  }

  async function remove(): Promise<void> {
    if (
      !window.confirm(
        `“${series.title}” 시리즈를 삭제할까요? 시리즈와 에피소드가 서비스에서 숨겨집니다.`,
      )
    )
      return
    setDeleting(true)
    setError('')
    const response = await fetch(`/api/series/${series.id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      setDeleting(false)
      setError('시리즈를 삭제하지 못했습니다.')
      return
    }
    router.push('/studio')
    router.refresh()
  }

  return (
    <form
      className="studio-edit-series-form"
      onSubmit={(event) => void submit(event)}
    >
      <div className="studio-edit-fields">
        <Input
          label="시리즈 제목"
          name="title"
          defaultValue={series.title}
          required
          maxLength={120}
        />
        <Textarea
          label="작품 소개"
          name="synopsis"
          defaultValue={series.synopsis ?? ''}
          maxLength={2000}
        />
        <label className="studio-field-label">
          <span>관람 등급</span>
          <select name="ageRating" defaultValue={series.ageRating}>
            <option value="ALL">전체 관람가</option>
            <option value="A12">12세 이상</option>
            <option value="A15">15세 이상</option>
            <option value="A19">19세 이상</option>
          </select>
        </label>
        <div className="studio-series-toggles">
          <label>
            <input
              type="checkbox"
              name="isCompleted"
              defaultChecked={series.isCompleted}
            />
            <span>
              <strong>완결 작품</strong>
              <small>작품이 완결되었음을 공개 페이지에 표시합니다.</small>
            </span>
          </label>
          <label>
            <input
              type="checkbox"
              name="commentsOff"
              defaultChecked={series.commentsOff}
            />
            <span>
              <strong>댓글 사용 중지</strong>
              <small>이 시리즈의 에피소드에서 새 댓글 작성을 막습니다.</small>
            </span>
          </label>
        </div>
      </div>
      <div className="studio-edit-footer">
        <div>
          {error === '' ? null : <p role="alert">{error}</p>}
          {message === '' ? null : (
            <p role="status">
              <Check aria-hidden="true" /> {message}
            </p>
          )}
        </div>
        <div>
          <Button
            type="button"
            variant="danger"
            disabled={deleting || saving}
            onClick={() => void remove()}
          >
            <Trash2 aria-hidden="true" />
            {deleting ? '삭제 중…' : '시리즈 삭제'}
          </Button>
          <Button type="submit" disabled={saving || deleting}>
            <Save aria-hidden="true" />
            {saving ? '저장 중…' : '변경사항 저장'}
          </Button>
        </div>
      </div>
    </form>
  )
}
