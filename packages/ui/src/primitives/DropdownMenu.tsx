'use client'

import * as RadixMenu from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn.js'

export interface DropdownMenuItem {
  id: string
  label: string
  icon?: ReactNode
  onSelect?: () => void
  disabled?: boolean
  destructive?: boolean
}

export interface DropdownMenuProps {
  trigger: ReactNode
  items: readonly DropdownMenuItem[]
  align?: 'start' | 'center' | 'end'
  className?: string
}

export function DropdownMenu({
  trigger,
  items,
  align = 'end',
  className,
}: DropdownMenuProps): ReactNode {
  return (
    <RadixMenu.Root>
      <RadixMenu.Trigger asChild>{trigger}</RadixMenu.Trigger>
      <RadixMenu.Portal>
        <RadixMenu.Content
          align={align}
          sideOffset={4}
          className={cn(
            'z-50 min-w-40 overflow-hidden rounded-md border border-border bg-bg-elevated p-1',
            className,
          )}
        >
          {items.map((item) => (
            <RadixMenu.Item
              key={item.id}
              {...(item.disabled === undefined
                ? {}
                : { disabled: item.disabled })}
              {...(item.onSelect === undefined
                ? {}
                : { onSelect: item.onSelect })}
              className={cn(
                'flex cursor-default items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none data-[disabled]:opacity-60 data-[highlighted]:bg-accent-subtle',
                item.destructive === true ? 'text-danger' : 'text-fg',
              )}
            >
              {item.icon}
              {item.label}
            </RadixMenu.Item>
          ))}
        </RadixMenu.Content>
      </RadixMenu.Portal>
    </RadixMenu.Root>
  )
}
