import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

export interface AvatarProps {
  /** 표시 이름. 이미지가 없으면 이니셜 폴백에 쓰인다. */
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar(_props: AvatarProps): ReactNode {
  throw new NotImplementedError('T14:avatar')
}
