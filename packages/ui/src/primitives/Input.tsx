import { NotImplementedError } from '@aidream/core'
import type { InputHTMLAttributes, ReactNode } from 'react'

/**
 * 라벨·설명·오류를 프리미티브가 직접 묶는다. 화면마다 `aria-describedby` 를
 * 다시 배선하면 반드시 빠지는 곳이 생긴다.
 */
export interface FieldProps {
  label: string
  /** 라벨을 시각적으로 숨긴다. 접근성 이름은 유지된다. */
  hideLabel?: boolean
  hint?: string
  error?: string
}

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    FieldProps {
  size?: 'sm' | 'md' | 'lg'
}

export function Input(_props: InputProps): ReactNode {
  throw new NotImplementedError('T14:input')
}
