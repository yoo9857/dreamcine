'use client'

import { Check, LoaderCircle } from 'lucide-react'
import Link from 'next/link'
import React, { useState, type ReactNode } from 'react'

interface ConsentPreferencesProps {
  readonly initialMarketing: boolean
  readonly termsVersion: string
  readonly privacyVersion: string
}

export function ConsentPreferences(props: ConsentPreferencesProps): ReactNode {
  const [marketing, setMarketing] = useState(props.initialMarketing)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function update(next: boolean): Promise<void> {
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/account/consents', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ marketing: next }),
      })
      if (!response.ok) throw new Error('동의 상태를 저장하지 못했습니다.')
      setMarketing(next)
      setMessage(
        next
          ? '마케팅 이메일 수신에 동의했습니다.'
          : '마케팅 이메일 수신 동의를 철회했습니다.',
      )
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="account-consent-card">
      <div className="account-consent-row">
        <div>
          <strong>이용약관 · 개인정보 처리방침</strong>
          <p>
            필수 동의 · 약관 {props.termsVersion} / 개인정보{' '}
            {props.privacyVersion}
          </p>
          <p>
            <Link href="/terms">이용약관</Link> ·{' '}
            <Link href="/privacy">개인정보 처리방침</Link>
          </p>
        </div>
        <span className="account-consent-active">
          <Check aria-hidden="true" /> 동의 중
        </span>
      </div>
      <div className="account-consent-row">
        <div>
          <strong>마케팅 이메일</strong>
          <p>신작, 이벤트, 서비스 소식을 이메일로 받습니다.</p>
        </div>
        <button
          type="button"
          disabled={saving}
          aria-pressed={marketing}
          onClick={() => void update(!marketing)}
        >
          {saving ? <LoaderCircle className="is-spinning" /> : null}
          {marketing ? '수신 동의 철회' : '수신 동의'}
        </button>
      </div>
      <p className="account-consent-status" role="status">
        {message}
      </p>
      <div className="account-consent-withdrawal">
        <strong>필수 동의를 철회하려면</strong>
        <p>
          이용약관과 개인정보 처리 동의 철회에는 서비스 계약 종료와 계정 삭제가
          필요합니다. privacy@ilog.kr에서 철회·삭제 요청을 접수할 수 있습니다.
        </p>
        <a href="mailto:privacy@ilog.kr?subject=ilog%20필수%20동의%20철회%20및%20계정%20삭제">
          철회 요청하기 ↗
        </a>
      </div>
    </div>
  )
}
