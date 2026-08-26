'use client'

import type { Theme } from '@aidream/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition, type ReactNode } from 'react'

import { themeCookie } from '@/src/lib/theme'

export function ShowcaseThemeToggle({
  current,
  className,
}: {
  readonly current: Theme
  readonly className: string
}): ReactNode {
  const router = useRouter()
  const [theme, setTheme] = useState(current)
  const [animating, setAnimating] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const explicit = document.documentElement.dataset.theme
    if (explicit === 'dark' || explicit === 'light') {
      setTheme(explicit)
      return
    }
    setTheme(
      window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark',
    )
  }, [current])

  const next: Theme = theme === 'dark' ? 'light' : 'dark'

  function refresh(): void {
    startTransition(() => {
      router.refresh()
    })
  }

  function apply(nextTheme: Theme): void {
    document.documentElement.dataset.theme = nextTheme
    setTheme(nextTheme)
  }

  return (
    <button
      type="button"
      className={`${className} is-${theme}`}
      aria-label={`${next === 'dark' ? '다크' : '화이트'} 모드로 전환`}
      aria-pressed={theme === 'dark'}
      disabled={pending || animating}
      onClick={(event) => {
        document.cookie = themeCookie(next)
        const reduceMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches
        const startViewTransition = (
          document as unknown as {
            readonly startViewTransition?: (
              update: () => void,
            ) => ViewTransition
          }
        ).startViewTransition
        if (startViewTransition === undefined || reduceMotion) {
          apply(next)
          refresh()
          return
        }

        setAnimating(true)
        const bounds = event.currentTarget.getBoundingClientRect()
        document.documentElement.style.setProperty(
          '--theme-origin-x',
          `${String(bounds.left + bounds.width / 2)}px`,
        )
        document.documentElement.style.setProperty(
          '--theme-origin-y',
          `${String(bounds.top + bounds.height / 2)}px`,
        )
        document.documentElement.dataset.themeTransition = next
        const transition = startViewTransition.call(document, () => {
          apply(next)
        })
        void transition.finished.finally(() => {
          delete document.documentElement.dataset.themeTransition
          document.documentElement.style.removeProperty('--theme-origin-x')
          document.documentElement.style.removeProperty('--theme-origin-y')
          setAnimating(false)
          refresh()
        })
      }}
    >
      <span aria-hidden="true" />
    </button>
  )
}
