'use client'

import { Button, Dialog, Select, Textarea } from '@aidream/ui'
import React, { useState, type ReactNode } from 'react'

export interface ReportDialogProps {
  target: 'EPISODE' | 'SERIES' | 'COMMENT' | 'USER'
  targetId: string
  trigger: ReactNode
}

export function ReportDialog(_props: ReportDialogProps): ReactNode {
  const { target, targetId, trigger } = _props
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)

  async function submit(): Promise<void> {
    if (reason === '') {
      setError('신고 사유를 선택해 주세요.')
      return
    }
    setSubmitting(true)
    setError(undefined)
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          targetId,
          reason,
          ...(detail.trim() === '' ? {} : { detail: detail.trim() }),
        }),
      })
      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } }
        throw new Error(body.error?.message ?? '신고를 접수하지 못했습니다.')
      }
      setOpen(false)
      setReason('')
      setDetail('')
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : '신고를 접수하지 못했습니다.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
      >
        {trigger}
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="콘텐츠 신고"
        description="운영 정책을 위반한 사유를 알려주세요."
        footer={
          <Button
            disabled={submitting}
            onClick={() => {
              void submit()
            }}
          >
            {submitting ? '접수 중…' : '신고 접수'}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Select
            label="신고 사유"
            value={reason}
            onValueChange={(value) => {
              setReason(value)
            }}
            {...(error === undefined ? {} : { error })}
            options={[
              { value: 'SEXUAL', label: '성적 콘텐츠' },
              { value: 'VIOLENCE', label: '폭력' },
              { value: 'HATE', label: '혐오 표현' },
              { value: 'SPAM', label: '스팸' },
              { value: 'COPYRIGHT', label: '저작권 침해' },
              { value: 'MINOR_SAFETY', label: '아동 안전' },
              { value: 'OTHER', label: '기타' },
            ]}
          />
          <Textarea
            label="상세 설명"
            value={detail}
            onChange={(event) => {
              setDetail(event.target.value)
            }}
            maxLength={1000}
            showCount
          />
        </div>
      </Dialog>
    </>
  )
}
