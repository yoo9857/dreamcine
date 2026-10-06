'use client'

import { LIMITS, UnreadMessageCountSchema } from '@aidream/core'
import { useEffect, useSyncExternalStore } from 'react'

/**
 * 읽지 않은 메시지 수. 레일과 모바일 메뉴가 같은 값을 쓰도록 모듈 하나가
 * 한 번만 묻는다. 대화 화면이 읽음 처리를 하면 `refreshUnreadMessages()` 로
 * 배지를 곧바로 맞춘다.
 */
let count = 0
let subscribers = 0
let timer: number | undefined
const listeners = new Set<() => void>()

function emit(next: number): void {
  if (next === count) return
  count = next
  for (const listener of listeners) listener()
}

export async function refreshUnreadMessages(): Promise<void> {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible')
    return
  try {
    const response = await fetch('/api/messages/unread', {
      cache: 'no-store',
      credentials: 'same-origin',
    })
    if (!response.ok) return
    const parsed = UnreadMessageCountSchema.safeParse(await response.json())
    if (parsed.success) emit(parsed.data.count)
  } catch {
    // 배지는 보조 정보다. 네트워크가 끊기면 마지막 값을 둔다.
    emit(count)
  }
}

function onVisibility(): void {
  if (document.visibilityState === 'visible') void refreshUnreadMessages()
}

function startPolling(): void {
  void refreshUnreadMessages()
  timer = window.setInterval(
    () => void refreshUnreadMessages(),
    LIMITS.DM_UNREAD_POLL_SEC * 1000,
  )
  document.addEventListener('visibilitychange', onVisibility)
}

function stopPolling(): void {
  window.clearInterval(timer)
  timer = undefined
  document.removeEventListener('visibilitychange', onVisibility)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useUnreadMessageCount(enabled: boolean): number {
  useEffect(() => {
    if (!enabled) return undefined
    subscribers += 1
    if (subscribers === 1) startPolling()
    return () => {
      subscribers -= 1
      if (subscribers === 0) stopPolling()
    }
  }, [enabled])
  const value = useSyncExternalStore(
    subscribe,
    () => count,
    () => 0,
  )
  return enabled ? value : 0
}
