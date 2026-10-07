import { z } from 'zod'

import {
  HELP_CONFIDENT_SCORE,
  HELP_FALLBACK_ANSWER,
  HELP_SUPPORT_MAILTO,
  HELP_WEAK_SCORE,
  matchHelpEntry,
  type HelpEntry,
} from '@/src/content/help-qa'
import { getLogger } from '@/src/lib/logger'

/** 문서의 현재 대화 모델. https://docs.x.ai/developers/models */
export const HELP_MODEL = 'grok-4.7'

const HELP_ENDPOINT = 'https://api.x.ai/v1/responses'
const MODEL_TIMEOUT_MS = 20_000
const MAX_ANSWER_CHARS = 700

export const HelpChatSchema = z.object({
  message: z.string().trim().min(1).max(500),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(800),
      }),
    )
    .max(6)
    .optional(),
})

export type HelpChatInput = z.infer<typeof HelpChatSchema>

export interface HelpAnswer {
  readonly answer: string
  readonly href: string | null
  readonly linkLabel: string | null
  readonly source: 'guide' | 'model' | 'catalog'
  readonly links?: readonly { readonly href: string; readonly label: string }[]
}

export interface HelpAnswerOptions {
  readonly fetchImpl?: typeof fetch
  /** 테스트가 환경 변수를 덮어쓴다. null 이면 모델을 부르지 않는다. */
  readonly apiKey?: string | null
}

function fallback(): HelpAnswer {
  return {
    answer: HELP_FALLBACK_ANSWER,
    href: HELP_SUPPORT_MAILTO,
    linkLabel: '고객센터 메일',
    source: 'guide',
  }
}

function fromEntry(entry: HelpEntry): HelpAnswer {
  return {
    answer: entry.answer,
    href: entry.href,
    linkLabel: entry.linkLabel,
    source: 'guide',
  }
}

function readApiKey(override: string | null | undefined): string | null {
  if (override !== undefined) {
    if (override === null || override.trim() === '') return null
    return override.trim()
  }
  const env = process.env.XAI_API_KEY
  if (env === undefined || env.trim() === '') return null
  return env.trim()
}

function readModelText(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null
  const record = payload as Record<string, unknown>
  if (
    typeof record.output_text === 'string' &&
    record.output_text.trim() !== ''
  ) {
    return record.output_text.trim()
  }
  if (!Array.isArray(record.output)) return null
  const parts: string[] = []
  for (const item of record.output) {
    if (typeof item !== 'object' || item === null) continue
    const message = item as Record<string, unknown>
    if (message.type !== 'message' || !Array.isArray(message.content)) continue
    for (const block of message.content) {
      if (typeof block !== 'object' || block === null) continue
      const text = (block as Record<string, unknown>).text
      if (typeof text === 'string' && text.trim() !== '')
        parts.push(text.trim())
    }
  }
  if (parts.length === 0) return null
  return parts.join('\n')
}

function cleanAnswer(text: string): string {
  const cleaned = text.split('\u0000').join('').trim()
  if (cleaned.length <= MAX_ANSWER_CHARS) return cleaned
  return `${cleaned.slice(0, MAX_ANSWER_CHARS).trim()}…`
}

async function askModel(
  entry: HelpEntry,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const response = await fetchImpl(HELP_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: HELP_MODEL,
      store: false,
      max_output_tokens: 800,
      reasoning: { effort: 'low' },
      input: [
        {
          role: 'system',
          content: [
            '너는 ilog 안내 담당이다. 아래 안내문만 근거로 한국어로 두세 문장 답한다.',
            '안내문에 없는 가격, 조회수, 팔로워 수, 정책, 날짜는 만들지 않는다.',
            `안내문으로 답할 수 없으면 이 문장만 보낸다: ${HELP_FALLBACK_ANSWER}`,
            '마크다운 제목은 쓰지 않는다.',
            '',
            entry.answer,
          ].join('\n'),
        },
        // Only public canonical text goes to the provider, never visitor messages.
        { role: 'user', content: entry.title },
      ],
    }),
    signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
  })
  if (!response.ok) {
    getLogger().warn({ status: response.status }, 'help model request failed')
    return null
  }
  const text = readModelText((await response.json()) as unknown)
  return text === null ? null : cleanAnswer(text)
}

/** 안내문에 없는 조회수·팔로워 수를 모델이 만들면 그 답은 쓰지 않는다. */
function modelStrays(text: string, entry: HelpEntry): boolean {
  const facts =
    text.match(
      /\d[\d,.]*|https?:\/\/\S+|[\w.+-]+@[\w.-]+|\/[a-z][a-z0-9/-]*/gi,
    ) ?? []
  if (facts.some((fact) => !entry.answer.includes(fact) && fact !== entry.href))
    return true
  const inventedCount = /조회수|팔로워/
  return inventedCount.test(text) && !inventedCount.test(entry.answer)
}

/**
 * 확실한 안내는 그대로 돌려준다.
 * 점수가 약하고 XAI_API_KEY 가 있을 때만 grok-4.7에 안내문을 넘긴다.
 * 키가 없거나 호출이 실패하면 안내문이나 고객센터 문장으로 돌아온다.
 */
export async function answerHelpQuestion(
  input: HelpChatInput,
  options: HelpAnswerOptions = {},
): Promise<HelpAnswer> {
  const match = matchHelpEntry(input.message)
  if (match.entry !== null && match.score >= HELP_CONFIDENT_SCORE) {
    return fromEntry(match.entry)
  }

  const apiKey = readApiKey(options.apiKey)
  if (
    apiKey !== null &&
    match.score >= HELP_WEAK_SCORE &&
    match.entry !== null
  ) {
    try {
      const text = await askModel(
        match.entry,
        apiKey,
        options.fetchImpl ?? fetch,
      )
      if (text !== null && !modelStrays(text, match.entry)) {
        return {
          answer: text,
          href: match.entry.href,
          linkLabel: match.entry.linkLabel,
          source: 'model',
        }
      }
    } catch (error: unknown) {
      getLogger().warn(
        { reason: error instanceof Error ? error.name : 'unknown' },
        'help model request failed',
      )
    }
  }

  if (match.entry !== null && match.score >= HELP_WEAK_SCORE) {
    return fromEntry(match.entry)
  }
  return fallback()
}
