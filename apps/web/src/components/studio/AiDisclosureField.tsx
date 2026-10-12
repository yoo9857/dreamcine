'use client'

import { Textarea } from '@aidream/ui'
import React, { useId, useState, type ReactNode } from 'react'

const AI_TOOLS = [
  'ChatGPT',
  'Claude',
  'Gemini',
  'Midjourney',
  'Seedance',
  'Higgsfield',
  'Runway',
  'Pika',
  'Kling',
  'ElevenLabs',
  'Suno',
] as const
const TOOLS_PREFIX = '사용 도구: '
const DETAILS_SEPARATOR = '\n제작 설명: '

function readDisclosure(value: string): { tools: string[]; details: string } {
  if (!value.startsWith(TOOLS_PREFIX)) return { tools: [], details: value }
  const [header = '', ...lines] = value.split('\n')
  const tools = header.slice(TOOLS_PREFIX.length).split(', ').filter(Boolean)
  // 기존 자유 서술에 같은 문구가 있더라도 알 수 없는 내용은 그대로 보존한다.
  if (!tools.every((tool) => AI_TOOLS.some((known) => known === tool)))
    return { tools: [], details: value }
  const remainder = lines.join('\n')
  return {
    tools,
    details: remainder.startsWith('제작 설명: ')
      ? remainder.slice('제작 설명: '.length)
      : remainder,
  }
}

function formatDisclosure(tools: readonly string[], details: string): string {
  if (tools.length === 0) return details
  const header = TOOLS_PREFIX + tools.join(', ')
  return details === '' ? header : header + DETAILS_SEPARATOR + details
}

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
  const { tools, details } = readDisclosure(value)
  const hintId = useId()
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const overhead =
    tools.length === 0
      ? 0
      : (TOOLS_PREFIX + tools.join(', ') + DETAILS_SEPARATOR).length
  const update = (nextTools: readonly string[], nextDetails: string): void => {
    const next = formatDisclosure(nextTools, nextDetails)
    if (next.length > 500) {
      setSelectionError(
        '제작 표기는 도구명을 포함해 500자까지입니다. 설명을 줄인 뒤 도구를 선택해 주세요.',
      )
      return
    }
    setSelectionError(null)
    onChange(next)
  }
  return (
    <div className="studio-ai-disclosure">
      <fieldset className="studio-ai-tools" aria-describedby={hintId}>
        <legend>
          사용한 AI 도구 <span>여러 개 선택 가능</span>
        </legend>
        <div className="studio-ai-tool-options">
          {AI_TOOLS.map((tool) => (
            <button
              key={tool}
              type="button"
              aria-pressed={tools.includes(tool)}
              onClick={() => {
                update(
                  tools.includes(tool)
                    ? tools.filter((selected) => selected !== tool)
                    : [...tools, tool],
                  details,
                )
              }}
            >
              {tool}
            </button>
          ))}
        </div>
        <p id={hintId}>
          실제로 사용한 도구를 선택하거나 아래에 직접 입력하세요.
        </p>
      </fieldset>
      <input type="hidden" name="aiDisclosure" value={value} />
      <Textarea
        label="AI 제작 표기"
        name="aiDisclosureDetails"
        required={tools.length === 0}
        rows={2}
        maxLength={Math.max(0, 500 - overhead)}
        value={details}
        placeholder="그 외 AI 도구나 제작 설명을 입력하세요"
        onChange={(event) => {
          update(tools, event.target.value)
        }}
        hint={
          tools.length === 0
            ? '도구 선택 또는 직접 입력 중 하나는 필요합니다.'
            : '도구 선택 완료 · 추가 설명은 선택 사항입니다.'
        }
        {...(error === undefined ? {} : { error })}
      />
      {selectionError === null ? null : (
        <p role="alert" className="studio-registration-error">
          {selectionError}
        </p>
      )}
    </div>
  )
}
