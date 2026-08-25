'use client'

import { Textarea } from '@aidream/ui'
import React, { type ReactNode } from 'react'

export interface AiDisclosureFieldProps {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly error?: string
}

export function AiDisclosureField({
  value,
  onChange,
  error,
}: AiDisclosureFieldProps): ReactNode {
  return (
    <Textarea
      label="AI 제작 표기"
      name="aiDisclosure"
      required
      maxLength={500}
      value={value}
      onChange={(event) => {
        onChange(event.target.value)
      }}
      hint="사용한 AI 도구와 제작 범위를 시청자가 이해할 수 있게 적어 주세요. 공개하려면 반드시 필요합니다."
      {...(error === undefined ? {} : { error })}
    />
  )
}
