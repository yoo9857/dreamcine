'use client'

import { useState, type ReactNode } from 'react'

export function MarketingUnsubscribeForm({
  token,
}: {
  readonly token: string
}): ReactNode {
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>(
    'idle',
  )

  async function unsubscribe(): Promise<void> {
    setState('saving')
    try {
      const response = await fetch(
        `/api/marketing/unsubscribe?token=${encodeURIComponent(token)}`,
        { method: 'POST' },
      )
      setState(response.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  return (
    <section>
      <h1>마케팅 이메일 수신거부</h1>
      {state === 'done' ? (
        <p>수신 동의를 철회했습니다. 앞으로 마케팅 이메일을 보내지 않습니다.</p>
      ) : (
        <>
          <p>신작, 이벤트 및 서비스 소식 이메일 수신을 중단합니다.</p>
          <button
            type="button"
            disabled={state === 'saving' || token === ''}
            onClick={() => void unsubscribe()}
          >
            {state === 'saving' ? '처리 중…' : '수신거부 확인'}
          </button>
          {state === 'error' || token === '' ? (
            <p role="alert">링크가 만료되었거나 처리할 수 없습니다.</p>
          ) : null}
        </>
      )}
    </section>
  )
}
