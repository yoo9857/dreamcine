'use client'

import * as RadixTooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

export interface TooltipProps {
  content: string
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}

/**
 * 툴팁은 **보조 설명 전용**이다. 여기에만 있는 정보는 키보드·터치 사용자가
 * 놓친다. 필수 정보는 `aria-label` 이나 본문에 둔다. (10_NFR.md §10)
 */
export function Tooltip({
  content,
  children,
  side = 'top',
}: TooltipProps): ReactNode {
  return (
    <RadixTooltip.Provider delayDuration={300}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={6}
            className="z-50 rounded-md border border-border bg-bg-overlay px-2 py-1 text-xs text-fg"
          >
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}
