'use client'

import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

/** 상태 4종: 대기 / 전송중 / 오류(필드별) / 성공(인증메일 안내). */
export function SignupForm(): ReactNode {
  throw new NotImplementedError('T03:authPages')
}
