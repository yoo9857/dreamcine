import { NotImplementedError } from '@aidream/core'
import type { HTMLAttributes, ReactNode } from 'react'

import type { SpaceKey } from '../tokens/index.js'

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column'
  gap?: SpaceKey
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between'
  wrap?: boolean
}

export function Stack(_props: StackProps): ReactNode {
  throw new NotImplementedError('T14:layout')
}
