import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

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

export function Tabs(_props: TabsProps): ReactNode {
  throw new NotImplementedError('T14:tabs')
}
