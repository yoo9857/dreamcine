'use client'

import * as RadixTabs from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn.js'

export interface TabItem {
  value: string
  label: string
  content: ReactNode
  disabled?: boolean
}

export interface TabsProps {
  items: readonly TabItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** 탭 목록의 접근성 이름. */
  label: string
  className?: string
}

export function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  label,
  className,
}: TabsProps): ReactNode {
  const fallbackValue = defaultValue ?? items[0]?.value

  return (
    <RadixTabs.Root
      {...(value === undefined ? {} : { value })}
      {...(fallbackValue === undefined ? {} : { defaultValue: fallbackValue })}
      {...(onValueChange === undefined ? {} : { onValueChange })}
      className={cn('flex flex-col gap-4', className)}
    >
      <RadixTabs.List
        aria-label={label}
        className="flex items-center gap-1 border-b border-border-subtle"
      >
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            {...(item.disabled === undefined
              ? {}
              : { disabled: item.disabled })}
            className={cn(
              '-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-fg-secondary',
              'data-[state=active]:border-accent data-[state=active]:text-fg',
              'disabled:opacity-60',
            )}
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map((item) => (
        <RadixTabs.Content key={item.value} value={item.value}>
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  )
}
