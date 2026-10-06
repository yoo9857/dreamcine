'use client'

import { Check, Share2 } from 'lucide-react'
import React, { useState, type ReactNode } from 'react'

/**
 * 작가 페이지 공유.
 *
 * 모바일은 시스템 공유 시트를 쓰고, 그것이 없거나 취소되면 링크를 복사한다.
 * 복사 결과는 버튼 문구로만 알린다 — 토스트를 띄울 만큼의 일이 아니다.
 */
export function ProfileShareButton({
  title,
}: {
  readonly title: string
}): ReactNode {
  const [state, setState] = useState<'IDLE' | 'COPIED' | 'FAILED'>('IDLE')
  const copied = state === 'COPIED'

  const share = async (): Promise<void> => {
    const url = window.location.href
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
        return
      } catch (error: unknown) {
        // 사용자가 시트를 닫은 것은 실패가 아니다.
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setState('COPIED')
    } catch {
      // 클립보드 권한이 없는 브라우저다. 주소창에서 직접 복사하도록 알린다.
      setState('FAILED')
    }
    window.setTimeout(() => {
      setState('IDLE')
    }, 2000)
  }

  return (
    <button
      type="button"
      className="cp-icon-action"
      aria-label={copied ? '링크를 복사했습니다' : '작가 페이지 공유'}
      onClick={() => void share()}
    >
      {copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
      <span>
        {copied ? '복사됨' : state === 'FAILED' ? '주소창에서 복사' : '공유'}
      </span>
    </button>
  )
}
