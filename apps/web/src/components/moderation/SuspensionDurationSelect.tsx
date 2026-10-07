'use client'

import { Select } from '@aidream/ui'
import React from 'react'

export function SuspensionDurationSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Select
      label="정지 기간"
      value={value}
      onValueChange={onChange}
      options={[
        { value: '1', label: '24시간' },
        { value: '3', label: '3일' },
        { value: '7', label: '7일' },
        { value: '15', label: '15일' },
        { value: 'permanent', label: '영구 정지' },
      ]}
    />
  )
}
