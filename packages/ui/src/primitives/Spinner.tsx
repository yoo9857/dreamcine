import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  /** 스크린리더용 진행 안내. 기본값은 '불러오는 중'. */
  label?: string
  className?: string
}

export function Spinner(_props: SpinnerProps): ReactNode {
  throw new NotImplementedError('T14:spinner')
}
