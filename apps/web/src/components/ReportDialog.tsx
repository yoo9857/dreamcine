'use client'

import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

export interface ReportDialogProps {
  target: 'EPISODE' | 'SERIES' | 'COMMENT' | 'USER'
  targetId: string
  trigger: ReactNode
}

export function ReportDialog(_props: ReportDialogProps): ReactNode {
  throw new NotImplementedError('T12:reportDialog')
}
