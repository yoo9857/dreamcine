'use client'

import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn.js'
import { DIALOG_OVERLAY } from './Dialog.js'
import { IconButton } from './IconButton.js'

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  hideTitle?: boolean
  description?: string
  side?: 'left' | 'right' | 'bottom'
  children?: ReactNode
  className?: string
}

/** Sheet 는 Dialog 와 같은 접근성 계약을 쓰고 배치만 다르다. */
const SIDE = {
  left: 'inset-y-0 left-0 h-full w-80 border-r',
  right: 'inset-y-0 right-0 h-full w-80 border-l',
  bottom: 'inset-x-0 bottom-0 max-h-[80dvh] w-full border-t',
} as const

export function Sheet({
  open,
  onOpenChange,
  title,
  hideTitle = false,
  description,
  side = 'right',
  children,
  className,
}: SheetProps): ReactNode {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={DIALOG_OVERLAY} />
        <RadixDialog.Content
          className={cn(
            'fixed z-50 overflow-y-auto border-border bg-bg-elevated p-6',
            SIDE[side],
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <RadixDialog.Title
                className={cn(
                  'text-base font-semibold text-fg',
                  hideTitle && 'sr-only',
                )}
              >
                {title}
              </RadixDialog.Title>
              {description === undefined ? null : (
                <RadixDialog.Description className="text-sm text-fg-secondary">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <IconButton
                label="닫기"
                size="sm"
                icon={<X aria-hidden="true" className="size-4" />}
              />
            </RadixDialog.Close>
          </div>
          {children === undefined ? null : (
            <div className="mt-4">{children}</div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
