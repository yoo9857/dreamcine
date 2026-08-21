'use client'

import * as RadixToast from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { cn } from '../lib/cn.js'
import { Button } from './Button.js'
import { IconButton } from './IconButton.js'

export type ToastTone = 'neutral' | 'success' | 'danger'

export interface ToastMessage {
  id: string
  title: string
  description?: string
  tone?: ToastTone
  /** 다음 행동을 제시한다. (08_UIUX_SPEC.md §10) */
  action?: { label: string; onAction: () => void }
}

export interface ToastProviderProps {
  children: ReactNode
}

export interface ToastApi {
  show: (message: Omit<ToastMessage, 'id'>) => void
  dismiss: (id: string) => void
}

const TONE: Readonly<Record<ToastTone, string>> = {
  neutral: 'border-border',
  success: 'border-success',
  danger: 'border-danger',
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: ToastProviderProps): ReactNode {
  const [messages, setMessages] = useState<readonly ToastMessage[]>([])

  const dismiss = useCallback((id: string) => {
    setMessages((current) => current.filter((message) => message.id !== id))
  }, [])

  const show = useCallback((message: Omit<ToastMessage, 'id'>) => {
    setMessages((current) => [
      ...current,
      // crypto.randomUUID 는 안전한 컨텍스트에서만 있다. 목록 키 용도이므로
      // 충돌만 피하면 되고, 시각 + 길이로 충분하다.
      { ...message, id: `${String(Date.now())}-${String(current.length)}` },
    ])
  }, [])

  const api = useMemo<ToastApi>(() => ({ show, dismiss }), [show, dismiss])

  return (
    <ToastContext.Provider value={api}>
      <RadixToast.Provider swipeDirection="right" duration={6000}>
        {children}
        {messages.map((message) => (
          <RadixToast.Root
            key={message.id}
            onOpenChange={(open) => {
              if (!open) {
                dismiss(message.id)
              }
            }}
            className={cn(
              'flex items-start gap-3 rounded-md border bg-bg-elevated p-4',
              TONE[message.tone ?? 'neutral'],
            )}
          >
            <div className="flex flex-col gap-1">
              <RadixToast.Title className="text-sm font-semibold text-fg">
                {message.title}
              </RadixToast.Title>
              {message.description === undefined ? null : (
                <RadixToast.Description className="text-sm text-fg-secondary">
                  {message.description}
                </RadixToast.Description>
              )}
            </div>
            {message.action === undefined ? null : (
              <RadixToast.Action altText={message.action.label} asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={message.action.onAction}
                >
                  {message.action.label}
                </Button>
              </RadixToast.Action>
            )}
            <RadixToast.Close asChild>
              <IconButton
                label="알림 닫기"
                size="sm"
                icon={<X aria-hidden="true" className="size-4" />}
              />
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-0 right-0 z-50 flex w-full max-w-sm flex-col gap-2 p-4" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (api === null) {
    throw new Error('useToast 는 ToastProvider 안에서만 쓸 수 있습니다')
  }
  return api
}
