'use client'

import { NotImplementedError } from '@aidream/core'
import type { Theme } from '@aidream/ui'
import type { ReactNode } from 'react'

export interface ThemeToggleProps {
  current: Theme
}

/**
 * 쿠키를 바꾸고 서버 렌더를 다시 받는다. 인라인 스크립트를 쓰지 않으므로
 * CSP 를 지키면서도 깜빡임이 없다. (OBS-005)
 */
export function ThemeToggle(_props: ThemeToggleProps): ReactNode {
  throw new NotImplementedError('T14:theme')
}
