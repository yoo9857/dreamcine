'use client'

import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

/** 상태 4종: 대기 / 전송중 / 오류 / 성공. (08_UIUX_SPEC.md §3) */
export function LoginForm(): ReactNode {
  throw new NotImplementedError('T03:authPages')
}
