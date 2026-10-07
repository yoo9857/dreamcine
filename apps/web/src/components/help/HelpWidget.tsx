'use client'

import { useState, type ComponentType, type ReactNode } from 'react'

import '@/src/styles/help-chat.css'

/** Load the conversation and knowledge base only after the visitor opens it. */
export function HelpWidget(): ReactNode {
  const [Panel, setPanel] = useState<ComponentType<{
    readonly initialOpen?: boolean
  }> | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  async function open(): Promise<void> {
    if (loading) return
    setLoading(true)
    setFailed(false)
    try {
      const module = await import('./HelpChat')
      setPanel(() => module.HelpChat)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  if (Panel !== null) return <Panel initialOpen />
  return (
    <div className="help-chat" data-help-chat="">
      {failed ? (
        <p role="status">
          불러오지 못했어요. 캐릭터를 눌러 다시 시도해 주세요.
        </p>
      ) : null}
      <button
        type="button"
        className="help-chat-launcher"
        aria-label="고객 상담"
        aria-expanded="false"
        aria-busy={loading}
        disabled={loading}
        onClick={() => {
          void open()
        }}
      >
        <span className="help-chat-launcher-face">
          <img src="/brand/help-mascot.png" alt="" width={72} height={72} />
        </span>
      </button>
    </div>
  )
}
