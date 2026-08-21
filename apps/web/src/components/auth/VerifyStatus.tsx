'use client'

import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

/** 상태 4종: 확인중 / 성공 / 만료(재발송) / 오류. */
export function VerifyStatus(): ReactNode {
  throw new NotImplementedError('T03:authPages')
}
