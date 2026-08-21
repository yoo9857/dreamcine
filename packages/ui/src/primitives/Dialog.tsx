'use client'

import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn.js'
import { IconButton } from './IconButton.js'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 접근성 이름. 시각적으로 숨기려면 `hideTitle` 을 쓴다. */
  title: string
  hideTitle?: boolean
  description?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

export const DIALOG_OVERLAY = 'fixed inset-0 bg-bg/80'

export function Dialog({
  open,
  onOpenChange,
  title,
  hideTitle = false,
  description,
  children,
  footer,
  className,
}: DialogProps): ReactNode {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={DIALOG_OVERLAY} />
        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-bg-elevated p-6',
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
          {footer === undefined ? null : (
            <div className="mt-6 flex justify-end gap-2">{footer}</div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
