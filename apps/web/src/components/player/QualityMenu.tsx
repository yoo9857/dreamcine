'use client'

import { MonitorUp } from 'lucide-react'
import React, { type ReactNode } from 'react'
import type { PlayerLevel } from '@/src/hooks/use-player'

export interface QualityMenuProps {
  readonly levels: readonly PlayerLevel[]
  readonly currentLevel: number
  readonly onChange: (level: number) => void
}

export function QualityMenu(props: QualityMenuProps): ReactNode {
  return (
    <label className="ilog-player-quality">
      <span>
        <MonitorUp /> 화질
      </span>
      <select
        aria-label="화질"
        value={props.currentLevel}
        onChange={(event) => {
          props.onChange(Number(event.target.value))
        }}
      >
        <option value={-1}>자동</option>
        {props.levels.map((level) => (
          <option key={level.index} value={level.index}>
            {level.height}p
          </option>
        ))}
      </select>
    </label>
  )
}
