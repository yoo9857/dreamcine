'use client'

import { useEffect, useRef } from 'react'

/**
 * 탭이 보일 때만 도는 주기 호출. (ISS-023 — 상시 연결 대신 짧은 주기 갱신)
 *
 * 숨겨진 탭은 묻지 않는다. 다시 보이면 기다리지 않고 바로 한 번 묻는다 —
 * 돌아온 사람이 다음 주기까지 옛 화면을 보지 않게 한다. 앞 호출이 끝나기
 * 전에는 다음 호출을 겹쳐 보내지 않는다.
 */
export function usePolling(
  task: () => Promise<void>,
  intervalMs: number,
  enabled = true,
): void {
  const taskRef = useRef(task)
  taskRef.current = task

  useEffect(() => {
    if (!enabled) return undefined
    let running = false
    let timer: number | undefined

    const tick = async (): Promise<void> => {
      if (running || document.visibilityState !== 'visible') return
      running = true
      try {
        await taskRef.current()
      } finally {
        running = false
      }
    }
    const start = (): void => {
      window.clearInterval(timer)
      timer = window.setInterval(() => void tick(), intervalMs)
    }
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        void tick()
        start()
      } else {
        window.clearInterval(timer)
      }
    }

    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, intervalMs])
}
