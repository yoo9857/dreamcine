import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

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

export function ToastProvider(_props: ToastProviderProps): ReactNode {
  throw new NotImplementedError('T14:toast')
}

export interface ToastApi {
  show: (message: Omit<ToastMessage, 'id'>) => void
  dismiss: (id: string) => void
}

export function useToast(): ToastApi {
  throw new NotImplementedError('T14:toast')
}
