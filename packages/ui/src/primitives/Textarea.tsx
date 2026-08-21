import { NotImplementedError } from '@aidream/core'
import type { ReactNode, TextareaHTMLAttributes } from 'react'

import type { FieldProps } from './Input.js'

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    FieldProps {
  /** 남은 글자 수를 보여준다. `maxLength` 와 함께 쓴다. */
  showCount?: boolean
}

export function Textarea(_props: TextareaProps): ReactNode {
  throw new NotImplementedError('T14:textarea')
}
