import { NotImplementedError } from '@aidream/core'
import type { HTMLAttributes, ReactNode } from 'react'

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'narrow' | 'default' | 'wide'
  padded?: boolean
}

export function Container(_props: ContainerProps): ReactNode {
  throw new NotImplementedError('T14:layout')
}
