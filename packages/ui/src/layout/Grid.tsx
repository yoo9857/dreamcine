import { NotImplementedError } from '@aidream/core'
import type { HTMLAttributes, ReactNode } from 'react'

import type { SpaceKey } from '../tokens/index.js'

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /** 08_UIUX_SPEC.md §2 의 브레이크포인트별 열 수를 그대로 따른다. */
  variant?: 'feed' | 'pair'
  gap?: SpaceKey
}

export function Grid(_props: GridProps): ReactNode {
  throw new NotImplementedError('T14:layout')
}
