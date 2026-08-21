'use client'

import { IconButton, type Theme } from '@aidream/ui'
import { Moon, Sun } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition, type ReactNode } from 'react'

import { messages } from '@/src/lib/messages'
import { themeCookie } from '@/src/lib/theme'

export interface ThemeToggleProps {
  current: Theme
}

/**
 * 쿠키를 바꾸고 서버 렌더를 다시 받는다. 인라인 스크립트를 쓰지 않으므로
 * CSP 를 지키면서도 깜빡임이 없다. (OBS-005)
 */
export function ThemeToggle({ current }: ThemeToggleProps): ReactNode {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const text = messages().theme
  const next: Theme = current === 'dark' ? 'light' : 'dark'

  return (
    <IconButton
      label={next === 'light' ? text.light : text.dark}
      disabled={pending}
      icon={
        current === 'dark' ? (
          <Sun aria-hidden="true" className="size-4" />
        ) : (
          <Moon aria-hidden="true" className="size-4" />
        )
      }
      onClick={() => {
        document.cookie = themeCookie(next)
        startTransition(() => {
          router.refresh()
        })
      }}
    />
  )
}
